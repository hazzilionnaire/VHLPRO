import { savePlayer, setPlayerActive } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { getPlayers, getTeams } from "@/lib/queries";
import type { Player, Team } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Players" };

const field =
  "rounded-xl border border-rink-700 bg-rink-850 px-3 py-2 text-sm outline-none focus:border-ice-500";

export default async function AdminPlayersPage() {
  await requireRole(["admin"], "/admin/players");

  const [players, teams] = await Promise.all([getPlayers(true), getTeams()]);
  const active = players.filter((player) => player.is_active);
  const inactive = players.filter((player) => !player.is_active);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Players</h1>
        <p className="mt-1 text-sm text-muted">
          This roster is the RSVP list. Only the people here can answer the weekly link, so add
          anyone new before you send it out. A player&apos;s team is applied automatically when
          they RSVP; you can still override it for a single game.
        </p>
      </div>

      <section>
        <SectionHeading title="Add a player" />
        <Card>
          <ActionForm action={savePlayer} className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">
                Name
              </label>
              <input id="fullName" name="fullName" required className={`w-full ${field}`} />
            </div>
            <div className="min-w-48 flex-1">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="email" name="email" type="email" className={`w-full ${field}`} />
            </div>
            <div>
              <label htmlFor="position" className="mb-1.5 block text-sm font-medium">
                Position
              </label>
              <select id="position" name="position" defaultValue="skater" className={field}>
                <option value="skater">Skater</option>
                <option value="goalie">Goalie</option>
              </select>
            </div>
            <div>
              <label htmlFor="defaultTeamId" className="mb-1.5 block text-sm font-medium">
                Team
              </label>
              <select id="defaultTeamId" name="defaultTeamId" defaultValue="" className={field}>
                <option value="">No team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label htmlFor="jerseyNumber" className="mb-1.5 block text-sm font-medium">
                Number
              </label>
              <input
                id="jerseyNumber"
                name="jerseyNumber"
                type="number"
                min={0}
                max={99}
                className={`w-full ${field}`}
              />
            </div>
            <SubmitButton>Add</SubmitButton>
          </ActionForm>
        </Card>
      </section>

      <section>
        <SectionHeading title={`Roster · ${active.length}`} />
        {active.length > 0 ? (
          <Card className="divide-y divide-rink-800 p-0">
            {active.map((player) => (
              <PlayerRow key={player.id} player={player} teams={teams} />
            ))}
          </Card>
        ) : (
          <EmptyState>Nobody on the roster yet.</EmptyState>
        )}
      </section>

      {inactive.length > 0 && (
        <section>
          <SectionHeading title={`Inactive · ${inactive.length}`} />
          <Card className="divide-y divide-rink-800 p-0">
            {inactive.map((player) => (
              <PlayerRow key={player.id} player={player} teams={teams} />
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

function PlayerRow({ player, teams }: { player: Player; teams: Team[] }) {
  return (
    <div className="px-5 py-4">
      <ActionForm action={savePlayer} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="playerId" value={player.id} />
        <input type="hidden" name="isActive" value={String(player.is_active)} />

        <div className="min-w-44 flex-1">
          <input
            name="fullName"
            defaultValue={player.full_name}
            aria-label="Name"
            className={`w-full ${field}`}
          />
        </div>
        <div className="min-w-44 flex-1">
          <input
            name="email"
            type="email"
            placeholder="No email"
            defaultValue={player.email ?? ""}
            aria-label="Email"
            className={`w-full ${field}`}
          />
        </div>
        <select
          name="position"
          defaultValue={player.position}
          aria-label="Position"
          className={field}
        >
          <option value="skater">Skater</option>
          <option value="goalie">Goalie</option>
        </select>
        <select
          name="defaultTeamId"
          defaultValue={player.default_team_id ?? ""}
          aria-label="Team"
          className={field}
        >
          <option value="">No team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <input
          name="jerseyNumber"
          type="number"
          min={0}
          max={99}
          defaultValue={player.jersey_number ?? ""}
          aria-label="Jersey number"
          className={`w-20 ${field}`}
        />
        <SubmitButton variant="ghost">Save</SubmitButton>
      </ActionForm>

      <ActionForm action={setPlayerActive} className="mt-2">
        <input type="hidden" name="playerId" value={player.id} />
        <input type="hidden" name="active" value={player.is_active ? "false" : "true"} />
        <button type="submit" className="text-xs text-muted transition hover:text-chalk">
          {player.is_active ? "Move to inactive" : "Bring back to the roster"}
        </button>
      </ActionForm>
    </div>
  );
}
