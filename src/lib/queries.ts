import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  Game,
  GameScore,
  GameStat,
  Player,
  PlayerTotal,
  RsvpWithPlayer,
  Season,
  Team,
  TeamStanding,
} from "@/lib/types";

export type GameWithScores = Game & { scores: Pick<GameScore, "team_id" | "goals">[] };

/** A game plus whether its RSVP window has passed, judged when it was fetched. */
export type GameForRsvp = GameWithScores & { rsvp_closed: boolean };

function rsvpClosed(game: GameWithScores): boolean {
  if (game.status !== "scheduled") return true;
  const deadline = game.rsvp_closes_at ?? game.starts_at;
  return new Date(deadline).getTime() < Date.now();
}

/**
 * Why the database came back empty, or null if it didn't.
 *
 * Every table denies the anon key, so a wrong service role key reads back no
 * rows and no error — a site that looks merely empty. Ask a question we know
 * the answer to, and report what comes back instead.
 */
export async function describeDatabaseFailure(): Promise<string | null> {
  // Ask for something only the service role may do. A public key pasted into
  // the secret slot is still a *valid* key, so reads with it succeed and
  // simply return nothing — the failure has to be provoked to be seen.
  const { error: keyError } = await supabaseAdmin().auth.admin.listUsers({ perPage: 1 });
  if (keyError) {
    return `Supabase refused the server's key (${keyError.message}). It is not the secret key.`;
  }

  const { error } = await supabaseAdmin().from("seasons").select("id").limit(1);
  return error ? error.message : null;
}

export async function getActiveSeason(): Promise<Season | null> {
  const { data } = await supabaseAdmin()
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .maybeSingle<Season>();

  return data ?? null;
}

export async function getTeams(): Promise<Team[]> {
  const { data } = await supabaseAdmin()
    .from("teams")
    .select("*")
    .order("sort_order", { ascending: true })
    .returns<Team[]>();

  return data ?? [];
}

/**
 * A game stays "on now" for a while after the puck drops, so tonight's game
 * doesn't vanish from the home page while it's being played.
 */
const IN_PROGRESS_GRACE_MS = 3 * 60 * 60 * 1000;

/**
 * Games still to come, soonest first.
 *
 * Filtered by the clock, not just by status: a game nobody got round to
 * finalising is in the past whatever its status says, and would otherwise sit
 * at the top of the home page for the rest of the season.
 */
export async function getUpcomingGames(seasonId: string, limit = 10): Promise<GameWithScores[]> {
  const from = new Date(Date.now() - IN_PROGRESS_GRACE_MS).toISOString();

  const { data } = await supabaseAdmin()
    .from("games")
    .select("*, scores:game_scores(team_id, goals)")
    .eq("season_id", seasonId)
    .eq("status", "scheduled")
    .gte("starts_at", from)
    .order("starts_at", { ascending: true })
    .limit(limit)
    .returns<GameWithScores[]>();

  return data ?? [];
}

export async function getNextGame(seasonId: string): Promise<GameWithScores | null> {
  const [next] = await getUpcomingGames(seasonId, 1);
  return next ?? null;
}

/** Finished games, most recent first. */
export async function getRecentResults(seasonId: string, limit = 5): Promise<GameWithScores[]> {
  const { data } = await supabaseAdmin()
    .from("games")
    .select("*, scores:game_scores(team_id, goals)")
    .eq("season_id", seasonId)
    .eq("status", "final")
    .order("starts_at", { ascending: false })
    .limit(limit)
    .returns<GameWithScores[]>();

  return data ?? [];
}

/**
 * The season split the way the schedule page reads it: still to come, and
 * done with. Judged on the clock as well as the status, so a game nobody
 * finalised stops advertising itself as upcoming.
 */
export async function getSeasonSchedule(
  seasonId: string,
): Promise<{ upcoming: GameWithScores[]; played: GameWithScores[] }> {
  const games = await getSeasonGames(seasonId);
  const cutoff = Date.now() - IN_PROGRESS_GRACE_MS;

  const stillToCome = (game: GameWithScores) =>
    game.status === "scheduled" && Date.parse(game.starts_at) >= cutoff;

  return {
    upcoming: games.filter(stillToCome),
    played: games.filter((game) => !stillToCome(game)).reverse(),
  };
}

export async function getSeasonGames(seasonId: string): Promise<GameWithScores[]> {
  const { data } = await supabaseAdmin()
    .from("games")
    .select("*, scores:game_scores(team_id, goals)")
    .eq("season_id", seasonId)
    .order("starts_at", { ascending: true })
    .returns<GameWithScores[]>();

  return data ?? [];
}

export async function getGameById(id: string): Promise<GameWithScores | null> {
  const { data } = await supabaseAdmin()
    .from("games")
    .select("*, scores:game_scores(team_id, goals)")
    .eq("id", id)
    .maybeSingle<GameWithScores>();

  return data ?? null;
}

/** The weekly link resolves a game by its token, never by a guessable id. */
export async function getGameByToken(token: string): Promise<GameForRsvp | null> {
  const { data } = await supabaseAdmin()
    .from("games")
    .select("*, scores:game_scores(team_id, goals)")
    .eq("rsvp_token", token)
    .maybeSingle<GameWithScores>();

  return data ? { ...data, rsvp_closed: rsvpClosed(data) } : null;
}

export async function getRsvps(gameId: string): Promise<RsvpWithPlayer[]> {
  const { data } = await supabaseAdmin()
    .from("rsvps")
    .select("*, player:players(*)")
    .eq("game_id", gameId)
    .returns<RsvpWithPlayer[]>();

  return (data ?? []).sort((a, b) => a.player.full_name.localeCompare(b.player.full_name));
}

export async function getGameStats(gameId: string): Promise<GameStat[]> {
  const { data } = await supabaseAdmin()
    .from("game_stats")
    .select("*")
    .eq("game_id", gameId)
    .returns<GameStat[]>();

  return data ?? [];
}

/** How many players said yes, per game — for the admin games list. */
export async function getInCounts(gameIds: string[]): Promise<Map<string, number>> {
  if (gameIds.length === 0) return new Map();

  const { data } = await supabaseAdmin()
    .from("rsvps")
    .select("game_id")
    .in("game_id", gameIds)
    .eq("status", "in")
    .returns<{ game_id: string }[]>();

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.game_id, (counts.get(row.game_id) ?? 0) + 1);
  }
  return counts;
}

export async function getPlayers(includeInactive = false): Promise<Player[]> {
  let query = supabaseAdmin().from("players").select("*").order("full_name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data } = await query.returns<Player[]>();
  return data ?? [];
}

/**
 * The standings view is built from finished games, so a team appears only once
 * it has played. Carry every team through at 0-0-0 instead, so the table reads
 * as a league waiting to start rather than a page that failed to load.
 */
export async function getStandings(seasonId: string): Promise<TeamStanding[]> {
  const [{ data }, teams] = await Promise.all([
    supabaseAdmin()
      .from("team_standings")
      .select("*")
      .eq("season_id", seasonId)
      .returns<TeamStanding[]>(),
    getTeams(),
  ]);

  const played = new Map((data ?? []).map((row) => [row.team_id, row]));

  const rows: TeamStanding[] = teams.map(
    (team) =>
      played.get(team.id) ?? {
        season_id: seasonId,
        team_id: team.id,
        team_name: team.name,
        team_slug: team.slug,
        color: team.color,
        sort_order: team.sort_order,
        games_played: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        goals_for: 0,
        goals_against: 0,
        points: 0,
      },
  );

  return rows.sort(
    (a, b) => b.points - a.points || b.wins - a.wins || a.sort_order - b.sort_order,
  );
}

/**
 * Every active player, whether or not they've scored — the stats page doubles
 * as the sheet each of them fills in, so nobody should have to be told why
 * their name is missing.
 */
export async function getPlayerTotals(seasonId: string): Promise<PlayerTotal[]> {
  const [{ data }, players] = await Promise.all([
    supabaseAdmin()
      .from("player_totals")
      .select("*")
      .eq("season_id", seasonId)
      .returns<PlayerTotal[]>(),
    getPlayers(),
  ]);

  const recorded = new Map((data ?? []).map((row) => [row.player_id, row]));

  const rows: PlayerTotal[] = players.map(
    (player) =>
      recorded.get(player.id) ?? {
        season_id: seasonId,
        player_id: player.id,
        full_name: player.full_name,
        position: player.position,
        jersey_number: player.jersey_number,
        games_played: 0,
        goals: 0,
        assists: 0,
        points: 0,
        pim: 0,
        goals_against: 0,
        shots_against: 0,
      },
  );

  return rows.sort(
    (a, b) => b.points - a.points || b.goals - a.goals || a.full_name.localeCompare(b.full_name),
  );
}

/**
 * Games a player can file or amend a line for — anything not cancelled, most
 * recent first, so the game just played is the one at the top.
 */
export async function getGamesForStatEntry(seasonId: string): Promise<Game[]> {
  const { data } = await supabaseAdmin()
    .from("games")
    .select("*")
    .eq("season_id", seasonId)
    .neq("status", "cancelled")
    .returns<Game[]>();

  // Sorting by date alone put the last Friday of the season at the top, so
  // the form opened on a game months away and quietly took entries for it.
  // Games already played come first, most recent of them first, because
  // that's the one somebody is filling in. Fixtures still to come follow,
  // soonest first.
  const now = Date.now();

  return (data ?? []).slice().sort((a, b) => {
    const aPlayed = Date.parse(a.starts_at) <= now;
    const bPlayed = Date.parse(b.starts_at) <= now;

    if (aPlayed !== bPlayed) return aPlayed ? -1 : 1;

    return aPlayed
      ? Date.parse(b.starts_at) - Date.parse(a.starts_at)
      : Date.parse(a.starts_at) - Date.parse(b.starts_at);
  });
}

/** Every line recorded this season, so the entry form can prefill any game. */
export async function getSeasonStats(seasonId: string): Promise<GameStat[]> {
  const games = await getGamesForStatEntry(seasonId);
  if (games.length === 0) return [];

  const { data } = await supabaseAdmin()
    .from("game_stats")
    .select("*")
    .in(
      "game_id",
      games.map((game) => game.id),
    )
    .returns<GameStat[]>();

  return data ?? [];
}
