import Link from "next/link";

import { DatabaseError } from "@/components/database-error";
import { TeamRosters } from "@/components/roster-lists";
import { ScoreLine } from "@/components/score-line";
import { SetupNotice } from "@/components/setup-notice";
import { Card, EmptyState, Pill, SectionHeading } from "@/components/ui";
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

/** The line a player sees after answering, built from ids we trust. */
function rsvpConfirmation(
  status: string | undefined,
  teamName: string | null,
): string | null {
  if (status === "out") return "Marked as out. Thanks for letting us know.";
  if (status === "maybe") return "Marked as a maybe — update it when you know.";
  if (status !== "in") return null;

  return teamName ? `You're in, on ${teamName}. See you at the rink.` : "You're in. See you at the rink.";
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
  const { rsvp, team: teamId } = await searchParams;
  const confirmation = rsvpConfirmation(
    typeof rsvp === "string" ? rsvp : undefined,
    teams.find((candidate) => candidate.id === teamId)?.name ?? null,
  );

  return (
    <div className="space-y-10">
      {confirmation && (
        <p className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
          {confirmation}
          {nextGame && (
            <>
              {" "}
              <Link
                href={`/rsvp/${nextGame.rsvp_token}`}
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
          <SectionHeading title="Who's in" />
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
