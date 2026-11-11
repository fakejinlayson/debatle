-- Debatle motion schedule (days 1-31). Run after migrations 0001-0003.
--
-- Re-runnable: it clears every motion nobody has played yet, then inserts the
-- schedule below (days already played are kept as they are). After running,
-- rearrange days freely in Supabase's table editor (change day_number + date),
-- then pre-write each day's AI openers:
--   POST /api/admin/openings {"day": N}
--
-- Dates count from the start date below. Keep it equal to DEBATLE_EPOCH.

delete from public.motions m
where not exists (select 1 from public.games g where g.motion_id = m.id);

with start as (select date '2026-11-07' as d),
schedule (day_number, title, emoji) as (
  values
    (1,   'This House prefers breakfast for dinner over dinner for breakfast', '🥞'),
    (2,   'This House believes naps should be compulsory at work', '💤'),
    (3,   'This House believes pineapple belongs on pizza', '🍍'),
    (4,   'This House believes a hot dog is a sandwich', '🌭'),
    (5,   'This House would ban reclining seats on planes', '✈️'),
    (6,   'This House believes cereal is a soup', '🥣'),
    (7,   'This House would rather fight one horse-sized duck than a hundred duck-sized horses', '🦆'),
    (8,   'This House believes cats are better than dogs', '🐈'),
    (9,   'This House believes toilet paper should hang over, not under', '🧻'),
    (10,  'This House believes water is wet', '💧'),
    (11,  'This House believes crunchy peanut butter beats smooth', '🥜'),
    (12,  'This House would paint the Moon', '🌕'),
    (13,  'This House would ban the snooze button', '⏰'),
    (14,  'This House believes geese are the most dangerous animal in the park', '🪿'),
    (15,  'This House believes a straw has one hole, not two', '🥤'),
    (16,  'This House believes a tomato belongs in a fruit salad', '🍅'),
    (17,  'This House would ban reply-all emails', '📧'),
    (18,  'This House prefers a world where everyone speaks in rhyme', '🎭'),
    (19,  'This House believes the middle seat should get both armrests', '💺'),
    (20,  'This House believes pigeons deserve the same respect as eagles', '🐦'),
    (21,  'This House believes Pluto is still a planet', '🪐'),
    (22,  'This House would pour the milk in before the cereal', '🥛'),
    (23,  'This House would ban talking in lifts', '🛗'),
    (24,  'This House believes napping is a sport', '😴'),
    (25,  'This House would rather have hands for feet than feet for hands', '🖐️'),
    (26,  'This House would make Monday part of the weekend', '📅'),
    (27,  'This House would give every dog a vote', '🐕'),
    (28,  'This House believes it''s fine to eat pizza with a knife and fork', '🍴'),
    (29,  'This House believes socks with sandals are a fashion statement', '🧦'),
    (30,  'This House believes a hot tub is just soup for people', '♨️'),
    (31,  'This House regrets autocorrect', '📱')
)
insert into public.motions (day_number, date, title, emoji)
select s.day_number, start.d + (s.day_number - 1), s.title, s.emoji
from schedule s cross join start
on conflict (day_number) do nothing;
