import Link from "next/link";

import { CopyLink } from "@/components/copy-link";
import { DatabaseError } from "@/components/database-error";
import { Card, EmptyState, Pill, SectionHeading } from "@/components/ui";
import { formatGameDateLong, formatGameTime } from "@/lib/datetime";
import { getViewer } from "@/lib/auth";
import { describeDatabaseFailure, getActiveSeason, getInCounts, getSeasonGames } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminGamesPage() {
  const viewer = await getViewer();
  const season = await getActiveSeason();

  if (!season) {
    const failure = await describeDatabaseFailure();
    if (failure) return <DatabaseError message={failure} />;

    return (
      <EmptyState>
        No active season. Add one to the <code>seasons</code> table and mark it active.
      </EmptyState>
    );
  }

  const games = await getSeasonGames(season.id);
  const counts = await getInCounts(games.map((game) => game.id));

  const upcoming = games.filter((game) => game.status === "scheduled");
  const past = games.filter((game) => game.status !== "scheduled").reverse();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Games</h1>
          <p className="mt-1 text-sm text-muted">{season.name} season</p>
        </div>
        {viewer?.role === "admin" && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/games/schedule"
              className="rounded-full border border-rink-700 px-4 py-2 text-sm font-medium transition hover:border-ice-500 hover:text-ice-400"
            >
              Schedule a run
            </Link>
            <Link
              href="/admin/games/new"
              className="rounded-full bg-ice-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ice-500"
            >
              New game
            </Link>
          </div>
        )}
      </div>

      <section>
        <SectionHeading title="Upcoming" />
        {upcoming.length > 0 ? (
          <Card className="divide-y divide-rink-800 p-0">
            {upcoming.map((game) => (
              <div
                key={game.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <Link href={`/admin/games/${game.id}`} className="font-medium hover:text-ice-400">
                    {formatGameDateLong(game.starts_at)}
                  </Link>
                  <p className="text-sm text-muted">
                    {formatGameTime(game.starts_at)}
                    {game.location ? ` · ${game.location}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="tabular text-sm text-muted">
                    {counts.get(game.id) ?? 0} in
                  </span>
                  <CopyLink path={`/rsvp/${game.rsvp_token}`} />
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState>No games scheduled yet.</EmptyState>
        )}
      </section>

      <section>
        <SectionHeading title="Played" />
        {past.length > 0 ? (
          <Card className="divide-y divide-rink-800 p-0">
            {past.map((game) => (
              <div
                key={game.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <Link href={`/admin/games/${game.id}`} className="font-medium hover:text-ice-400">
                  {formatGameDateLong(game.starts_at)}
                </Link>
                <Pill tone={game.status === "cancelled" ? "bad" : "neutral"}>
                  {game.status === "cancelled" ? "Cancelled" : "Final"}
                </Pill>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState>Nothing played yet.</EmptyState>
        )}
      </section>
    </div>
  );
}
