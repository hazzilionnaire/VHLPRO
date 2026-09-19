-- VHL Pro — initial schema
--
-- Access model: every table has RLS enabled with no policies, so the anon and
-- authenticated keys can read nothing directly. All reads and writes go through
-- the Next.js server (server components and server actions) using the service
-- role key, which bypasses RLS. Authorization lives in the app layer.

create extension if not exists pgcrypto;

create type player_position as enum ('skater', 'goalie');
create type rsvp_status as enum ('in', 'out', 'maybe');
create type game_status as enum ('scheduled', 'final', 'cancelled');
create type app_role as enum ('admin', 'captain', 'player');

-- Blue vs White, but stored as rows so more teams can be added later.
create table teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  color       text not null default '#64748b',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  starts_on   date,
  ends_on     date,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- At most one season can be active at a time.
create unique index seasons_single_active on seasons (is_active) where is_active;

create table players (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  email          text,
  position       player_position not null default 'skater',
  jersey_number  integer check (jersey_number between 0 and 99),
  is_active      boolean not null default true,
  user_id        uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);

create unique index players_email_key on players (lower(email)) where email is not null;
create index players_active_name on players (is_active, full_name);

create table games (
  id                 uuid primary key default gen_random_uuid(),
  season_id          uuid not null references seasons (id) on delete cascade,
  starts_at          timestamptz not null,
  location           text,
  status             game_status not null default 'scheduled',
  -- The unguessable slug behind the weekly link shared with the league.
  rsvp_token         text not null unique default encode(gen_random_bytes(12), 'hex'),
  rsvp_closes_at     timestamptz,
  -- Admin flips this once Blue/White allocation is ready to be seen.
  rosters_published  boolean not null default false,
  notes              text,
  created_at         timestamptz not null default now()
);

create index games_season_start on games (season_id, starts_at);

-- One row per player per game: their answer, and the team the admin gave them.
create table rsvps (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references games (id) on delete cascade,
  player_id     uuid not null references players (id) on delete cascade,
  status        rsvp_status not null,
  team_id       uuid references teams (id) on delete set null,
  note          text,
  responded_at  timestamptz not null default now(),
  unique (game_id, player_id)
);

create index rsvps_game_status on rsvps (game_id, status);

create table game_scores (
  game_id  uuid not null references games (id) on delete cascade,
  team_id  uuid not null references teams (id) on delete cascade,
  goals    integer not null default 0 check (goals >= 0),
  primary key (game_id, team_id)
);

create table game_stats (
  id             uuid primary key default gen_random_uuid(),
  game_id        uuid not null references games (id) on delete cascade,
  player_id      uuid not null references players (id) on delete cascade,
  team_id        uuid references teams (id) on delete set null,
  goals          integer not null default 0 check (goals >= 0),
  assists        integer not null default 0 check (assists >= 0),
  pim            integer not null default 0 check (pim >= 0),
  goals_against  integer check (goals_against >= 0),
  shots_against  integer check (shots_against >= 0),
  unique (game_id, player_id)
);

create index game_stats_player on game_stats (player_id);

-- Who can sign in and what they may do. Players do not need an account to RSVP.
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        app_role not null default 'player',
  player_id   uuid references players (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Give every new sign-in a profile so the app always has a role to check.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, player_id)
  values (
    new.id,
    'player',
    (select p.id from public.players p where lower(p.email) = lower(new.email))
  )
  on conflict (id) do nothing;

  update public.players
     set user_id = new.id
   where lower(email) = lower(new.email)
     and user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Season record for each team, from finished games only.
create view team_standings as
with results as (
  select
    g.season_id,
    gs.game_id,
    gs.team_id,
    gs.goals as goals_for,
    (select sum(o.goals) from game_scores o
      where o.game_id = gs.game_id and o.team_id <> gs.team_id) as goals_against
  from game_scores gs
  join games g on g.id = gs.game_id
  where g.status = 'final'
)
select
  r.season_id,
  t.id   as team_id,
  t.name as team_name,
  t.slug as team_slug,
  t.color,
  t.sort_order,
  count(*)                                                  as games_played,
  count(*) filter (where r.goals_for > r.goals_against)      as wins,
  count(*) filter (where r.goals_for < r.goals_against)      as losses,
  count(*) filter (where r.goals_for = r.goals_against)      as ties,
  coalesce(sum(r.goals_for), 0)                              as goals_for,
  coalesce(sum(r.goals_against), 0)                          as goals_against,
  count(*) filter (where r.goals_for > r.goals_against) * 2
    + count(*) filter (where r.goals_for = r.goals_against)  as points
from results r
join teams t on t.id = r.team_id
group by r.season_id, t.id, t.name, t.slug, t.color, t.sort_order;

-- Season scoring totals per player, from finished games only.
create view player_totals as
select
  g.season_id,
  p.id        as player_id,
  p.full_name,
  p.position,
  p.jersey_number,
  count(*)                                    as games_played,
  coalesce(sum(st.goals), 0)                  as goals,
  coalesce(sum(st.assists), 0)                as assists,
  coalesce(sum(st.goals + st.assists), 0)     as points,
  coalesce(sum(st.pim), 0)                    as pim,
  coalesce(sum(st.goals_against), 0)          as goals_against,
  coalesce(sum(st.shots_against), 0)          as shots_against
from game_stats st
join games g   on g.id = st.game_id and g.status = 'final'
join players p on p.id = st.player_id
group by g.season_id, p.id, p.full_name, p.position, p.jersey_number;

-- Views in the public schema are reachable through PostgREST, and a view runs
-- with its owner's rights by default, which would step straight past RLS.
-- Force them to run as the caller and take the grants away from the public keys.
alter view team_standings set (security_invoker = on);
alter view player_totals set (security_invoker = on);
revoke all on team_standings from anon, authenticated;
revoke all on player_totals from anon, authenticated;

-- Deny-by-default: no policies are defined, so only the service role gets in.
alter table teams       enable row level security;
alter table seasons     enable row level security;
alter table players     enable row level security;
alter table games       enable row level security;
alter table rsvps       enable row level security;
alter table game_scores enable row level security;
alter table game_stats  enable row level security;
alter table profiles    enable row level security;
