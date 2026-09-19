# VHL Pro

A website for a work hockey league: the schedule, a weekly RSVP link, Blue vs
White team allocation, and season stats.

## How a week works

1. An admin creates the game in **Admin → Games → New game**.
2. The admin copies that game's RSVP link and shares it with the league.
3. Players open the link and mark themselves **in**, **maybe** or **out**. No
   account, no password — a cookie remembers who they are for next week. Anyone
   not yet on the roster can add themselves from the same screen.
4. The admin opens the game in the admin area, splits the players who are in
   between **Blue** and **White** (there's an auto-split to start from), then
   hits **Publish teams**.
5. Everyone on the RSVP link now sees the two rosters.
6. After the game, an admin or captain enters the score and each player's line,
   which closes the game and updates standings and stats.

## Roles

| Role | Can do |
| --- | --- |
| **admin** | Everything: games, players, team allocation, results, granting roles |
| **captain** | Enter scores and player stats |
| **player** | Nothing in the admin area — the RSVP link is all they need |

Everyone starts as `player` the first time they sign in. An admin promotes them
in **Admin → Access**.

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then
   `supabase/migrations/0002_seed.sql`. That creates the schema and seeds the
   Blue and White teams plus an opening season.
3. Copy `.env.example` to `.env.local` and fill in the values from
   **Project settings → API**.
4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

5. Sign in at `/login` with your email. You'll land as a `player` — to make
   yourself an admin, run this once in the Supabase SQL editor:

   ```sql
   update profiles set role = 'admin'
    where id = (select id from auth.users where email = 'you@work.com');
   ```

6. In Supabase **Authentication → URL configuration**, add your site URL and
   `<site>/auth/callback` as a redirect URL, or the emailed sign-in link won't
   come back to the right place.

## How the data is protected

Every table has row-level security enabled and **no policies**, so the anon and
authenticated keys can't read or write anything directly. All league data is
read and written by the Next.js server using the service role key, and the app
checks the caller's role before every mutation. The two reporting views run as
the caller (`security_invoker`) with their grants revoked, so they can't be used
as a way around RLS either.

Practically this means: keep `SUPABASE_SERVICE_ROLE_KEY` server-side, and treat
a game's `rsvp_token` as the only thing standing between the public and that
game's RSVP page.

## Stack

Next.js 16 (App Router, server components and server actions), TypeScript,
Tailwind CSS v4, Supabase (Postgres + Auth).

## Deploying

Deploys as a standard Next.js app — Vercel is the easy path. Set the same
environment variables in the host, with `NEXT_PUBLIC_SITE_URL` pointing at the
real domain, and add that domain to Supabase's redirect URLs.
