-- Players fix up their own numbers whenever they like, including for a game
-- that hasn't been skated yet, so the totals shouldn't wait on the calendar.
-- Count a line the moment it exists, for any game that wasn't cancelled.
--
-- Games played still leans on the RSVPs, but a recorded line also counts:
-- if you filled in a scoresheet, you were there.

drop view if exists player_totals;

create view player_totals as
with live as (
  select id, season_id, starts_at
    from games
   where status <> 'cancelled'
),
appearances as (
  select l.season_id, r.player_id, r.game_id
    from rsvps r
    join live l on l.id = r.game_id
   where r.status = 'in'
     and l.starts_at <= now()
),
recorded as (
  select l.season_id,
         st.player_id,
         st.game_id,
         st.goals,
         st.assists,
         st.pim,
         st.goals_against,
         st.shots_against
    from game_stats st
    join live l on l.id = st.game_id
),
-- Either turning up or filing a line counts as a game played, and a player
-- who did both is still only counted once.
games_played as (
  select season_id, player_id, count(*) as games_played
    from (
      select season_id, player_id, game_id from appearances
      union
      select season_id, player_id, game_id from recorded
    ) appearances_and_lines
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
)
select
  gp.season_id,
  p.id           as player_id,
  p.full_name,
  p.position,
  p.jersey_number,
  gp.games_played,
  coalesce(t.goals, 0)                            as goals,
  coalesce(t.assists, 0)                          as assists,
  coalesce(t.goals, 0) + coalesce(t.assists, 0)   as points,
  coalesce(t.pim, 0)                              as pim,
  coalesce(t.goals_against, 0)                    as goals_against,
  coalesce(t.shots_against, 0)                    as shots_against
from games_played gp
join players p on p.id = gp.player_id
left join totals t on t.season_id = gp.season_id and t.player_id = gp.player_id;

alter view player_totals set (security_invoker = on);
revoke all on player_totals from anon, authenticated;

notify pgrst, 'reload schema';
