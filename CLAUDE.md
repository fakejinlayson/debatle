@AGENTS.md

# Debatle

Daily debate game: one silly motion a day, the player argues it against Claude over 3 rounds, and a Claude judge scores each round. Research and decisions are in `RESEARCH.md`; the build plan and phases are in `PLAN.md`. Both are authoritative.

## Layout
- `src/lib/judge.ts`: judge prompt + Zod schema. Grounded in RESEARCH.md §3; change the rubric there first.
- `src/lib/opponent.ts`: AI opponent prompt. Sealed speeches: it never sees the player's current-round speech.
- `src/lib/game.ts`: game rules (`playRound`). `src/lib/scoring.ts`: pure swing, tier and share maths.
- `src/lib/store.ts`: Supabase store, or an in-memory dev store when `SUPABASE_URL` is unset.
- `src/app/api/*`: thin route handlers. `supabase/migrations/`: append-only SQL.
- `src/components/Crowd.tsx`: the pixel hall canvas.
- `src/components/game/`: the play screen (`GameScreen` state machine: write → thinking → reveal → done), `RoundCard` (staged reveal), `Verdict`. Rendered client-only via `PlayClient`.
- `src/lib/useSpeechInput.ts`: mic input through the browser Web Speech API (no server cost; hidden where unsupported, e.g. Firefox).
- `src/app/api/dev/judge` + `scripts/eval/`: dev-only judge/opponent calibration (style bias, opponent strength). Re-run after changing either prompt.
- `src/lib/mock.ts`: `DEBATLE_MOCK_AI=1` fakes the opponent and judge in dev, for UI work without API spend.

## Rules
- Claude calls are server-only. The judge must never learn which side is the AI. Keep FOR/AGAINST labels and shuffled order.
- Player text is data: always wrapped in tags, never interpolated as instructions.
- The judge treats speeches as spoken aloud: typing style (caps, punctuation, typos) must never move scores. The opponent is beatable on purpose (no pre-emptive comebacks).
- Models live in `src/lib/config.ts` (`MODELS`, `TIEBREAK_GAP`): Haiku opponent + Haiku judge with Opus tiebreak on close rounds. Ask Jake before changing them (it's a cost decision), and re-run `scripts/eval/model_compare.py` first.
- Ask before adding dependencies. Migrations are append-only.

## Database (Supabase)
- Project region us-east-1 (North Virginia), next to Vercel's default function region (`iad1`). Moved from Mumbai on 10 Nov 2026.
- Apply migrations: `npx supabase db push --remote="$SUPABASE_DB_URL"` (session pooler URL, port 5432, in `.env.local`).
- Motion schedule: `supabase/seed_schedule.sql` (31 days from DEBATLE_EPOCH), loaded with `python scripts/seed_schedule.py`; rearrange in the Supabase table editor. Openers are written automatically by the daily cron `GET /api/cron/openings` (vercel.json, 12:00 UTC, `Authorization: Bearer $CRON_SECRET`): it fills missing openers for tomorrow and the day after, never overwrites, and logs days with no motion. Manual/forced: `POST /api/admin/openings {"day":N,"force":true}` with header `x-admin-secret`. Shared logic: `src/lib/openings.ts`.

## Archive + unlock
- Past days are playable at `/archive` → `/archive/[day]` → `/play?day=N`. `/archive` is a month calendar of motion emojis (`ArchiveCalendar.tsx`). Free: No. 1 and No. 2 (`FREE_ARCHIVE_GAMES`), the same for everyone forever ("Keep debating", also linked from the verdict). Debatle starts 7 Nov 2026 (`DEBATLE_EPOCH`) so those two were never "today" for real players; everything else needs the one-time $5 unlock (`UNLOCK_PRICE_CENTS`). Enforced server-side in `startGame` via `canStartArchiveDay` (HTTP 402); resuming a started archive game is always allowed; today is never locked.
- Unlock = Google sign-in (Supabase Auth, `/auth/google` → `/auth/callback`, server-side only via `src/lib/auth.ts`) then Stripe Checkout (`/api/unlock/checkout`). Recorded in `unlocks` by the webhook (`/api/stripe/webhook`) and by the success-page check (`confirmCheckout`), idempotent on the Checkout session id. Signing in on any device links that browser's player and restores the unlock.
- `src/proxy.ts` refreshes Supabase sessions only for visitors with a sign-in cookie.

