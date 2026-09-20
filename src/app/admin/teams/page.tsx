import { saveTeamCaptain } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { TeamBadge } from "@/components/team-badge";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { getTeams } from "@/lib/queries";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teams" };

const field =
  "w-full rounded-xl border border-rink-700 bg-rink-850 px-3 py-2.5 text-sm outline-none focus:border-ice-500";

export default async function AdminTeamsPage() {
  await requireRole(["admin"], "/admin/teams");

  const teams = await getTeams();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-muted">
          A captain&apos;s photo appears at the edge of the page on wide screens — Blue on the
          left, White on the right.
        </p>
      </div>

      <section>
        <SectionHeading title="Captains" />
        {teams.length > 0 ? (
          <div className="space-y-3">
            {teams.map((team) => (
              <CaptainCard key={team.id} team={team} />
            ))}
          </div>
        ) : (
          <EmptyState>No teams yet.</EmptyState>
        )}
      </section>

      <Card>
        <h2 className="text-sm font-semibold">Where to get a photo address</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>
            Open your repository at{" "}
            <span className="text-chalk">github.com/hazzilionnaire/VHLPRO</span> and go to the{" "}
            <code className="rounded bg-rink-800 px-1.5 py-0.5 text-xs">public</code> folder.
          </li>
          <li>
            <span className="text-chalk">Add file → Upload files</span>, drag the photo in, then{" "}
            <span className="text-chalk">Commit changes</span>.
          </li>
          <li>
            Put <code className="rounded bg-rink-800 px-1.5 py-0.5 text-xs">/yourphoto.jpg</code>{" "}
            in the box above — the name you uploaded, with a slash in front.
          </li>
        </ol>
        <p className="mt-3 text-xs text-muted">
          A full <code className="rounded bg-rink-800 px-1.5 py-0.5 text-xs">https://</code> address
          works too, as long as the image is publicly reachable. Square photos look best; they get
          cropped to a circle.
        </p>
      </Card>
    </div>
  );
}

function CaptainCard({ team }: { team: Team }) {
  return (
    <Card>
      <ActionForm action={saveTeamCaptain} className="space-y-3">
        <input type="hidden" name="teamId" value={team.id} />

        <div className="flex items-center gap-3">
          {team.captain_photo_url ? (
            // The address is whatever the admin typed, so skip next/image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={team.captain_photo_url}
              alt=""
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/15"
            />
          ) : (
            <span className="h-12 w-12 shrink-0 rounded-full border border-dashed border-rink-700" />
          )}
          <TeamBadge team={team} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Captain</label>
            <input
              name="captainName"
              defaultValue={team.captain_name ?? ""}
              placeholder="Name"
              aria-label={`${team.name} captain name`}
              className={field}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Photo</label>
            <input
              name="captainPhotoUrl"
              defaultValue={team.captain_photo_url ?? ""}
              placeholder="/captain.jpg or https://…"
              aria-label={`${team.name} captain photo`}
              className={field}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <SubmitButton variant="ghost">Save</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}
