-- Games played counts games that have actually started. Saying yes to
-- Thursday's game shouldn't award a game played on Tuesday — it dilutes a
-- goalie's average against for two days, among other oddities.
--
-- Goals and assists are deliberately not gated the same way: a player can
-- enter or correct a line whenever they like and see the table move, which is
-- the point of letting them keep their own stats. So a line filed early shows
-- its goals now and its game played at puck drop.

drop view if exists player_totals;

create view player_totals as
with live as (
  select id, season_id, starts_at
    from games
   where status <> 'cancelled'
),
-- Every line ever filed, whenever the game is.
recorded as (
  select l.season_id,
         st.player_id,
         st.game_id,
         l.starts_at,
         st.goals,
         st.assists,
         st.pim,
         st.goals_against,
         st.shots_against
    from game_stats st
    join live l on l.id = st.game_id
),
-- Turning out, or filing a line, for a game already under way.
played as (
  select l.season_id, r.player_id, r.game_id
    from rsvps r
    join live l on l.id = r.game_id
   where r.status = 'in'
     and l.starts_at <= now()
  union
  select season_id, player_id, game_id
    from recorded
   where starts_at <= now()
),
games_played as (
  select season_id, player_id, count(*) as games_played
    from played
   group by season_id, player_id
),
totals as (
  select season_id,
         player_id,
         sum(goals)         as goals,
         sum(assists)       as assists,
         sum(pim)           as pim,
         sum(goals_against) as goals_against,
         sum(shots_against) as shots_against
    from recorded
   group by season_id, player_id
),
everyone as (
  select season_id, player_id from games_played
  union
  select season_id, player_id from totals
)
select
  e.season_id,
  p.id           as player_id,
  p.full_name,
  p.position,
  p.jersey_number,
  coalesce(gp.games_played, 0)                    as games_played,
  coalesce(t.goals, 0)                            as goals,
  coalesce(t.assists, 0)                          as assists,
  coalesce(t.goals, 0) + coalesce(t.assists, 0)   as points,
  coalesce(t.pim, 0)                              as pim,
  coalesce(t.goals_against, 0)                    as goals_against,
  coalesce(t.shots_against, 0)                    as shots_against
from everyone e
join players p on p.id = e.player_id
left join games_played gp on gp.season_id = e.season_id and gp.player_id = e.player_id
left join totals t on t.season_id = e.season_id and t.player_id = e.player_id;

alter view player_totals set (security_invoker = on);
revoke all on player_totals from anon, authenticated;

notify pgrst, 'reload schema';
