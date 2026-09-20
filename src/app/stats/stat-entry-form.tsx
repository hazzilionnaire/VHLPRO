"use client";

import { useActionState, useState } from "react";

import type { GameStat, Player } from "@/lib/types";
import { submitOwnStats } from "./actions";

type State = { ok: boolean; message: string } | null;

const field =
  "w-full rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500";

export function StatEntryForm({
  gameId,
  players,
  existing,
  rememberedPlayerId,
}: {
  gameId: string;
  players: Pick<Player, "id" | "full_name" | "position">[];
  existing: GameStat[];
  rememberedPlayerId: string | null;
}) {
  const [selected, setSelected] = useState(rememberedPlayerId ?? "");
  const [state, formAction, pending] = useActionState<State, FormData>(submitOwnStats, null);

  const player = players.find((candidate) => candidate.id === selected);
  const mine = existing.find((row) => row.player_id === selected);
  const isGoalie = player?.position === "goalie";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="gameId" value={gameId} />

      <div>
        <label htmlFor="playerId" className="mb-1.5 block text-sm font-medium">
          Who are you?
        </label>
        <select
          id="playerId"
          name="playerId"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className={field}
          required
        >
          <option value="" disabled>
            Select your name…
          </option>
          {players.map((option) => (
            <option key={option.id} value={option.id}>
              {option.full_name}
              {option.position === "goalie" ? " (G)" : ""}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <>
          {/* Keyed on the player so the boxes reload when the name changes. */}
          <div key={selected} className="grid grid-cols-3 gap-3">
            <NumberField name="goals" label="Goals" defaultValue={mine?.goals ?? 0} />
            <NumberField name="assists" label="Assists" defaultValue={mine?.assists ?? 0} />
            <NumberField name="pim" label="PIM" defaultValue={mine?.pim ?? 0} />
          </div>

          {isGoalie && (
            <div key={`${selected}-goalie`} className="grid grid-cols-2 gap-3">
              <NumberField
                name="goalsAgainst"
                label="Goals against"
                defaultValue={mine?.goals_against ?? 0}
              />
              <NumberField
                name="shotsAgainst"
                label="Shots against"
                defaultValue={mine?.shots_against ?? 0}
              />
            </div>
          )}

          {mine && (
            <p className="text-xs text-muted">
              You&apos;ve already entered a line for this game — saving again replaces it.
            </p>
          )}
        </>
      )}

      <button
        type="submit"
        disabled={pending || !selected}
        className="w-full rounded-xl bg-ice-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-ice-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save my line"}
      </button>

      {state && (
        <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={0}
        max={99}
        inputMode="numeric"
        defaultValue={defaultValue}
        className={`tabular text-center ${field}`}
      />
    </div>
  );
}
