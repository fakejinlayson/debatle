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
- Models live in `src/lib/config.ts` (`MODELS`). Ask Jake before changing them (it's a cost decision).
- Ask before adding dependencies. Migrations are append-only.
