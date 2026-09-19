"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { leagueLocalToUtcIso } from "@/lib/datetime";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Game, GameStatus, PlayerPosition, RsvpWithPlayer, Team } from "@/lib/types";

export type ActionState = { ok: boolean; message: string } | null;

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
  await requireRole(["admin"]);

  const startsAtLocal = String(formData.get("startsAt") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const closesAtLocal = String(formData.get("rsvpClosesAt") ?? "");

  if (!startsAtLocal) return { ok: false, message: "Pick a date and time." };

  const db = supabaseAdmin();
  const { data: season } = await db
    .from("seasons")
    .select("id")
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();

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

  if (error || !data) return { ok: false, message: "Could not create the game." };

  refreshGame(data.id);
  redirect(`/admin/games/${data.id}`);
}

export async function updateGame(_prev: ActionState, formData: FormData): Promise<ActionState> {
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

  if (error) return { ok: false, message: "Could not save the game." };

  refreshGame(gameId, data?.rsvp_token);
  return { ok: true, message: "Game saved." };
}

/* --------------------------------------------------------- allocation --- */

/** Bulk-save the Blue/White split an admin set on the roster screen. */
export async function saveTeamAssignments(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
      db.from("rsvps").update({ team_id: update.teamId }).eq("id", update.id).eq("game_id", gameId),
    ),
  );

  if (results.some((result) => result.error)) {
    return { ok: false, message: "Some assignments did not save." };
  }

  const { data: game } = await db
    .from("games")
    .select("rsvp_token")
    .eq("id", gameId)
    .maybeSingle<Pick<Game, "rsvp_token">>();

  refreshGame(gameId, game?.rsvp_token);
  return { ok: true, message: `Teams saved for ${updates.length} players.` };
}

/**
 * A first pass at even sides: goalies split one each, then skaters dealt out
 * alternately. The admin still has the last word on the roster screen.
 */
export async function autoSplitTeams(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);

  const gameId = String(formData.get("gameId") ?? "");
  if (!gameId) return { ok: false, message: "Missing game." };

  const db = supabaseAdmin();

  const [{ data: teams }, { data: rsvps }] = await Promise.all([
    db.from("teams").select("*").order("sort_order").returns<Team[]>(),
    db
      .from("rsvps")
      .select("*, player:players(*)")
      .eq("game_id", gameId)
      .eq("status", "in")
      .returns<RsvpWithPlayer[]>(),
  ]);

  if (!teams || teams.length < 2) return { ok: false, message: "Need two teams to split." };
  if (!rsvps || rsvps.length === 0) return { ok: false, message: "Nobody has said they're in." };

  const byPosition = (position: PlayerPosition) =>
    rsvps.filter((rsvp) => rsvp.player.position === position);

  const assignments: { id: string; teamId: string }[] = [];
  let cursor = 0;

  for (const group of [byPosition("goalie"), byPosition("skater")]) {
    for (const rsvp of group) {
      assignments.push({ id: rsvp.id, teamId: teams[cursor % teams.length].id });
      cursor += 1;
    }
  }

  const results = await Promise.all(
    assignments.map((assignment) =>
      db.from("rsvps").update({ team_id: assignment.teamId }).eq("id", assignment.id),
    ),
  );

  if (results.some((result) => result.error)) {
    return { ok: false, message: "Could not split the teams." };
  }

  const { data: game } = await db
    .from("games")
    .select("rsvp_token")
    .eq("id", gameId)
    .maybeSingle<Pick<Game, "rsvp_token">>();

  refreshGame(gameId, game?.rsvp_token);
  return { ok: true, message: "Teams split — adjust anything that looks off, then publish." };
}

export async function setRostersPublished(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["admin"]);

  const gameId = String(formData.get("gameId") ?? "");
  const published = String(formData.get("published") ?? "") === "true";

  const { data, error } = await supabaseAdmin()
    .from("games")
    .update({ rosters_published: published })
    .eq("id", gameId)
    .select("rsvp_token")
    .single<Pick<Game, "rsvp_token">>();

  if (error) return { ok: false, message: "Could not update the roster visibility." };

  refreshGame(gameId, data?.rsvp_token);
  return {
    ok: true,
    message: published ? "Teams are now visible on the RSVP page." : "Teams hidden again.",
  };
}

/* ------------------------------------------------------------ results --- */

/** Captains and admins both report results; the game becomes final here. */
export async function saveResult(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
    const { error } = await db.from("game_scores").upsert(scoreRows, {
      onConflict: "game_id,team_id",
    });
    if (error) return { ok: false, message: "Could not save the score." };
  }

  if (statRows.length > 0) {
    const { error } = await db.from("game_stats").upsert(statRows, {
      onConflict: "game_id,player_id",
    });
    if (error) return { ok: false, message: "Could not save the player stats." };
  }

  const { data: game, error: statusError } = await db
    .from("games")
    .update({ status: "final" })
    .eq("id", gameId)
    .select("rsvp_token")
    .single<Pick<Game, "rsvp_token">>();

  if (statusError) return { ok: false, message: "Saved the numbers, but could not close the game." };

  refreshGame(gameId, game?.rsvp_token);
  return { ok: true, message: "Result saved. Standings and stats are updated." };
}

/* ------------------------------------------------------------ players --- */

export async function savePlayer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);

  const playerId = String(formData.get("playerId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const position = String(formData.get("position") ?? "skater") as PlayerPosition;
  const jerseyRaw = String(formData.get("jerseyNumber") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "") !== "false";

  if (fullName.length < 2) return { ok: false, message: "A player needs a name." };

  const payload = {
    full_name: fullName,
    email: email || null,
    position,
    jersey_number: jerseyRaw === "" ? null : Number(jerseyRaw),
    is_active: isActive,
  };

  const db = supabaseAdmin();
  const { error } = playerId
    ? await db.from("players").update(payload).eq("id", playerId)
    : await db.from("players").insert(payload);

  if (error) {
    return {
      ok: false,
      message: error.code === "23505" ? "That email is already on the roster." : "Could not save the player.",
    };
  }

  revalidatePath("/admin/players");
  return { ok: true, message: playerId ? "Player updated." : `${fullName} added to the roster.` };
}

export async function setPlayerActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);

  const playerId = String(formData.get("playerId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  const { error } = await supabaseAdmin()
    .from("players")
    .update({ is_active: active })
    .eq("id", playerId);

  if (error) return { ok: false, message: "Could not update the player." };

  revalidatePath("/admin/players");
  return { ok: true, message: active ? "Player reactivated." : "Player moved to inactive." };
}

/* -------------------------------------------------------------- roles --- */

export async function setRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(["admin"]);

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "player");

  const { error } = await supabaseAdmin().from("profiles").update({ role }).eq("id", userId);

  if (error) return { ok: false, message: "Could not change that role." };

  revalidatePath("/admin/people");
  return { ok: true, message: "Role updated." };
}
