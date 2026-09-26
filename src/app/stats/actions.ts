"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { after } from "next/server";

import { describePlayerLine, publishNews } from "@/lib/news";

import { runAction, type ActionState } from "@/lib/action-guard";
import { PLAYER_COOKIE, PLAYER_COOKIE_MAX_AGE } from "@/lib/rsvp-cookie";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Game, Player } from "@/lib/types";

function count(formData: FormData, field: string): number {
  const raw = String(formData.get(field) ?? "").trim();
  if (raw === "") return 0;

  // A typo shouldn't become a hat trick, and nobody scores 50 in a beer league.
  return Math.min(99, Math.max(0, Math.round(Number(raw) || 0)));
}

/**
 * A player entering their own line after the game. No account — the same
 * trust as the RSVP link, on the same roster.
 */
export async function submitOwnStats(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const gameId = String(formData.get("gameId") ?? "");
    const playerId = String(formData.get("playerId") ?? "");

    if (!playerId) return { ok: false, message: "Choose your name from the list." };

    const db = supabaseAdmin();

    const { data: game } = await db
      .from("games")
      .select("id, status, starts_at")
      .eq("id", gameId)
      .maybeSingle<Pick<Game, "id" | "status" | "starts_at">>();

    if (!game) return { ok: false, message: "Pick a game first." };
    if (game.status === "cancelled") return { ok: false, message: "That game was cancelled." };

    const { data: player } = await db
      .from("players")
      .select("id, full_name, is_active, position")
      .eq("id", playerId)
      .maybeSingle<Pick<Player, "id" | "full_name" | "is_active" | "position">>();

    if (!player || !player.is_active) {
      return { ok: false, message: "That name isn't on the roster." };
    }

    // Credit the line to the side they actually played on that night.
    const { data: rsvp } = await db
      .from("rsvps")
      .select("team_id")
      .eq("game_id", game.id)
      .eq("player_id", player.id)
      .maybeSingle<{ team_id: string | null }>();

    // What was on the sheet before, so a correction can be told from an entry.
    const { data: previous } = await db
      .from("game_stats")
      .select("goals, assists")
      .eq("game_id", game.id)
      .eq("player_id", player.id)
      .maybeSingle<{ goals: number; assists: number }>();

    const isGoalie = player.position === "goalie";
    const goals = count(formData, "goals");
    const assists = count(formData, "assists");

    const { error } = await db.from("game_stats").upsert(
      {
        game_id: game.id,
        player_id: player.id,
        team_id: rsvp?.team_id ?? null,
        goals,
        assists,
        pim: count(formData, "pim"),
        goals_against: isGoalie ? count(formData, "goalsAgainst") : null,
        shots_against: isGoalie ? count(formData, "shotsAgainst") : null,
      },
      { onConflict: "game_id,player_id" },
    );

    if (error) {
      return { ok: false, message: `Could not save your line: ${error.message}` };
    }

    const cookieStore = await cookies();
    cookieStore.set(PLAYER_COOKIE, player.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: PLAYER_COOKIE_MAX_AGE,
      path: "/",
    });

    // Only something added is worth announcing. Taking a goal back off the
    // sheet is a correction, and nobody wants the league's front page
    // narrating their mistake. A quiet period inside publishNews then keeps
    // twenty players entering lines from becoming twenty write-ups.
    const before = (previous?.goals ?? 0) + (previous?.assists ?? 0);
    const now = goals + assists;

    if (now > before) {
      after(async () => {
        const facts = await describePlayerLine(game.id, player.id);
        if (facts) await publishNews(facts);
      });
    }

    revalidatePath("/stats");
    revalidatePath("/");

    return { ok: true, message: `Saved. Thanks, ${player.full_name.split(" ")[0]}.` };
  });
}
