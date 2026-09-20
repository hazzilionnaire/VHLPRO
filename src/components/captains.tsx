import { getTeams } from "@/lib/queries";
import type { Team } from "@/lib/types";

/**
 * The two captains, shown two ways.
 *
 * On a wide screen they stand either side of the page, in margins that would
 * otherwise be empty. Narrower than that there are no margins to spare, so
 * they become a short row above the content instead — a face in the gutter of
 * a phone would squeeze the page or push it sideways.
 *
 * The rails are marked decorative because the row carries the same names, and
 * a screen reader shouldn't hear both.
 */
export async function Captains() {
  const teams = await getTeams().catch(() => []);
  const withPhotos = teams.filter((team) => team.captain_photo_url);

  if (withPhotos.length === 0) return null;

  const [left, right] = withPhotos;

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-y-0 z-0 hidden w-full xl:block">
        {left && <Rail team={left} side="left" />}
        {right && <Rail team={right} side="right" />}
      </div>

      <div className="border-b border-rink-800 xl:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-center gap-10 px-4 py-4 sm:px-6">
          {withPhotos.map((team) => (
            <Strip key={team.id} team={team} />
          ))}
        </div>
      </div>
    </>
  );
}

function CaptainPhoto({ team, className }: { team: Team; className: string }) {
  return (
    // The address is whatever the admin entered, so next/image's loader isn't
    // worth configuring for it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={team.captain_photo_url ?? ""}
      alt=""
      className={`rounded-full object-cover ring-2 ring-white/15 ${className}`}
    />
  );
}

function TeamLine({ team, size }: { team: Team; size: "sm" | "xs" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${
        size === "sm" ? "text-sm" : "text-xs"
      }`}
    >
      <span
        className="h-2 w-2 rounded-full ring-1 ring-white/25"
        style={{ backgroundColor: team.color }}
      />
      {team.name}
    </span>
  );
}

function Rail({ team, side }: { team: Team; side: "left" | "right" }) {
  return (
    <figure
      className={`absolute top-1/2 w-40 -translate-y-1/2 text-center ${
        side === "left" ? "left-6" : "right-6"
      }`}
    >
      <CaptainPhoto team={team} className="mx-auto h-32 w-32 shadow-lg shadow-black/40" />
      <figcaption className="mt-3">
        <TeamLine team={team} size="sm" />
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

function Strip({ team }: { team: Team }) {
  return (
    <figure className="flex items-center gap-2.5">
      <CaptainPhoto team={team} className="h-11 w-11 shrink-0" />
      <figcaption className="text-left leading-tight">
        <TeamLine team={team} size="xs" />
        {team.captain_name && (
          <span className="mt-0.5 block text-xs text-muted">{team.captain_name}</span>
        )}
        <span className="block text-[10px] tracking-wider text-muted uppercase">Captain</span>
      </figcaption>
    </figure>
  );
}
