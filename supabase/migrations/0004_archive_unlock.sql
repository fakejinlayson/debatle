-- Archive + one-time unlock.
-- Players get FREE_ARCHIVE_GAMES (2) archive games; beyond that they need an
-- unlock, bought once ($5 via Stripe) and tied to a Google account through
-- Supabase Auth so it can be restored on any device.

-- Archive games (a past day's motion) count against the free allowance.
alter table public.games add column is_archive boolean not null default false;
create index games_player_archive_idx on public.games (player_id) where is_archive;

-- An anonymous player can be linked to a signed-in Google account.
alter table public.players add column user_id uuid references auth.users (id) on delete set null;
create index players_user_idx on public.players (user_id);

-- One row per completed purchase. stripe_session_id makes recording idempotent
-- (the webhook and the success-page check may both record the same purchase).
create table public.unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stripe_session_id text not null unique,
  email text,
  amount_total int,
  currency text,
  created_at timestamptz not null default now()
);
create index unlocks_user_idx on public.unlocks (user_id);

alter table public.unlocks enable row level security;
