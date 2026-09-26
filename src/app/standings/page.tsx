import { SetupNotice } from "@/components/setup-notice";
import { Card, EmptyState } from "@/components/ui";
import { supabaseConfigured } from "@/lib/env";
import { getActiveSeason, getStandings } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Standings" };

export default async function StandingsPage() {
  if (!supabaseConfigured()) return <SetupNotice />;

  const season = await getActiveSeason();
  if (!season) return <EmptyState>No active season yet.</EmptyState>;

  const standings = await getStandings(season.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Standings</h1>
        <p className="mt-1 text-sm text-muted">
          {season.name} · a night is won by taking more of its games · two
          points for a win, one for a tie
        </p>
      </div>

      {standings.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="tabular w-full text-sm">
            <thead className="border-b border-rink-800 text-xs tracking-wider text-muted uppercase">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Team</th>
                <th className="px-3 py-3 text-right font-medium">GP</th>
                <th className="px-3 py-3 text-right font-medium">W</th>
                <th className="px-3 py-3 text-right font-medium">L</th>
                <th className="px-3 py-3 text-right font-medium">T</th>
                <th className="px-5 py-3 text-right font-medium">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rink-800">
              {standings.map((row) => (
                <tr key={row.team_id}>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full ring-1 ring-white/25"
                        style={{ backgroundColor: row.color }}
                        aria-hidden
                      />
                      {row.team_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-muted">
                    {row.games_played}
                  </td>
                  <td className="px-3 py-3 text-right">{row.wins}</td>
                  <td className="px-3 py-3 text-right">{row.losses}</td>
                  <td className="px-3 py-3 text-right">{row.ties}</td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {row.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <EmptyState>No finished games yet this season.</EmptyState>
      )}
    </div>
  );
}
