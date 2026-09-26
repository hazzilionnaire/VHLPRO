import type { GameWithScores } from "@/lib/queries";
import type { Team } from "@/lib/types";

/**
 * "Blue 3 — 1 White · games", with the winning side in bold. The suffix earns
 * its space: the numbers are games won on the night, not goals, and without
 * it every reader assumes otherwise.
 */
export function ScoreLine({ game, teams }: { game: GameWithScores; teams: Team[] }) {
  const goals = new Map(game.scores.map((score) => [score.team_id, score.goals]));

  if (goals.size === 0) {
    return <span className="text-sm text-muted">No result yet</span>;
  }

  const [first, second] = teams;
  const firstGoals = goals.get(first?.id ?? "") ?? 0;
  const secondGoals = goals.get(second?.id ?? "") ?? 0;

  return (
    <span className="tabular inline-flex items-center gap-2 text-sm">
      <span className={firstGoals > secondGoals ? "font-semibold" : "text-muted"}>
        {first?.name} {firstGoals}
      </span>
      <span className="text-rink-600">—</span>
      <span className={secondGoals > firstGoals ? "font-semibold" : "text-muted"}>
        {secondGoals} {second?.name}
      </span>
      <span className="text-xs text-rink-600">games</span>
    </span>
  );
}
