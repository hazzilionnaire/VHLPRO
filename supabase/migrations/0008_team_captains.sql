-- Each side gets a captain with a face, shown either edge of the window.

alter table teams
  add column captain_name      text,
  add column captain_photo_url text;

notify pgrst, 'reload schema';
