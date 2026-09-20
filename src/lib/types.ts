export type PlayerPosition = "skater" | "goalie";
export type RsvpStatus = "in" | "out" | "maybe";
export type GameStatus = "scheduled" | "final" | "cancelled";
export type AppRole = "admin" | "captain" | "player";

export type Team = {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  captain_name: string | null;
  captain_photo_url: string | null;
};

export type Season = {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

export type Player = {
  id: string;
  full_name: string;
  email: string | null;
  position: PlayerPosition;
  jersey_number: number | null;
  is_active: boolean;
  user_id: string | null;
  /** The side this player normally skates for; fills in their RSVP. */
  default_team_id: string | null;
};

export type Game = {
  id: string;
  season_id: string;
  starts_at: string;
  location: string | null;
  status: GameStatus;
  rsvp_token: string;
  rsvp_closes_at: string | null;
  /** Unused: the sides are public as they fill in. Kept so the gate can return. */
  rosters_published: boolean;
  notes: string | null;
};

export type Rsvp = {
  id: string;
  game_id: string;
  player_id: string;
  status: RsvpStatus;
  team_id: string | null;
  note: string | null;
  responded_at: string;
};

export type GameScore = {
  game_id: string;
  team_id: string;
  goals: number;
};

export type GameStat = {
  id: string;
  game_id: string;
  player_id: string;
  team_id: string | null;
  goals: number;
  assists: number;
  pim: number;
  goals_against: number | null;
  shots_against: number | null;
};

export type Profile = {
  id: string;
  role: AppRole;
  player_id: string | null;
};

export type TeamStanding = {
  season_id: string;
  team_id: string;
  team_name: string;
  team_slug: string;
  color: string;
  sort_order: number;
  games_played: number;
  wins: number;
  losses: number;
  ties: number;
  goals_for: number;
  goals_against: number;
  points: number;
};

export type PlayerTotal = {
  season_id: string;
  player_id: string;
  full_name: string;
  position: PlayerPosition;
  jersey_number: number | null;
  games_played: number;
  goals: number;
  assists: number;
  points: number;
  pim: number;
  goals_against: number;
  shots_against: number;
};

/** An RSVP joined to the player who gave it — what the roster screens render. */
export type RsvpWithPlayer = Rsvp & { player: Player };
