-- The AI's next speech, pre-written in the background while the player writes
-- theirs: {round, text|null, startedAt}. Never sent to the browser.
alter table public.games add column pending_ai jsonb;
