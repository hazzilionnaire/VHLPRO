import Link from "next/link";

import { ScoreLine } from "@/components/score-line";
import { SetupNotice } from "@/components/setup-notice";
import { Card, EmptyState, Pill, SectionHeading } from "@/components/ui";
import { formatGameDateLong, formatGameTime } from "@/lib/datetime";
import { supabaseConfigured } from "@/lib/env";
import { getActiveSeason, getSeasonGames, getTeams, type GameWithScores } from "@/lib/queries";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule" };

export default async function SchedulePage() {
  if (!supabaseConfigured()) return <SetupNotice />;

  const season = await getActiveSeason();
  if (!season) return <EmptyState>No active season yet.</EmptyState>;

  const [teams, games] = await Promise.all([getTeams(), getSeasonGames(season.id)]);

  const upcoming = games.filter((game) => game.status === "scheduled");
  const played = games.filter((game) => game.status !== "scheduled").reverse();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="mt-1 text-sm text-muted">{season.name} season</p>
      </div>

      <section>
        <SectionHeading title="Upcoming" />
        {upcoming.length > 0 ? (
          <Card className="divide-y divide-rink-800 p-0">
            {upcoming.map((game) => (
              <GameRow key={game.id} game={game} teams={teams} />
            ))}
          </Card>
        ) : (
          <EmptyState>No games scheduled.</EmptyState>
        )}
      </section>

      <section>
        <SectionHeading title="Played" />
        {played.length > 0 ? (
          <Card className="divide-y divide-rink-800 p-0">
            {played.map((game) => (
              <GameRow key={game.id} game={game} teams={teams} />
            ))}
          </Card>
        ) : (
          <EmptyState>Nothing in the books yet.</EmptyState>
        )}
      </section>
    </div>
  );
}

function GameRow({ game, teams }: { game: GameWithScores; teams: Team[] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div>
        <p className="font-medium">{formatGameDateLong(game.starts_at)}</p>
        <p className="text-sm text-muted">
          {formatGameTime(game.starts_at)}
          {game.location ? ` · ${game.location}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {game.status === "cancelled" ? (
          <Pill tone="bad">Cancelled</Pill>
        ) : game.status === "final" ? (
          <ScoreLine game={game} teams={teams} />
        ) : (
          <Link
            href={`/rsvp/${game.rsvp_token}`}
            className="rounded-full border border-rink-700 px-3 py-1.5 text-xs font-medium transition hover:border-ice-500 hover:text-ice-400"
          >
            RSVP
          </Link>
        )}
      </div>
    </div>
  );
}
