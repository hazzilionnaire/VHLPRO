import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PlayerList, TeamRosters } from "@/components/roster-lists";
import { SetupNotice } from "@/components/setup-notice";
import { Card, Pill, SectionHeading } from "@/components/ui";
import { formatGameDateLong, formatGameDateTime, formatGameTime } from "@/lib/datetime";
import { supabaseConfigured } from "@/lib/env";
import { getGameByToken, getPlayers, getRsvps, getTeams } from "@/lib/queries";
import { PLAYER_COOKIE } from "@/lib/rsvp-cookie";
import type { RsvpStatus } from "@/lib/types";
import { RsvpForm } from "./rsvp-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "RSVP" };

export default async function RsvpPage({ params }: PageProps<"/rsvp/[token]">) {
  if (!supabaseConfigured()) return <SetupNotice />;

  const { token } = await params;
  const game = await getGameByToken(token);
  if (!game) notFound();

  const [players, rsvps, teams, cookieStore] = await Promise.all([
    getPlayers(),
    getRsvps(game.id),
    getTeams(),
    cookies(),
  ]);

  const rememberedPlayerId = cookieStore.get(PLAYER_COOKIE)?.value ?? null;
  const myRsvp = rsvps.find((rsvp) => rsvp.player_id === rememberedPlayerId) ?? null;

  const closed = game.rsvp_closed;

  const inList = rsvps.filter((rsvp) => rsvp.status === "in");
  const maybeList = rsvps.filter((rsvp) => rsvp.status === "maybe");
  const outList = rsvps.filter((rsvp) => rsvp.status === "out");

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-ice-400 uppercase">
          Game night
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {formatGameDateLong(game.starts_at)}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {formatGameTime(game.starts_at)}
          {game.location ? ` · ${game.location}` : ""}
        </p>
        {game.notes && <p className="mt-3 text-sm text-chalk/80">{game.notes}</p>}
      </header>

      {closed ? (
        <Card>
          <p className="text-sm">
            {game.status === "cancelled"
              ? "This game has been cancelled."
              : game.status === "final"
                ? "This game has already been played."
                : "RSVP is closed for this game."}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Are you playing?</h2>
            {game.rsvp_closes_at && (
              <Pill tone="warn">Closes {formatGameDateTime(game.rsvp_closes_at)}</Pill>
            )}
          </div>
          {players.length === 0 ? (
            <p className="text-sm text-muted">
              The roster is empty, so there&apos;s no one to pick yet. The league admin adds
              players before the first RSVP goes out.
            </p>
          ) : (
            <RsvpForm
              token={token}
              players={players}
              rememberedPlayerId={rememberedPlayerId}
              currentStatus={(myRsvp?.status as RsvpStatus | undefined) ?? null}
            />
          )}
        </Card>
      )}

      <section>
        <SectionHeading title={`In · ${inList.length}`} />
        {game.rosters_published ? (
          <TeamRosters rsvps={inList} teams={teams} />
        ) : (
          <Card>
            <PlayerList rsvps={inList} empty="Nobody has said yes yet." />
            <p className="mt-4 border-t border-rink-800 pt-3 text-xs text-muted">
              Teams go up once the admin has set the lines.
            </p>
          </Card>
        )}
      </section>

      {maybeList.length > 0 && (
        <section>
          <SectionHeading title={`Maybe · ${maybeList.length}`} />
          <Card>
            <PlayerList rsvps={maybeList} empty="" />
          </Card>
        </section>
      )}

      {outList.length > 0 && (
        <section>
          <SectionHeading title={`Out · ${outList.length}`} />
          <Card>
            <PlayerList rsvps={outList} empty="" muted />
          </Card>
        </section>
      )}
    </div>
  );
}

