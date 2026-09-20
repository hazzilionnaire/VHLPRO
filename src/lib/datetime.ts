const DEFAULT_TIME_ZONE = "America/Toronto";

/**
 * A hosting dashboard will happily hold an environment variable with an empty
 * value, and `??` only steps aside for a missing one — so an empty box became
 * a time zone named "", which every date call then threw on. Treat blank as
 * unset, and check the name is one Intl actually knows before trusting it.
 */
function resolveTimeZone(): string {
  const configured = process.env.NEXT_PUBLIC_LEAGUE_TIME_ZONE?.trim();
  if (!configured) return DEFAULT_TIME_ZONE;

  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: configured });
    return configured;
  } catch {
    console.warn(
      `Ignoring NEXT_PUBLIC_LEAGUE_TIME_ZONE="${configured}": not a time zone. Using ${DEFAULT_TIME_ZONE}.`,
    );
    return DEFAULT_TIME_ZONE;
  }
}

/**
 * Game times are stored as UTC timestamps and always shown in the league's own
 * time zone, so a player opening the link on holiday still sees puck drop in
 * rink time. Override with NEXT_PUBLIC_LEAGUE_TIME_ZONE.
 */
export const LEAGUE_TIME_ZONE = resolveTimeZone();

function parts(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: LEAGUE_TIME_ZONE, ...options }).format(date);
}

export function formatGameDate(iso: string): string {
  return parts(new Date(iso), { weekday: "short", month: "short", day: "numeric" });
}

export function formatGameDateLong(iso: string): string {
  return parts(new Date(iso), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatGameTime(iso: string): string {
  return parts(new Date(iso), { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatGameDateTime(iso: string): string {
  return `${formatGameDate(iso)} · ${formatGameTime(iso)}`;
}

/** How far off the game is, for the "next game" card. */
export function describeCountdown(iso: string, now = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime();
  if (diffMs <= 0) return "Under way";

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return `In ${Math.max(1, Math.round(diffMs / 60_000))} min`;
  if (hours < 24) return `In ${hours} hour${hours === 1 ? "" : "s"}`;

  const days = Math.round(hours / 24);
  return `In ${days} day${days === 1 ? "" : "s"}`;
}

function zoneOffsetMs(date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const field: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") field[part.type] = Number(part.value);
  }

  const asUtc = Date.UTC(
    field.year,
    field.month - 1,
    field.day,
    field.hour % 24,
    field.minute,
    field.second,
  );

  return asUtc - date.getTime();
}

/** "2026-09-24T21:15" typed into the admin form -> the matching UTC instant. */
export function leagueLocalToUtcIso(value: string): string {
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes so times that land near a DST change settle on the right offset.
  let timestamp = naive - zoneOffsetMs(new Date(naive));
  timestamp = naive - zoneOffsetMs(new Date(timestamp));

  return new Date(timestamp).toISOString();
}

/** The reverse, for pre-filling a <input type="datetime-local">. */
export function utcIsoToLeagueLocal(iso: string): string {
  const date = new Date(iso);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEAGUE_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const field: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") field[part.type] = part.value;
  }

  const hour = field.hour === "24" ? "00" : field.hour;
  return `${field.year}-${field.month}-${field.day}T${hour}:${field.minute}`;
}
