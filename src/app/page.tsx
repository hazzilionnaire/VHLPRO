import Link from "next/link";

import { DatabaseError } from "@/components/database-error";
import { TeamRosters } from "@/components/roster-lists";
import { ScoreLine } from "@/components/score-line";
import { SetupNotice } from "@/components/setup-notice";
import { Card, EmptyState, Pill, SectionHeading } from "@/components/ui";
import {
  describeCountdown,
  formatGameDate,
  formatGameDateLong,
  formatGameTime,
} from "@/lib/datetime";
import { supabaseConfigured } from "@/lib/env";
import {
  describeDatabaseFailure,
  getActiveSeason,
  getPlayerTotals,
  getUpcomingGames,
  getRecentResults,
  getRsvps,
  getStandings,
  getTeams,
} from "@/lib/queries";
import type { PlayerTotal } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Everyone level at the top of a column. Returns nobody while the figure is
 * still zero — a league where no one has scored has no scoring leader.
 */
function leadersBy(
  rows: PlayerTotal[],
  key: "goals" | "games_played",
): { value: number; names: string[] } {
  const best = rows.reduce((highest, row) => Math.max(highest, row[key]), 0);
  if (best <= 0) return { value: 0, names: [] };

  return {
    value: best,
    names: rows.filter((row) => row[key] === best).map((row) => row.full_name),
  };
}

function LeaderCard({
  title,
  unit,
  leaders,
}: {
  title: string;
  unit: string;
  leaders: { value: number; names: string[] };
}) {
  // A whole roster tied on games played is normal early on, and unreadable.
  const shown = leaders.names.slice(0, 3);
  const rest = leaders.names.length - shown.length;

  return (
    <Card>
      <h3 className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">{title}</h3>

      {leaders.names.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing to go on yet.</p>
      ) : (
        <>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="tabular text-2xl font-bold">{leaders.value}</span>
            <span className="text-xs text-muted">{unit}</span>
          </p>
          <p className="mt-1 text-sm">
            {shown.join(", ")}
            {rest > 0 && <span className="text-muted"> +{rest} more</span>}
          </p>
        </>
      )}
    </Card>
  );
}

/** One figure from a team's record, label under the number. */
function TeamStat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <span className="flex w-8 flex-col items-center">
      <span className={`tabular ${emphasis ? "text-lg font-bold" : "text-base font-medium"}`}>
        {value}
      </span>
      <span className="text-[10px] tracking-wider text-muted uppercase">{label}</span>
    </span>
  );
}

/**
 * The line a player sees after answering, built from ids we trust. It names
 * the date, because answers can be given weeks ahead and "you're in" alone
 * doesn't say what for.
 */
function rsvpConfirmation(
  status: string | undefined,
  teamName: string | null,
  when: string | null,
): string | null {
  const forGame = when ? ` for ${when}` : "";

  if (status === "out") return `Marked as out${forGame}. Thanks for letting us know.`;
  if (status === "maybe") return `Marked as a maybe${forGame} — update it when you know.`;
  if (status !== "in") return null;

  return teamName
    ? `You're in${forGame}, on ${teamName}. See you at the rink.`
    : `You're in${forGame}. See you at the rink.`;
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
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

  const [teams, upcoming, results, standings, totals] = await Promise.all([
    getTeams(),
    getUpcomingGames(season.id, 6),
    getRecentResults(season.id, 4),
    getStandings(season.id),
    getPlayerTotals(season.id),
  ]);

  // The soonest game leads the page; the rest fill the schedule section below.
  const [nextGame, ...laterGames] = upcoming;

  const goalLeaders = leadersBy(totals, "goals");
  const appearanceLeaders = leadersBy(totals, "games_played");

  const rsvps = nextGame ? await getRsvps(nextGame.id) : [];
  const playingIn = rsvps.filter((rsvp) => rsvp.status === "in");
  const skatersIn = playingIn.filter((rsvp) => rsvp.player.position === "skater").length;
  const goaliesIn = playingIn.filter((rsvp) => rsvp.player.position === "goalie").length;

  const { rsvp, team: teamId, g: answeredToken } = await searchParams;

  // Back to the game they actually answered, which may be weeks out, not
  // whichever one happens to be next.
  const answeredGame =
    typeof answeredToken === "string"
      ? upcoming.find((game) => game.rsvp_token === answeredToken)
      : undefined;

  const confirmation = rsvpConfirmation(
    typeof rsvp === "string" ? rsvp : undefined,
    teams.find((candidate) => candidate.id === teamId)?.name ?? null,
    answeredGame ? formatGameDate(answeredGame.starts_at) : null,
  );

  return (
    <div className="space-y-10">
      {confirmation && (
        <p className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
          {confirmation}
          {(answeredGame ?? nextGame) && (
            <>
              {" "}
              <Link
                href={`/rsvp/${(answeredGame ?? nextGame).rsvp_token}`}
                className="underline underline-offset-2 hover:text-emerald-100"
              >
                Change your answer
              </Link>
            </>
          )}
        </p>
      )}
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

      {nextGame && (
        <section>
          {/* Named, because answers can be in for several weeks at once. */}
          <SectionHeading title={`Who's in · ${formatGameDate(nextGame.starts_at)}`} />
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
          <Card className="divide-y divide-rink-800 p-0">
            {standings.map((row) => (
              <div
                key={row.team_id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <span className="inline-flex items-center gap-2.5 font-semibold">
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-white/25"
                    style={{ backgroundColor: row.color }}
                    aria-hidden
                  />
                  {row.team_name}
                </span>
                <span className="flex items-center gap-5">
                  <TeamStat label="W" value={row.wins} />
                  <TeamStat label="L" value={row.losses} />
                  <TeamStat label="T" value={row.ties} />
                  <TeamStat label="PTS" value={row.points} emphasis />
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState>No games have been finalized yet this season.</EmptyState>
        )}
      </section>

      <section>
        <SectionHeading
          title="Leaders"
          action={
            <Link href="/stats" className="text-xs text-muted hover:text-chalk">
              All stats
            </Link>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <LeaderCard title="Goals" unit="goals" leaders={goalLeaders} />
          <LeaderCard title="Games played" unit="games" leaders={appearanceLeaders} />
        </div>
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

      <section>
        <SectionHeading
          title="Upcoming games"
          action={
            <Link href="/schedule" className="text-xs text-muted hover:text-chalk">
              Full schedule
            </Link>
          }
        />
        {laterGames.length > 0 ? (
          <Card className="divide-y divide-rink-800 p-0">
            {laterGames.map((game) => (
              <div
                key={game.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-medium">{formatGameDateLong(game.starts_at)}</p>
                  <p className="text-sm text-muted">
                    {formatGameTime(game.starts_at)}
                    {game.location ? ` · ${game.location}` : ""}
                  </p>
                </div>
                <Link
                  href={`/rsvp/${game.rsvp_token}`}
                  className="rounded-full border border-rink-700 px-3 py-1.5 text-xs font-medium transition hover:border-ice-500 hover:text-ice-400"
                >
                  RSVP
                </Link>
              </div>
            ))}
          </Card>
        ) : (
          <EmptyState>
            {nextGame
              ? "Nothing else on the calendar after the next game."
              : "Nothing on the calendar yet."}
          </EmptyState>
        )}
      </section>
    </div>
  );
}
