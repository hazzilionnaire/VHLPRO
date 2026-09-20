import { cookies } from "next/headers";

import { SetupNotice } from "@/components/setup-notice";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { formatGameDateLong } from "@/lib/datetime";
import { supabaseConfigured } from "@/lib/env";
import {
  getActiveSeason,
  getGameStats,
  getLastPlayedGame,
  getPlayerTotals,
  getPlayers,
} from "@/lib/queries";
import { PLAYER_COOKIE } from "@/lib/rsvp-cookie";
import type { PlayerTotal } from "@/lib/types";
import { StatEntryForm } from "./stat-entry-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats" };

export default async function StatsPage() {
  if (!supabaseConfigured()) return <SetupNotice />;

  const season = await getActiveSeason();
  if (!season) return <EmptyState>No active season yet.</EmptyState>;

  const [totals, lastGame, players, cookieStore] = await Promise.all([
    getPlayerTotals(season.id),
    getLastPlayedGame(season.id),
    getPlayers(),
    cookies(),
  ]);

  const existing = lastGame ? await getGameStats(lastGame.id) : [];
  const rememberedPlayerId = cookieStore.get(PLAYER_COOKIE)?.value ?? null;

  const skaters = totals.filter((row) => row.position === "skater");
  const goalies = totals.filter((row) => row.position === "goalie");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
        <p className="mt-1 text-sm text-muted">{season.name} season</p>
      </div>

      {lastGame && players.length > 0 && (
        <section>
          <SectionHeading title="Add your line" />
          <Card>
            <p className="mb-4 text-sm text-muted">
              For {formatGameDateLong(lastGame.starts_at)}
              {lastGame.location ? ` at ${lastGame.location}` : ""}. Enter your own goals and
              assists — the table below updates straight away.
            </p>
            <StatEntryForm
              gameId={lastGame.id}
              players={players}
              existing={existing}
              rememberedPlayerId={rememberedPlayerId}
            />
          </Card>
        </section>
      )}

      <section>
        <SectionHeading title="Skaters" />
        {skaters.length > 0 ? (
          <SkaterTable rows={skaters} />
        ) : (
          <EmptyState>No skaters on the roster yet.</EmptyState>
        )}
      </section>

      <section>
        <SectionHeading title="Goalies" />
        {goalies.length > 0 ? (
          <GoalieTable rows={goalies} />
        ) : (
          <EmptyState>No goalies on the roster yet.</EmptyState>
        )}
      </section>
    </div>
  );
}

function PlayerCell({ row }: { row: PlayerTotal }) {
  return (
    <td className="px-5 py-3">
      <span className="font-medium">{row.full_name}</span>
      {row.jersey_number !== null && (
        <span className="ml-2 text-xs text-muted">#{row.jersey_number}</span>
      )}
    </td>
  );
}

function SkaterTable({ rows }: { rows: PlayerTotal[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="tabular w-full text-sm">
        <thead className="border-b border-rink-800 text-xs tracking-wider text-muted uppercase">
          <tr>
            <th className="px-5 py-3 text-left font-medium">Player</th>
            <th className="px-3 py-3 text-right font-medium">GP</th>
            <th className="px-3 py-3 text-right font-medium">G</th>
            <th className="px-3 py-3 text-right font-medium">A</th>
            <th className="px-3 py-3 text-right font-medium">PTS</th>
            <th className="px-5 py-3 text-right font-medium">PIM</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rink-800">
          {rows.map((row) => (
            <tr key={row.player_id}>
              <PlayerCell row={row} />
              <td className="px-3 py-3 text-right text-muted">{row.games_played}</td>
              <td className="px-3 py-3 text-right">{row.goals}</td>
              <td className="px-3 py-3 text-right">{row.assists}</td>
              <td className="px-3 py-3 text-right font-semibold">{row.points}</td>
              <td className="px-5 py-3 text-right text-muted">{row.pim}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function GoalieTable({ rows }: { rows: PlayerTotal[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="tabular w-full text-sm">
        <thead className="border-b border-rink-800 text-xs tracking-wider text-muted uppercase">
          <tr>
            <th className="px-5 py-3 text-left font-medium">Goalie</th>
            <th className="px-3 py-3 text-right font-medium">GP</th>
            <th className="px-3 py-3 text-right font-medium">GA</th>
            <th className="px-3 py-3 text-right font-medium">GAA</th>
            <th className="px-5 py-3 text-right font-medium">SV%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rink-800">
          {rows.map((row) => {
            const gaa = row.games_played > 0 ? row.goals_against / row.games_played : 0;
            const saves = Math.max(0, row.shots_against - row.goals_against);
            const savePct = row.shots_against > 0 ? saves / row.shots_against : null;

            return (
              <tr key={row.player_id}>
                <PlayerCell row={row} />
                <td className="px-3 py-3 text-right text-muted">{row.games_played}</td>
                <td className="px-3 py-3 text-right">{row.goals_against}</td>
                <td className="px-3 py-3 text-right font-semibold">{gaa.toFixed(2)}</td>
                <td className="px-5 py-3 text-right text-muted">
                  {savePct === null ? "—" : savePct.toFixed(3).replace(/^0/, "")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
