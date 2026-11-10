-- Debatle initial schema. All access goes through server routes using the
-- service role key; RLS is enabled with no policies so anon/auth keys get nothing.

create table public.motions (
  id uuid primary key default gen_random_uuid(),
  day_number int not null unique check (day_number >= 1),
  date date not null unique,
  title text not null,
  emoji text not null default '🎤',
  info text,
  crowd_for_pct int not null default 50 check (crowd_for_pct between 0 and 100),
  ai_opening_for text,
  ai_opening_against text,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key,
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  motion_id uuid not null references public.motions(id) on delete cascade,
  side text not null check (side in ('for', 'against')),
  round int not null default 1 check (round between 1 and 4),
  crowd_for int not null check (crowd_for between 0 and 100),
  -- Array of RoundRecord (see src/lib/types.ts): speeches, judgement, swing.
  rounds jsonb not null default '[]'::jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'finished')),
  final_score int,
  won boolean,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (player_id, motion_id)
);

create index games_motion_idx on public.games (motion_id, status);

alter table public.motions enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;

-- First motion so a fresh database is playable on day 1.
insert into public.motions (day_number, date, title, emoji, crowd_for_pct)
values (1, '2026-12-01', 'This House believes pineapple belongs on pizza', '🍍', 38);
