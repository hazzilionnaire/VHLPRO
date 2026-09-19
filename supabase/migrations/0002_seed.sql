-- Starting data: the two shirts and an opening season.

insert into teams (name, slug, color, sort_order) values
  ('Blue',  'blue',  '#2563eb', 1),
  ('White', 'white', '#e2e8f0', 2)
on conflict (slug) do nothing;

insert into seasons (name, starts_on, ends_on, is_active)
select '2026-27', date '2026-09-01', date '2027-04-30', true
where not exists (select 1 from seasons);
