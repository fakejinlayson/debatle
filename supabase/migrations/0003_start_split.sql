-- The hall now starts at today's real player split (computed when each game
-- begins) instead of a hand-picked lean per motion.
alter table public.games add column start_for int check (start_for between 0 and 100);
update public.games set start_for = 50 where start_for is null;
alter table public.games alter column start_for set not null;

alter table public.motions drop column crowd_for_pct;
