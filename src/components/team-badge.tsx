import type { Team } from "@/lib/types";

/** A team's colour as a dot plus its name — the shirt you're wearing tonight. */
export function TeamBadge({
  team,
  size = "md",
}: {
  team: Pick<Team, "name" | "color">;
  size?: "sm" | "md";
}) {
  const text = size === "sm" ? "text-xs" : "text-sm";
  const dot = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <span className={`inline-flex items-center gap-2 font-medium ${text}`}>
      <span
        className={`${dot} rounded-full ring-1 ring-white/25`}
        style={{ backgroundColor: team.color }}
        aria-hidden
      />
      {team.name}
    </span>
  );
}
