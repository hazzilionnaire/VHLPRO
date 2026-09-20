"use client";

import { useActionState, useState } from "react";

import { formatGameDate, formatGameDateLong } from "@/lib/datetime";
import type { Game, GameStat, Player } from "@/lib/types";
import { submitOwnStats } from "./actions";

type State = { ok: boolean; message: string } | null;

const field =
  "w-full rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500";

export function StatEntryForm({
  games,
  players,
  stats,
  rememberedPlayerId,
}: {
  games: Game[];
  players: Pick<Player, "id" | "full_name" | "position">[];
  stats: GameStat[];
  rememberedPlayerId: string | null;
}) {
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [playerId, setPlayerId] = useState(rememberedPlayerId ?? "");
  const [state, formAction, pending] = useActionState<State, FormData>(submitOwnStats, null);

  const player = players.find((candidate) => candidate.id === playerId);
  const mine = stats.find((row) => row.game_id === gameId && row.player_id === playerId);
  const game = games.find((candidate) => candidate.id === gameId);
  const isGoalie = player?.position === "goalie";

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="gameId" className="mb-1.5 block text-sm font-medium">
            Which game?
          </label>
          <select
            id="gameId"
            name="gameId"
            value={gameId}
            onChange={(event) => setGameId(event.target.value)}
            className={field}
            required
          >
            {games.map((option) => (
              <option key={option.id} value={option.id}>
                {formatGameDate(option.starts_at)}
                {option.location ? ` · ${option.location}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="playerId" className="mb-1.5 block text-sm font-medium">
            Who are you?
          </label>
          <select
            id="playerId"
            name="playerId"
            value={playerId}
            onChange={(event) => setPlayerId(event.target.value)}
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
      </div>

      {playerId && (
        // Keyed on both, so the boxes reload when either choice changes.
        <div key={`${gameId}-${playerId}`} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <NumberField name="goals" label="Goals" defaultValue={mine?.goals ?? 0} />
            <NumberField name="assists" label="Assists" defaultValue={mine?.assists ?? 0} />
            <NumberField name="pim" label="PIM" defaultValue={mine?.pim ?? 0} />
          </div>

          {isGoalie && (
            <div className="grid grid-cols-2 gap-3">
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

          <p className="text-xs text-muted">
            {mine
              ? `Your line for ${game ? formatGameDateLong(game.starts_at) : "this game"} — change it as often as you like.`
              : "Nothing recorded for you yet on this date."}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !playerId || !gameId}
        className="w-full rounded-xl bg-ice-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-ice-500 disabled:opacity-50"
      >
        {pending ? "Saving…" : mine ? "Update my line" : "Save my line"}
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
