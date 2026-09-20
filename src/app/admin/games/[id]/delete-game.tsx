"use client";

import { useActionState } from "react";

import { deleteGame } from "@/app/admin/actions";

type State = { ok: boolean; message: string } | null;

/**
 * Deleting takes the RSVPs and stats with it, so it asks first. Cancelling is
 * the right move for a game that was real and fell through — this is for one
 * that shouldn't have existed.
 */
export function DeleteGame({ gameId, label }: { gameId: string; label: string }) {
  const [state, formAction] = useActionState<State, FormData>(deleteGame, null);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const sure = window.confirm(
          `Delete the game on ${label}? Its RSVPs and stats go with it. This can't be undone.`,
        );
        if (!sure) event.preventDefault();
      }}
    >
      <input type="hidden" name="gameId" value={gameId} />
      <button type="submit" className="text-xs text-muted transition hover:text-rose-300">
        Delete this game
      </button>
      {state && !state.ok && <p className="mt-2 text-sm text-rose-300">{state.message}</p>}
    </form>
  );
}
