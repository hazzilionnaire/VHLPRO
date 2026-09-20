import { getTeams } from "@/lib/queries";
import type { Team } from "@/lib/types";

/**
 * The two captains, one either side of the page.
 *
 * Only on screens wide enough to have margins going spare — below that the
 * content needs every pixel, and a face in the gutter would push the page
 * sideways. They sit behind the content and ignore the pointer, so they can
 * never get in the way of a form.
 */
export async function CaptainRails() {
  const teams = await getTeams().catch(() => []);
  const withPhotos = teams.filter((team) => team.captain_photo_url);

  if (withPhotos.length === 0) return null;

  const [left, right] = withPhotos;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-y-0 z-0 hidden w-full xl:block">
      {left && <Rail team={left} side="left" />}
      {right && <Rail team={right} side="right" />}
    </div>
  );
}

function Rail({ team, side }: { team: Team; side: "left" | "right" }) {
  return (
    <figure
      className={`absolute top-1/2 -translate-y-1/2 w-40 text-center ${
        side === "left" ? "left-6" : "right-6"
      }`}
    >
      {/* Arbitrary external photos, so next/image's loader isn't worth the
          configuration here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={team.captain_photo_url ?? ""}
        alt=""
        className="mx-auto h-32 w-32 rounded-full object-cover shadow-lg shadow-black/40 ring-2"
        style={{ borderColor: team.color, outlineColor: team.color }}
      />
      <figcaption className="mt-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <span
            className="h-2 w-2 rounded-full ring-1 ring-white/25"
            style={{ backgroundColor: team.color }}
          />
          {team.name}
        </span>
        {team.captain_name && (
          <span className="mt-0.5 block text-xs text-muted">{team.captain_name}</span>
        )}
        <span className="mt-0.5 block text-[10px] tracking-wider text-muted uppercase">
          Captain
        </span>
      </figcaption>
    </figure>
  );
}
