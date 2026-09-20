import Link from "next/link";

import { DatabaseError } from "@/components/database-error";
import { TeamRosters } from "@/components/roster-lists";
import { ScoreLine } from "@/components/score-line";
import { SetupNotice } from "@/components/setup-notice";
import { Card, EmptyState, Pill, SectionHeading } from "@/components/ui";
import { canReportResults, getViewer } from "@/lib/auth";
import { describeCountdown, formatGameDateLong, formatGameTime } from "@/lib/datetime";
import { supabaseConfigured } from "@/lib/env";
import {
  describeDatabaseFailure,
  getActiveSeason,
  getNextGame,
  getRecentResults,
  getRsvps,
  getStandings,
  getTeams,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!supabaseConfigured()) return <SetupNotice />;

  const season = await getActiveSeason();
  if (!season) {
    // An empty league and a locked-out one look identical from here.
    const failure = await describeDatabaseFailure();
    if (failure) return <DatabaseError message={failure} />;

    return (
      <EmptyState>No active season yet. An admin can start one from the admin area.</EmptyState>
    );
  }

  const [teams, nextGame, results, standings] = await Promise.all([
    getTeams(),
    getNextGame(season.id),
    getRecentResults(season.id, 4),
    getStandings(season.id),
  ]);

  const rsvps = nextGame ? await getRsvps(nextGame.id) : [];
  const playingIn = rsvps.filter((rsvp) => rsvp.status === "in");
  const skatersIn = playingIn.filter((rsvp) => rsvp.player.position === "skater").length;
  const goaliesIn = playingIn.filter((rsvp) => rsvp.player.position === "goalie").length;

  // Organizers watch the sides fill up as answers come in; everyone else sees
  // them once the admin is happy with the split and publishes.
  const viewer = await getViewer();
  const organizing = viewer ? canReportResults(viewer.role) : false;
  const showRosters = organizing || (nextGame?.rosters_published ?? false);

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading title="Next game" />
        {nextGame ? (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xl font-semibold">{formatGameDateLong(nextGame.starts_at)}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatGameTime(nextGame.starts_at)}
                  {nextGame.location ? ` · ${nextGame.location}` : ""}
                </p>
              </div>
              <Pill tone="neutral">{describeCountdown(nextGame.starts_at)}</Pill>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="tabular">
                <strong className="text-lg">{skatersIn}</strong>{" "}
                <span className="text-muted">skaters in</span>
              </span>
              <span className="tabular">
                <strong className="text-lg">{goaliesIn}</strong>{" "}
                <span className="text-muted">goalie{goaliesIn === 1 ? "" : "s"} in</span>
              </span>
            </div>

            <Link
              href={`/rsvp/${nextGame.rsvp_token}`}
              className="mt-5 inline-flex rounded-full bg-ice-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-ice-500"
            >
              RSVP for this game
            </Link>
          </Card>
        ) : (
          <EmptyState>Nothing on the schedule right now.</EmptyState>
        )}
      </section>

      {nextGame && showRosters && (
        <section>
          <SectionHeading
            title="Who's in"
            action={
              organizing && !nextGame.rosters_published ? (
                <span className="text-xs text-amber-300">Not published yet — only you see this</span>
              ) : null
            }
          />
          <TeamRosters rsvps={playingIn} teams={teams} />
        </section>
      )}

      <section>
        <SectionHeading
          title="Standings"
          action={
            <Link href="/standings" className="text-xs text-muted hover:text-chalk">
              Full table
            </Link>
          }
        />
        {standings.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {standings.map((row) => (
              <Card key={row.team_id} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-white/25"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  {row.team_name}
                </span>
                <span className="tabular text-sm text-muted">
                  {row.wins}-{row.losses}-{row.ties}
                </span>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState>No games have been finalized yet this season.</EmptyState>
        )}
      </section>

      <section>
        <SectionHeading
          title="Recent results"
          action={
            <Link href="/schedule" className="text-xs text-muted hover:text-chalk">
              Full schedule
            </Link>
          }
        />
        {results.length > 0 ? (
          <Card className="divide-y divide-rink-800 p-0">
            {results.map((game) => (
              <div
                key={game.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <span className="text-sm text-muted">{formatGameDateLong(game.starts_at)}</span>
                <ScoreLine game={game} teams={teams} />
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState>No results yet — the season is young.</EmptyState>
        )}
      </section>
    </div>
  );
}
