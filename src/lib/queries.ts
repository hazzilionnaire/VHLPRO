import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  Game,
  GameScore,
  Player,
  PlayerTotal,
  RsvpWithPlayer,
  Season,
  Team,
  TeamStanding,
} from "@/lib/types";

export type GameWithScores = Game & { scores: Pick<GameScore, "team_id" | "goals">[] };

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
export async function getGameByToken(token: string): Promise<GameWithScores | null> {
  const { data } = await supabaseAdmin()
    .from("games")
    .select("*, scores:game_scores(team_id, goals)")
    .eq("rsvp_token", token)
    .maybeSingle<GameWithScores>();

  return data ?? null;
}

export async function getRsvps(gameId: string): Promise<RsvpWithPlayer[]> {
  const { data } = await supabaseAdmin()
    .from("rsvps")
    .select("*, player:players(*)")
    .eq("game_id", gameId)
    .returns<RsvpWithPlayer[]>();

  return (data ?? []).sort((a, b) => a.player.full_name.localeCompare(b.player.full_name));
}

export async function getPlayers(includeInactive = false): Promise<Player[]> {
  let query = supabaseAdmin().from("players").select("*").order("full_name", { ascending: true });

  if (!includeInactive) query = query.eq("is_active", true);

  const { data } = await query.returns<Player[]>();
  return data ?? [];
}

export async function getStandings(seasonId: string): Promise<TeamStanding[]> {
  const { data } = await supabaseAdmin()
    .from("team_standings")
    .select("*")
    .eq("season_id", seasonId)
    .returns<TeamStanding[]>();

  return (data ?? []).sort((a, b) => b.points - a.points || b.wins - a.wins || a.sort_order - b.sort_order);
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
