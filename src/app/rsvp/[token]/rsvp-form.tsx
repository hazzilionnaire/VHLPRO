"use client";

import { useActionState, useState } from "react";

import type { Player, RsvpStatus } from "@/lib/types";
import { submitRsvp, type RsvpFormState } from "./actions";

const NEW_PLAYER = "__new__";

export function RsvpForm({
  token,
  players,
  rememberedPlayerId,
  currentStatus,
}: {
  token: string;
  players: Pick<Player, "id" | "full_name" | "position">[];
  rememberedPlayerId: string | null;
  currentStatus: RsvpStatus | null;
}) {
  const [selected, setSelected] = useState(rememberedPlayerId ?? "");
  const [state, formAction, pending] = useActionState<RsvpFormState, FormData>(submitRsvp, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="playerId" className="mb-1.5 block text-sm font-medium">
          Who are you?
        </label>
        <select
          id="playerId"
          name="playerId"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="w-full rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500"
          required
        >
          <option value="" disabled>
            Select your name…
          </option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.full_name}
              {player.position === "goalie" ? " (G)" : ""}
            </option>
          ))}
          <option value={NEW_PLAYER}>I&apos;m new — add me</option>
        </select>
      </div>

      {selected === NEW_PLAYER && (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            name="newPlayerName"
            placeholder="Full name"
            className="rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500"
            required
          />
          <select
            name="newPlayerPosition"
            defaultValue="skater"
            className="rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500"
          >
            <option value="skater">Skater</option>
            <option value="goalie">Goalie</option>
          </select>
        </div>
      )}

      <div>
        <label htmlFor="note" className="mb-1.5 block text-sm font-medium">
          Note <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="note"
          name="note"
          placeholder="Running late, bringing a sub…"
          className="w-full rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500"
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          name="status"
          value="in"
          disabled={pending}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          I&apos;m in
        </button>
        <button
          type="submit"
          name="status"
          value="maybe"
          disabled={pending}
          className="rounded-xl border border-rink-700 px-4 py-3 text-sm font-semibold transition hover:border-amber-500 hover:text-amber-300 disabled:opacity-50"
        >
          Maybe
        </button>
        <button
          type="submit"
          name="status"
          value="out"
          disabled={pending}
          className="rounded-xl border border-rink-700 px-4 py-3 text-sm font-semibold transition hover:border-rose-500 hover:text-rose-300 disabled:opacity-50"
        >
          Can&apos;t make it
        </button>
      </div>

      {currentStatus && !state && (
        <p className="text-sm text-muted">
          You&apos;re currently marked <strong className="text-chalk">{currentStatus}</strong>. Submit
          again to change it.
        </p>
      )}

      {state && (
        <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
