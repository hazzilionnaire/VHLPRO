import Link from "next/link";

import { createWeeklyGames } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { LEAGUE_TIME_ZONE } from "@/lib/datetime";
import { getActiveSeason, getSeasonGames } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule a run of games" };

const field =
  "w-full rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500";

/** The next time this weekday comes round, as a value for a date input. */
function nextWeekday(weekday: number): string {
  const today = new Date();
  const ahead = (weekday - today.getUTCDay() + 7) % 7 || 7;
  return new Date(today.getTime() + ahead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default async function ScheduleRunPage() {
  await requireRole(["admin"], "/admin/games/schedule");

  const season = await getActiveSeason();
  const games = season ? await getSeasonGames(season.id) : [];

  // Most leagues keep the same sheet of ice all year, so offer the last one used.
  const lastLocation = [...games].reverse().find((game) => game.location)?.location ?? "";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-muted hover:text-chalk">
          ← Games
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Schedule a run of games</h1>
        <p className="mt-1 text-sm text-muted">
          One game a week, same time and rink, from the first date until the last. Times are in{" "}
          {LEAGUE_TIME_ZONE.replace("_", " ")}.
        </p>
      </div>

      <Card>
        <ActionForm action={createWeeklyGames} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstDate" className="mb-1.5 block text-sm font-medium">
                First game
              </label>
              <input
                id="firstDate"
                name="firstDate"
                type="date"
                required
                defaultValue={nextWeekday(5)}
                className={field}
              />
              <p className="mt-1 text-xs text-muted">The weekday comes from this date.</p>
            </div>

            <div>
              <label htmlFor="time" className="mb-1.5 block text-sm font-medium">
                Puck drop
              </label>
              <input
                id="time"
                name="time"
                type="time"
                required
                defaultValue="17:15"
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="untilDate" className="mb-1.5 block text-sm font-medium">
              Repeat weekly until
            </label>
            <input
              id="untilDate"
              name="untilDate"
              type="date"
              required
              defaultValue={season?.ends_on ?? ""}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="location" className="mb-1.5 block text-sm font-medium">
              Rink
            </label>
            <input
              id="location"
              name="location"
              defaultValue={lastLocation}
              placeholder="Rink name, sheet"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
              Notes <span className="font-normal text-muted">(on every game in the run)</span>
            </label>
            <textarea id="notes" name="notes" rows={2} className={field} />
          </div>

          <p className="text-xs text-muted">
            Nights already on the schedule are left alone, so you can safely run this again to
            extend the season. Each game gets its own RSVP link, and you can edit or delete any of
            them afterwards.
          </p>

          <SubmitButton className="w-full">Create the games</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
