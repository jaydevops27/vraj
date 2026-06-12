-- ===========================================================================
-- Dhwani & Vraj — Wedding RSVP database schema (Supabase / Postgres)
--
-- Run this once in your Supabase project's SQL editor
-- (Project -> SQL Editor -> New query -> paste -> Run).
--
-- Design:
--   * `rsvps`        — full guest responses (name, contact, food prefs,
--                       headcount, message). PRIVATE: the public can INSERT
--                       a row (submit an RSVP) but can never read this table.
--   * `lantern_wall` — a sanitized, public-readable feed that only ever
--                       contains a guest's first name + whether they're
--                       attending + a timestamp. Populated automatically by
--                       a trigger whenever a new RSVP comes in, so guests'
--                       phone numbers / messages / food choices are never
--                       exposed on the live wall.
--
-- The couple views full responses either via the Supabase Table Editor
-- (logged in as the project owner) or via admin.html, which requires a
-- Supabase Auth account you create for yourselves (see README.md).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Full RSVP responses (private)
-- ---------------------------------------------------------------------------
create table if not exists public.rsvps (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  guest_name    text not null,
  attending     boolean not null,
  contact_number text not null,
  guest_count   integer,
  food_count    integer,
  message       text
);

alter table public.rsvps enable row level security;

-- Anyone (the anon key used by the public site) may submit an RSVP...
create policy "Public can submit an RSVP"
  on public.rsvps
  for insert
  to anon, authenticated
  with check (true);

-- ...but nobody using the anon key can read, edit or delete RSVPs.
-- (No SELECT/UPDATE/DELETE policy = denied by default under RLS.)
-- Only authenticated admin accounts can read the full list:
create policy "Authenticated admins can view all RSVPs"
  on public.rsvps
  for select
  to authenticated
  using (true);


-- ---------------------------------------------------------------------------
-- 2. Public "Lantern Wall" feed (sanitized, read-only for guests)
-- ---------------------------------------------------------------------------
create table if not exists public.lantern_wall (
  id          uuid primary key,
  created_at  timestamptz not null default now(),
  guest_name  text not null,
  attending   boolean not null,
  wish        text
);

alter table public.lantern_wall enable row level security;

-- Anyone may read the lantern wall (it only ever holds a first name + status)
create policy "Public can view the lantern wall"
  on public.lantern_wall
  for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policy for anon — rows only ever arrive via the
-- trigger below, which runs with the privileges of its owner (security definer).


-- ---------------------------------------------------------------------------
-- 3. Trigger: copy a sanitized snapshot of every new RSVP onto the wall
-- ---------------------------------------------------------------------------
create or replace function public.sync_lantern_wall()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lantern_wall (id, created_at, guest_name, attending, wish)
  values (new.id, new.created_at, new.guest_name, new.attending, new.message);
  return new;
end;
$$;

drop trigger if exists trg_sync_lantern_wall on public.rsvps;

create trigger trg_sync_lantern_wall
  after insert on public.rsvps
  for each row
  execute function public.sync_lantern_wall();


-- ---------------------------------------------------------------------------
-- 4. Realtime: let the browser subscribe to new lanterns as they're lit
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.lantern_wall;


-- ---------------------------------------------------------------------------
-- 5. Helpful indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_rsvps_created_at on public.rsvps (created_at desc);
create index if not exists idx_lantern_wall_created_at on public.lantern_wall (created_at asc);
