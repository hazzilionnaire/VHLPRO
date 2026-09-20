import { TeamBadge } from "@/components/team-badge";
import { Card } from "@/components/ui";
import type { RsvpWithPlayer, Team } from "@/lib/types";

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

/** Both benches side by side, plus anyone still waiting for a side. */
export function TeamRosters({ rsvps, teams }: { rsvps: RsvpWithPlayer[]; teams: Team[] }) {
  const unassigned = rsvps.filter((rsvp) => !rsvp.team_id);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {teams.map((team) => {
        const bench = rsvps.filter((rsvp) => rsvp.team_id === team.id);
        const goalies = bench.filter((rsvp) => rsvp.player.position === "goalie").length;

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
            <PlayerList rsvps={bench} empty="No one on this side yet." />
          </Card>
        );
      })}

      {unassigned.length > 0 && (
        <Card className="sm:col-span-2">
          <h3 className="mb-3 text-sm font-medium text-muted">Not yet assigned</h3>
          <PlayerList rsvps={unassigned} empty="" muted />
        </Card>
      )}
    </div>
  );
}
