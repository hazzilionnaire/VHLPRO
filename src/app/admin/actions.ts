"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { runAction, type ActionState } from "@/lib/action-guard";
import { requireRole } from "@/lib/auth";
import { leagueLocalToUtcIso } from "@/lib/datetime";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Game, GameStatus, PlayerPosition, RsvpWithPlayer, Team } from "@/lib/types";

export type { ActionState };

type DbError = { message: string; code?: string } | null;

/**
 * Carry the database's own words through to the screen. A house-style message
 * alone ("Could not save") leaves whoever hits it with nothing to act on and
 * nothing to quote.
 */
function fail(what: string, error: DbError): ActionState {
  return {
    ok: false,
    message: error?.message ? `${what}: ${error.message}` : what,
  };
}

function refreshGame(gameId: string, token?: string) {
  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/standings");
  revalidatePath("/stats");
  revalidatePath(`/admin/games/${gameId}`);
  if (token) revalidatePath(`/rsvp/${token}`);
}

/* -------------------------------------------------------------- games --- */

export async function createGame(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(["admin"]);

    const startsAtLocal = String(formData.get("startsAt") ?? "");
    const location = String(formData.get("location") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const closesAtLocal = String(formData.get("rsvpClosesAt") ?? "");

    if (!startsAtLocal) return { ok: false, message: "Pick a date and time." };

    const db = supabaseAdmin();
    const { data: season, error: seasonError } = await db
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .maybeSingle<{ id: string }>();

    if (seasonError) return fail("Could not look up the season", seasonError);
    if (!season) {
      return { ok: false, message: "There's no active season to add this game to." };
    }

    const { data, error } = await db
      .from("games")
      .insert({
        season_id: season.id,
        starts_at: leagueLocalToUtcIso(startsAtLocal),
        rsvp_closes_at: closesAtLocal ? leagueLocalToUtcIso(closesAtLocal) : null,
        location: location || null,
        notes: notes || null,
      })
      .select("id")
      .single<Pick<Game, "id">>();

    if (error || !data) return fail("Could not create the game", error);

    refreshGame(data.id);
    redirect(`/admin/games/${data.id}`);
  });
}

export async function updateGame(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(["admin"]);

    const gameId = String(formData.get("gameId") ?? "");
    const startsAtLocal = String(formData.get("startsAt") ?? "");
    const closesAtLocal = String(formData.get("rsvpClosesAt") ?? "");
    const location = String(formData.get("location") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    const status = String(formData.get("status") ?? "scheduled") as GameStatus;

    if (!gameId || !startsAtLocal) return { ok: false, message: "Missing game details." };

    const { data, error } = await supabaseAdmin()
      .from("games")
      .update({
        starts_at: leagueLocalToUtcIso(startsAtLocal),
        rsvp_closes_at: closesAtLocal ? leagueLocalToUtcIso(closesAtLocal) : null,
        location: location || null,
        notes: notes || null,
        status,
      })
      .eq("id", gameId)
      .select("rsvp_token")
      .single<Pick<Game, "rsvp_token">>();

    if (error) return fail("Could not save the game", error);

    refreshGame(gameId, data?.rsvp_token);
    return { ok: true, message: "Game saved." };
  });
}

/* --------------------------------------------------------- allocation --- */

/** Bulk-save the Blue/White split an admin set on the roster screen. */
export async function saveTeamAssignments(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(["admin"]);

    const gameId = String(formData.get("gameId") ?? "");
    if (!gameId) return { ok: false, message: "Missing game." };

    const updates: { id: string; teamId: string | null }[] = [];
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("team_")) continue;
      updates.push({ id: key.slice("team_".length), teamId: String(value) || null });
    }

    const db = supabaseAdmin();
    const results = await Promise.all(
      updates.map((update) =>
        db
          .from("rsvps")
          .update({ team_id: update.teamId })
          .eq("id", update.id)
          .eq("game_id", gameId),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed) return fail("Some assignments did not save", failed.error);

    const { data: game } = await db
      .from("games")
      .select("rsvp_token")
      .eq("id", gameId)
      .maybeSingle<Pick<Game, "rsvp_token">>();

    refreshGame(gameId, game?.rsvp_token);
    return { ok: true, message: `Teams saved for ${updates.length} players.` };
  });
}

/**
 * Even up the sides for one night. Players keep the team they belong to; only
 * those without one are dealt out, goalies first and always to the thinner
 * bench. The admin still has the last word on the roster screen.
 */
export async function autoSplitTeams(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(["admin"]);

    const gameId = String(formData.get("gameId") ?? "");
    if (!gameId) return { ok: false, message: "Missing game." };

    const db = supabaseAdmin();

    const [{ data: teams, error: teamsError }, { data: rsvps, error: rsvpError }] =
      await Promise.all([
        db.from("teams").select("*").order("sort_order").returns<Team[]>(),
        db
          .from("rsvps")
          .select("*, player:players(*)")
          .eq("game_id", gameId)
          .eq("status", "in")
          .returns<RsvpWithPlayer[]>(),
      ]);

    if (teamsError) return fail("Could not read the teams", teamsError);
    if (rsvpError) return fail("Could not read the RSVPs", rsvpError);

    if (!teams || teams.length < 2) return { ok: false, message: "Need two teams to split." };
    if (!rsvps || rsvps.length === 0) return { ok: false, message: "Nobody has said they're in." };

    const assignments: { id: string; teamId: string }[] = [];
    const sizes = new Map(teams.map((team) => [team.id, 0]));
    const undecided: RsvpWithPlayer[] = [];

    // A player's own side comes first — this evens out who's left over, it
    // doesn't reshuffle the league.
    for (const rsvp of rsvps) {
      const side = rsvp.player.default_team_id;
      if (side && sizes.has(side)) {
        assignments.push({ id: rsvp.id, teamId: side });
        sizes.set(side, (sizes.get(side) ?? 0) + 1);
      } else {
        undecided.push(rsvp);
      }
    }

    // Then hand out whoever has no side, goalies first, always to the thinner
    // bench so a night of lopsided replies still comes out even.
    const byPosition = (position: PlayerPosition) =>
      undecided.filter((rsvp) => rsvp.player.position === position);

    for (const group of [byPosition("goalie"), byPosition("skater")]) {
      for (const rsvp of group) {
        const thinnest = teams.reduce((smallest, team) =>
          (sizes.get(team.id) ?? 0) < (sizes.get(smallest.id) ?? 0) ? team : smallest,
        );

        assignments.push({ id: rsvp.id, teamId: thinnest.id });
        sizes.set(thinnest.id, (sizes.get(thinnest.id) ?? 0) + 1);
      }
    }

    const results = await Promise.all(
      assignments.map((assignment) =>
        db.from("rsvps").update({ team_id: assignment.teamId }).eq("id", assignment.id),
      ),
    );

    const failed = results.find((result) => result.error);
    if (failed) return fail("Could not split the teams", failed.error);

    const { data: game } = await db
      .from("games")
      .select("rsvp_token")
      .eq("id", gameId)
      .maybeSingle<Pick<Game, "rsvp_token">>();

    refreshGame(gameId, game?.rsvp_token);
    return {
      ok: true,
      message:
        "Sides set. Everyone kept their usual team; anyone without one went to the thinner bench.",
    };
  });
}

export async function setRostersPublished(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(["admin"]);

    const gameId = String(formData.get("gameId") ?? "");
    const published = String(formData.get("published") ?? "") === "true";

    const { data, error } = await supabaseAdmin()
      .from("games")
      .update({ rosters_published: published })
      .eq("id", gameId)
      .select("rsvp_token")
      .single<Pick<Game, "rsvp_token">>();

    if (error) return fail("Could not update the roster visibility", error);

    refreshGame(gameId, data?.rsvp_token);
    return {
      ok: true,
      message: published ? "Teams are now visible on the RSVP page." : "Teams hidden again.",
    };
  });
}

/* ------------------------------------------------------------ results --- */

/** Captains and admins both report results; the game becomes final here. */
export async function saveResult(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(["admin", "captain"]);

    const gameId = String(formData.get("gameId") ?? "");
    if (!gameId) return { ok: false, message: "Missing game." };

    const db = supabaseAdmin();

    const scoreRows: { game_id: string; team_id: string; goals: number }[] = [];
    const statRows: Record<string, string | number | null>[] = [];

    // Form field suffix -> column. Anything not listed here is ignored, so the
    // form can never name a column of its own choosing.
    const STAT_COLUMNS: Record<string, { column: string; nullable: boolean }> = {
      goals: { column: "goals", nullable: false },
      assists: { column: "assists", nullable: false },
      pim: { column: "pim", nullable: false },
      "goals-against": { column: "goals_against", nullable: true },
      "shots-against": { column: "shots_against", nullable: true },
    };

    function rowFor(playerId: string) {
      let row = statRows.find((candidate) => candidate.player_id === playerId);
      if (!row) {
        row = { game_id: gameId, player_id: playerId, team_id: null };
        statRows.push(row);
      }
      return row;
    }

    for (const [key, raw] of formData.entries()) {
      const value = String(raw);

      if (key.startsWith("score_")) {
        scoreRows.push({
          game_id: gameId,
          team_id: key.slice("score_".length),
          goals: Math.max(0, Number(value) || 0),
        });
        continue;
      }

      // statteam_<playerId>
      if (key.startsWith("statteam_")) {
        rowFor(key.slice("statteam_".length)).team_id = value || null;
        continue;
      }

      // stat_<playerId>_<suffix>
      if (key.startsWith("stat_")) {
        const [, playerId, suffix] = key.split("_");
        const target = STAT_COLUMNS[suffix];
        if (!playerId || !target) continue;

        rowFor(playerId)[target.column] =
          value === "" ? (target.nullable ? null : 0) : Math.max(0, Number(value) || 0);
      }
    }

    if (scoreRows.length > 0) {
      const { error } = await db
        .from("game_scores")
        .upsert(scoreRows, { onConflict: "game_id,team_id" });
      if (error) return fail("Could not save the score", error);
    }

    if (statRows.length > 0) {
      const { error } = await db
        .from("game_stats")
        .upsert(statRows, { onConflict: "game_id,player_id" });
      if (error) return fail("Could not save the player stats", error);
    }

    const { data: game, error: statusError } = await db
      .from("games")
      .update({ status: "final" })
      .eq("id", gameId)
      .select("rsvp_token")
      .single<Pick<Game, "rsvp_token">>();

    if (statusError) {
      return fail("Saved the numbers, but could not close the game", statusError);
    }

    refreshGame(gameId, game?.rsvp_token);
    return { ok: true, message: "Result saved. Standings and stats are updated." };
  });
}

/* ------------------------------------------------------------ players --- */

export async function savePlayer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(["admin"]);

    const playerId = String(formData.get("playerId") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const position = String(formData.get("position") ?? "skater") as PlayerPosition;
    const jerseyRaw = String(formData.get("jerseyNumber") ?? "").trim();
    const isActive = String(formData.get("isActive") ?? "") !== "false";
    const defaultTeamId = String(formData.get("defaultTeamId") ?? "").trim();

    if (fullName.length < 2) return { ok: false, message: "A player needs a name." };

    const payload = {
      full_name: fullName,
      email: email || null,
      position,
      jersey_number: jerseyRaw === "" ? null : Number(jerseyRaw),
      is_active: isActive,
      default_team_id: defaultTeamId || null,
    };

    const db = supabaseAdmin();
    const { error } = playerId
      ? await db.from("players").update(payload).eq("id", playerId)
      : await db.from("players").insert(payload);

    if (error) {
      return error.code === "23505"
        ? { ok: false, message: "That email is already on the roster." }
        : fail("Could not save the player", error);
    }

    revalidatePath("/admin/players");
    return { ok: true, message: playerId ? "Player updated." : `${fullName} added to the roster.` };
  });
}

export async function setPlayerActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(["admin"]);

    const playerId = String(formData.get("playerId") ?? "");
    const active = String(formData.get("active") ?? "") === "true";

    const { error } = await supabaseAdmin()
      .from("players")
      .update({ is_active: active })
      .eq("id", playerId);

    if (error) return fail("Could not update the player", error);

    revalidatePath("/admin/players");
    return { ok: true, message: active ? "Player reactivated." : "Player moved to inactive." };
  });
}

/* -------------------------------------------------------------- roles --- */

export async function setRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRole(["admin"]);

    const userId = String(formData.get("userId") ?? "");
    const role = String(formData.get("role") ?? "player");

    const { error } = await supabaseAdmin().from("profiles").update({ role }).eq("id", userId);

    if (error) return fail("Could not change that role", error);

    revalidatePath("/admin/people");
    return { ok: true, message: "Role updated." };
  });
}
