import Link from "next/link";
import { notFound } from "next/navigation";

import {
  autoSplitTeams,
  saveResult,
  saveTeamAssignments,
  updateGame,
  writeNewsNow,
} from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CopyLink } from "@/components/copy-link";
import { TeamBadge } from "@/components/team-badge";
import { Card, EmptyState, Pill, SectionHeading } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import {
  LEAGUE_TIME_ZONE,
  formatGameDateLong,
  utcIsoToLeagueLocal,
} from "@/lib/datetime";
import { getGameById, getGameStats, getRsvps, getTeams } from "@/lib/queries";
import type { GameStat, RsvpWithPlayer, Team } from "@/lib/types";
import { DeleteGame } from "./delete-game";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500";
const numberField =
  "w-16 rounded-lg border border-rink-700 bg-rink-850 px-2 py-1.5 text-center text-sm tabular outline-none focus:border-ice-500";

export default async function AdminGamePage({
  params,
}: PageProps<"/admin/games/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  const game = await getGameById(id);

  if (!game) notFound();

  const [teams, rsvps, stats] = await Promise.all([
    getTeams(),
    getRsvps(game.id),
    getGameStats(game.id),
  ]);

  const isAdmin = viewer?.role === "admin";
  const playing = rsvps.filter((rsvp) => rsvp.status === "in");

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin" className="text-xs text-muted hover:text-chalk">
          ← Games
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {formatGameDateLong(game.starts_at)}
          </h1>
          <div className="flex items-center gap-3">
            <Pill
              tone={
                game.status === "final"
                  ? "neutral"
                  : game.status === "cancelled"
                    ? "bad"
                    : "good"
              }
            >
              {game.status}
            </Pill>
            <CopyLink path={`/rsvp/${game.rsvp_token}`} />
          </div>
        </div>
      </div>

      {isAdmin && (
        <section>
          <SectionHeading title="Details" />
          <Card>
            <ActionForm action={updateGame} className="space-y-4">
              <input type="hidden" name="gameId" value={game.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startsAt"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Puck drop
                  </label>
                  <input
                    id="startsAt"
                    name="startsAt"
                    type="datetime-local"
                    required
                    defaultValue={utcIsoToLeagueLocal(game.starts_at)}
                    className={field}
                  />
                </div>
                <div>
                  <label
                    htmlFor="rsvpClosesAt"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    RSVP closes
                  </label>
                  <input
                    id="rsvpClosesAt"
                    name="rsvpClosesAt"
                    type="datetime-local"
                    defaultValue={
                      game.rsvp_closes_at
                        ? utcIsoToLeagueLocal(game.rsvp_closes_at)
                        : ""
                    }
                    className={field}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="location"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Rink
                  </label>
                  <input
                    id="location"
                    name="location"
                    defaultValue={game.location ?? ""}
                    className={field}
                  />
                </div>
                <div>
                  <label
                    htmlFor="status"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={game.status}
                    className={field}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="final">Final</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  defaultValue={game.notes ?? ""}
                  className={field}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  Times in {LEAGUE_TIME_ZONE.replace("_", " ")}.
                </p>
                <SubmitButton>Save details</SubmitButton>
              </div>
            </ActionForm>

            <div className="mt-5 border-t border-rink-800 pt-4">
              <DeleteGame
                gameId={game.id}
                label={formatGameDateLong(game.starts_at)}
              />
            </div>
          </Card>
        </section>
      )}

      {isAdmin && (
        <section>
          <SectionHeading
            title={`Blue vs White · ${playing.length} in`}
            action={
              <ActionForm action={autoSplitTeams}>
                <input type="hidden" name="gameId" value={game.id} />
                <SubmitButton variant="ghost" className="px-3 py-1.5 text-xs">
                  Even the sides
                </SubmitButton>
              </ActionForm>
            }
          />

          {playing.length > 0 ? (
            <Card>
              <ActionForm action={saveTeamAssignments}>
                <input type="hidden" name="gameId" value={game.id} />
                <ul className="divide-y divide-rink-800">
                  {playing.map((rsvp) => (
                    <AllocationRow key={rsvp.id} rsvp={rsvp} teams={teams} />
                  ))}
                </ul>
                <div className="mt-4 flex justify-end">
                  <SubmitButton>Save teams</SubmitButton>
                </div>
              </ActionForm>
            </Card>
          ) : (
            <EmptyState>Nobody has RSVP&apos;d yes yet.</EmptyState>
          )}
        </section>
      )}

      <section>
        <SectionHeading
          title="Result"
          action={
            isAdmin ? (
              <ActionForm action={writeNewsNow}>
                <input type="hidden" name="gameId" value={game.id} />
                <SubmitButton variant="ghost" className="px-3 py-1.5 text-xs">
                  Write the news line
                </SubmitButton>
              </ActionForm>
            ) : null
          }
        />
        {playing.length > 0 ? (
          <Card>
            <ActionForm action={saveResult}>
              <input type="hidden" name="gameId" value={game.id} />

              <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
                Games won
              </p>
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                {teams.map((team) => (
                  <label
                    key={team.id}
                    className="flex items-center justify-between rounded-xl border border-rink-700 px-4 py-3"
                  >
                    <TeamBadge team={team} />
                    <input
                      type="number"
                      min={0}
                      name={`score_${team.id}`}
                      defaultValue={
                        game.scores.find((s) => s.team_id === team.id)?.goals ??
                        0
                      }
                      className={numberField}
                    />
                  </label>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-rink-800 text-xs tracking-wider text-muted uppercase">
                    <tr>
                      <th className="py-2 text-left font-medium">Player</th>
                      <th className="px-2 py-2 text-left font-medium">Team</th>
                      <th className="px-2 py-2 text-center font-medium">G</th>
                      <th className="px-2 py-2 text-center font-medium">A</th>
                      <th className="px-2 py-2 text-center font-medium">PIM</th>
                      <th className="px-2 py-2 text-center font-medium">GA</th>
                      <th className="px-2 py-2 text-center font-medium">SA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rink-800">
                    {playing.map((rsvp) => (
                      <StatRow
                        key={rsvp.id}
                        rsvp={rsvp}
                        teams={teams}
                        stat={
                          stats.find(
                            (row) => row.player_id === rsvp.player_id,
                          ) ?? null
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  Saving marks the game final and updates standings and stats.
                </p>
                <SubmitButton>Save result</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        ) : (
          <EmptyState>
            No one is down as playing, so there&apos;s nothing to score yet.
          </EmptyState>
        )}
      </section>
    </div>
  );
}

function AllocationRow({
  rsvp,
  teams,
}: {
  rsvp: RsvpWithPlayer;
  teams: Team[];
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5">
      <span className="flex items-baseline gap-2">
        <span className="font-medium">{rsvp.player.full_name}</span>
        {rsvp.player.position === "goalie" && (
          <span className="text-xs text-ice-400">Goalie</span>
        )}
        {rsvp.note && <span className="text-xs text-muted">· {rsvp.note}</span>}
      </span>

      <span className="flex items-center gap-1.5">
        {teams.map((team) => (
          <label
            key={team.id}
            className="cursor-pointer rounded-lg border border-rink-700 px-2.5 py-1 text-xs has-checked:border-ice-500 has-checked:bg-ice-600/15 has-checked:text-ice-400"
          >
            <input
              type="radio"
              name={`team_${rsvp.id}`}
              value={team.id}
              defaultChecked={rsvp.team_id === team.id}
              className="sr-only"
            />
            {team.name}
          </label>
        ))}
        <label className="cursor-pointer rounded-lg border border-rink-700 px-2.5 py-1 text-xs text-muted has-checked:border-ice-500 has-checked:text-chalk">
          <input
            type="radio"
            name={`team_${rsvp.id}`}
            value=""
            defaultChecked={!rsvp.team_id}
            className="sr-only"
          />
          —
        </label>
      </span>
    </li>
  );
}

function StatRow({
  rsvp,
  teams,
  stat,
}: {
  rsvp: RsvpWithPlayer;
  teams: Team[];
  stat: GameStat | null;
}) {
  const isGoalie = rsvp.player.position === "goalie";
  const playerId = rsvp.player_id;

  return (
    <tr>
      <td className="py-2 pr-2 font-medium">{rsvp.player.full_name}</td>
      <td className="px-2 py-2">
        <select
          name={`statteam_${playerId}`}
          defaultValue={stat?.team_id ?? rsvp.team_id ?? ""}
          className="rounded-lg border border-rink-700 bg-rink-850 px-2 py-1.5 text-sm outline-none focus:border-ice-500"
        >
          <option value="">—</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          min={0}
          name={`stat_${playerId}_goals`}
          defaultValue={stat?.goals ?? 0}
          className={numberField}
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          min={0}
          name={`stat_${playerId}_assists`}
          defaultValue={stat?.assists ?? 0}
          className={numberField}
        />
      </td>
      <td className="px-2 py-2 text-center">
        <input
          type="number"
          min={0}
          name={`stat_${playerId}_pim`}
          defaultValue={stat?.pim ?? 0}
          className={numberField}
        />
      </td>
      <td className="px-2 py-2 text-center">
        {isGoalie ? (
          <input
            type="number"
            min={0}
            name={`stat_${playerId}_goals-against`}
            defaultValue={stat?.goals_against ?? ""}
            className={numberField}
          />
        ) : (
          <span className="text-rink-600">—</span>
        )}
      </td>
      <td className="px-2 py-2 text-center">
        {isGoalie ? (
          <input
            type="number"
            min={0}
            name={`stat_${playerId}_shots-against`}
            defaultValue={stat?.shots_against ?? ""}
            className={numberField}
          />
        ) : (
          <span className="text-rink-600">—</span>
        )}
      </td>
    </tr>
  );
}
