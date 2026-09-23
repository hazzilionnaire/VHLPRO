import { TeamBadge } from "@/components/team-badge";
import { Card } from "@/components/ui";
import type { Player, RsvpWithPlayer, Team } from "@/lib/types";

export function PlayerList({
  rsvps,
  empty,
  muted = false,
}: {
  rsvps: RsvpWithPlayer[];
  empty: string;
  muted?: boolean;
}) {
  if (rsvps.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }

  return (
    <ul className={`space-y-1.5 text-sm ${muted ? "text-muted" : ""}`}>
      {rsvps.map((rsvp) => (
        <li key={rsvp.id} className="flex flex-wrap items-baseline gap-x-2">
          <span className={muted ? "" : "font-medium"}>{rsvp.player.full_name}</span>
          {rsvp.player.position === "goalie" && <span className="text-xs text-ice-400">Goalie</span>}
          {rsvp.note && <span className="text-xs text-muted">· {rsvp.note}</span>}
        </li>
      ))}
    </ul>
  );
}

/** A small heading over a dimmed list, for the people who aren't playing. */
function AsideGroup({ label, names }: { label: string; names: string[] }) {
  if (names.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wider text-muted uppercase">
        {label} · {names.length}
      </p>
      <ul className="mt-1 space-y-1 text-sm text-rink-600">
        {names.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Each bench, with who's confirmed on the left and everyone else dimmed on the
 * right: out, undecided, and those who haven't replied at all. A player who
 * answered Maybe belongs somewhere too, or they'd disappear from the night
 * entirely.
 */
export function TeamRosters({
  rsvps,
  teams,
  players,
}: {
  rsvps: RsvpWithPlayer[];
  teams: Team[];
  /** The full active roster. Without it, nobody can be counted as silent. */
  players?: Player[];
}) {
  // Someone who declined still carries the side they'd have played for; a
  // player who never answered has only the team they belong to.
  const sideOf = (rsvp: RsvpWithPlayer) => rsvp.team_id ?? rsvp.player.default_team_id;

  const answered = new Set(rsvps.map((rsvp) => rsvp.player_id));
  const silent = (players ?? []).filter((player) => !answered.has(player.id));

  const playing = rsvps.filter((rsvp) => rsvp.status === "in");
  const unassigned = playing.filter((rsvp) => !rsvp.team_id);
  const silentWithoutTeam = silent.filter((player) => !player.default_team_id);

  const namesOf = (list: { full_name: string }[]) =>
    list.map((entry) => entry.full_name).sort((a, b) => a.localeCompare(b));

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {teams.map((team) => {
        const bench = playing.filter((rsvp) => rsvp.team_id === team.id);
        const goalies = bench.filter((rsvp) => rsvp.player.position === "goalie").length;

        const out = rsvps.filter((rsvp) => rsvp.status === "out" && sideOf(rsvp) === team.id);
        const maybe = rsvps.filter((rsvp) => rsvp.status === "maybe" && sideOf(rsvp) === team.id);
        const noReply = silent.filter((player) => player.default_team_id === team.id);

        const hasAside = out.length + maybe.length + noReply.length > 0;

        return (
          <Card key={team.id}>
            <div className="mb-3 flex items-center justify-between">
              <TeamBadge team={team} />
              <span className="tabular text-xs text-muted">
                {bench.length}
                {goalies === 0 && bench.length > 0 && (
                  <span className="ml-2 text-amber-300">no goalie</span>
                )}
              </span>
            </div>

            <div className={hasAside ? "grid gap-4 sm:grid-cols-2" : ""}>
              <PlayerList rsvps={bench} empty="No one on this side yet." />

              {hasAside && (
                <div className="space-y-3 sm:border-l sm:border-rink-800 sm:pl-4">
                  <AsideGroup label="Maybe" names={namesOf(maybe.map((r) => r.player))} />
                  <AsideGroup label="Out" names={namesOf(out.map((r) => r.player))} />
                  <AsideGroup label="No answer" names={namesOf(noReply)} />
                </div>
              )}
            </div>
          </Card>
        );
      })}

      {(unassigned.length > 0 || silentWithoutTeam.length > 0) && (
        <Card className="sm:col-span-2">
          <h3 className="mb-3 text-sm font-medium text-muted">No team set</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <PlayerList rsvps={unassigned} empty="" muted />
            <AsideGroup label="No answer" names={namesOf(silentWithoutTeam)} />
          </div>
        </Card>
      )}
    </div>
  );
}
