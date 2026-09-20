-- Players report their own goals and assists after a game, so the season
-- totals can't wait for an admin to close the game out. Count any game that
-- has been played and wasn't cancelled.
--
-- Games played now comes from the RSVPs instead of the stat sheet: you were
-- there if you said you were in, whether or not you scored or ever got round
-- to entering anything.

drop view if exists player_totals;

create view player_totals as
with played as (
  select id, season_id
    from games
   where status <> 'cancelled'
     and starts_at <= now()
),
appearances as (
  select pl.season_id, r.player_id, count(*) as games_played
    from rsvps r
    join played pl on pl.id = r.game_id
   where r.status = 'in'
   group by pl.season_id, r.player_id
),
recorded as (
  select pl.season_id,
         st.player_id,
         sum(st.goals)         as goals,
         sum(st.assists)       as assists,
         sum(st.pim)           as pim,
         sum(st.goals_against) as goals_against,
         sum(st.shots_against) as shots_against
    from game_stats st
    join played pl on pl.id = st.game_id
   group by pl.season_id, st.player_id
),
everyone as (
  select season_id, player_id from appearances
  union
  select season_id, player_id from recorded
)
select
  e.season_id,
  p.id           as player_id,
  p.full_name,
  p.position,
  p.jersey_number,
  coalesce(a.games_played, 0)                          as games_played,
  coalesce(r.goals, 0)                                 as goals,
  coalesce(r.assists, 0)                               as assists,
  coalesce(r.goals, 0) + coalesce(r.assists, 0)        as points,
  coalesce(r.pim, 0)                                   as pim,
  coalesce(r.goals_against, 0)                         as goals_against,
  coalesce(r.shots_against, 0)                         as shots_against
from everyone e
join players p on p.id = e.player_id
left join appearances a on a.season_id = e.season_id and a.player_id = e.player_id
left join recorded r on r.season_id = e.season_id and r.player_id = e.player_id;

alter view player_totals set (security_invoker = on);
revoke all on player_totals from anon, authenticated;

notify pgrst, 'reload schema';
