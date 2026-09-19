import { SetupNotice } from "@/components/setup-notice";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { supabaseConfigured } from "@/lib/env";
import { getActiveSeason, getPlayerTotals } from "@/lib/queries";
import type { PlayerTotal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats" };

export default async function StatsPage() {
  if (!supabaseConfigured()) return <SetupNotice />;

  const season = await getActiveSeason();
  if (!season) return <EmptyState>No active season yet.</EmptyState>;

  const totals = await getPlayerTotals(season.id);
  const skaters = totals.filter((row) => row.position === "skater");
  const goalies = totals.filter((row) => row.position === "goalie");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
        <p className="mt-1 text-sm text-muted">{season.name} · finished games only</p>
      </div>

      <section>
        <SectionHeading title="Skaters" />
        {skaters.length > 0 ? <SkaterTable rows={skaters} /> : <EmptyState>No skater stats recorded yet.</EmptyState>}
      </section>

      <section>
        <SectionHeading title="Goalies" />
        {goalies.length > 0 ? <GoalieTable rows={goalies} /> : <EmptyState>No goalie stats recorded yet.</EmptyState>}
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
