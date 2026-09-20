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

/** Games still to be played, soonest first. */
export async function getUpcomingGames(seasonId: string, limit = 10): Promise<GameWithScores[]> {
  const { data } = await supabaseAdmin()
    .from("games")
    .select("*, scores:game_scores(team_id, goals)")
    .eq("season_id", seasonId)
    .eq("status", "scheduled")
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

export async function getPlayerTotals(seasonId: string): Promise<PlayerTotal[]> {
  const { data } = await supabaseAdmin()
    .from("player_totals")
    .select("*")
    .eq("season_id", seasonId)
    .returns<PlayerTotal[]>();

  return (data ?? []).sort(
    (a, b) => b.points - a.points || b.goals - a.goals || a.full_name.localeCompare(b.full_name),
  );
}
