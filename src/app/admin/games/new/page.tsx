import Link from "next/link";

import { createGame } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { LEAGUE_TIME_ZONE } from "@/lib/datetime";

export const dynamic = "force-dynamic";
export const metadata = { title: "New game" };

const field =
  "w-full rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500";

export default async function NewGamePage() {
  await requireRole(["admin"], "/admin/games/new");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-muted hover:text-chalk">
          ← Games
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">New game</h1>
        <p className="mt-1 text-sm text-muted">Times are in {LEAGUE_TIME_ZONE.replace("_", " ")}.</p>
      </div>

      <Card>
        <ActionForm action={createGame} className="space-y-4">
          <div>
            <label htmlFor="startsAt" className="mb-1.5 block text-sm font-medium">
              Puck drop
            </label>
            <input id="startsAt" name="startsAt" type="datetime-local" required className={field} />
          </div>

          <div>
            <label htmlFor="rsvpClosesAt" className="mb-1.5 block text-sm font-medium">
              RSVP closes <span className="font-normal text-muted">(optional)</span>
            </label>
            <input id="rsvpClosesAt" name="rsvpClosesAt" type="datetime-local" className={field} />
            <p className="mt-1 text-xs text-muted">
              Leave empty and RSVP stays open until puck drop.
            </p>
          </div>

          <div>
            <label htmlFor="location" className="mb-1.5 block text-sm font-medium">
              Rink
            </label>
            <input id="location" name="location" placeholder="Rink name, sheet" className={field} />
          </div>

          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium">
              Notes <span className="font-normal text-muted">(shown on the RSVP page)</span>
            </label>
            <textarea id="notes" name="notes" rows={3} className={field} />
          </div>

          <SubmitButton className="w-full">Create game</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
