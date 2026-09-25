-- A short written line about whatever just happened in the league, generated
-- when a score or a stat line is saved. Kept as a table rather than a single
-- row so the older ones can be shown, or looked back at.

create table news (
  id          uuid primary key default gen_random_uuid(),
  headline    text not null,
  body        text,
  created_at  timestamptz not null default now()
);

create index news_recent on news (created_at desc);

alter table news enable row level security;

notify pgrst, 'reload schema';
