"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { PLAYER_COOKIE, PLAYER_COOKIE_MAX_AGE } from "@/lib/rsvp-cookie";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Game, Player, PlayerPosition, RsvpStatus } from "@/lib/types";

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
  const newName = String(formData.get("newPlayerName") ?? "").trim();
  const newPosition = String(formData.get("newPlayerPosition") ?? "skater") as PlayerPosition;
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

  // Either an existing player picked from the list, or someone new to the league.
  let resolvedPlayerId = playerId;

  if (playerId === "__new__") {
    if (newName.length < 2) {
      return { ok: false, message: "Enter your name so we know who's playing." };
    }

    const { data: created, error } = await db
      .from("players")
      .insert({ full_name: newName, position: newPosition })
      .select("id")
      .single<Pick<Player, "id">>();

    if (error || !created) {
      return { ok: false, message: "Could not add you to the roster. Try again." };
    }
    resolvedPlayerId = created.id;
  }

  if (!resolvedPlayerId) {
    return { ok: false, message: "Choose your name from the list." };
  }

  const { error: rsvpError } = await db.from("rsvps").upsert(
    {
      game_id: game.id,
      player_id: resolvedPlayerId,
      status,
      note: note || null,
      responded_at: new Date().toISOString(),
    },
    { onConflict: "game_id,player_id" },
  );

  if (rsvpError) {
    return { ok: false, message: "Could not save your answer. Try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set(PLAYER_COOKIE, resolvedPlayerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PLAYER_COOKIE_MAX_AGE,
    path: "/",
  });

  revalidatePath(`/rsvp/${token}`);

  return {
    ok: true,
    message:
      status === "in"
        ? "You're in. See you at the rink."
        : status === "maybe"
          ? "Marked as a maybe — update it when you know."
          : "Marked as out. Thanks for letting us know.",
  };
}
