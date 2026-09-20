-- Players belong to a side. Their RSVP lands them there without the admin
-- sorting anyone by hand each week; a per-game override still wins when it is
-- set, so a lopsided night can still be evened out.

alter table players
  add column default_team_id uuid references teams (id) on delete set null;

create index players_default_team on players (default_team_id);
