"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { PLAYER_COOKIE, PLAYER_COOKIE_MAX_AGE } from "@/lib/rsvp-cookie";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Game, Player, RsvpStatus } from "@/lib/types";

export type RsvpFormState = { ok: boolean; message: string } | null;

function isRsvpOpen(game: Pick<Game, "status" | "rsvp_closes_at" | "starts_at">): string | null {
  if (game.status === "cancelled") return "This game has been cancelled.";
  if (game.status === "final") return "This game has already been played.";

  const deadline = game.rsvp_closes_at ? new Date(game.rsvp_closes_at) : new Date(game.starts_at);
  if (deadline.getTime() < Date.now()) return "RSVP for this game is closed.";

  return null;
}

export async function submitRsvp(
  _prevState: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  const token = String(formData.get("token") ?? "");
  const status = String(formData.get("status") ?? "") as RsvpStatus;
  const playerId = String(formData.get("playerId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!["in", "out", "maybe"].includes(status)) {
    return { ok: false, message: "Pick whether you're in or out." };
  }

  const db = supabaseAdmin();

  const { data: game } = await db
    .from("games")
    .select("id, status, starts_at, rsvp_closes_at")
    .eq("rsvp_token", token)
    .maybeSingle<Pick<Game, "id" | "status" | "starts_at" | "rsvp_closes_at">>();

  if (!game) return { ok: false, message: "That RSVP link is no longer valid." };

  const closed = isRsvpOpen(game);
  if (closed) return { ok: false, message: closed };

  if (!playerId) {
    return { ok: false, message: "Choose your name from the list." };
  }

  // The roster belongs to the admin, so only a name already on it may answer.
  // The form offers nothing else, but the form isn't the only way to post here.
  const { data: player } = await db
    .from("players")
    .select("id, is_active, default_team_id")
    .eq("id", playerId)
    .maybeSingle<Pick<Player, "id" | "is_active" | "default_team_id">>();

  if (!player || !player.is_active) {
    return {
      ok: false,
      message: "That name isn't on the roster. Ask the league admin to add you.",
    };
  }

  // Their usual side, unless this game already carries an override — changing
  // an answer shouldn't undo a swap the admin made to even the teams out.
  const { data: existing } = await db
    .from("rsvps")
    .select("team_id")
    .eq("game_id", game.id)
    .eq("player_id", player.id)
    .maybeSingle<{ team_id: string | null }>();

  const teamId = existing?.team_id ?? player.default_team_id ?? null;

  const { error: rsvpError } = await db.from("rsvps").upsert(
    {
      game_id: game.id,
      player_id: player.id,
      status,
      team_id: teamId,
      note: note || null,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "game_id,player_id" },
  );

  if (rsvpError) {
    return { ok: false, message: `Could not save your answer: ${rsvpError.message}` };
  }

  const cookieStore = await cookies();
  cookieStore.set(PLAYER_COOKIE, player.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PLAYER_COOKIE_MAX_AGE,
    path: "/",
  });

  revalidatePath(`/rsvp/${token}`);
  revalidatePath("/");

  // Answering hands them back to the league's front page. The confirmation
  // travels in the URL so it survives the trip — the team is looked up there
  // by id, not taken from the link, so nothing arbitrary can be put on screen.
  const params = new URLSearchParams({ rsvp: status });
  if (status === "in" && teamId) params.set("team", teamId);

  redirect(`/?${params.toString()}`);
}
