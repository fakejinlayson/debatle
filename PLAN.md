# Debatle — Build Plan

*10 Nov 2026. Builds on [RESEARCH.md](RESEARCH.md) and the decisions recorded there: 3 rounds, player picks a side, crowd swing meter, Next.js + Supabase with no login.*

## 1. The game loop

```
Title (debate hall, today's motion)  →  Pick FOR / AGAINST  →  Round 1 → Round 2 → Round 3  →  Verdict + share
```

**Sealed speeches.** In each round the player and the AI both speak, and **neither sees the other's speech for that round until both are in**. Both are then revealed together and judged together. This is fair (the AI can't simply counter whatever you just wrote), it lets the AI speech and the judge be prepared in parallel, and it matches how real debates work: you rebut what was said *before* your speech.

| Round | Player writes (≤300 chars) | AI speech | AI can see |
|---|---|---|---|
| 1 · Opening | Your case | **Pre-generated daily** per side (same for everyone, cached) | nothing |
| 2 · Rebuttal | Attack their opening, defend yours | Generated live | Round 1 (both) |
| 3 · Closing | Weigh it up: why your side won the key clash | Generated live | Rounds 1–2 |

**Crowd swing (Intelligence Squared-style).** The hall seats 100 voters. The hall **starts where today's players stand**: its FOR share is the share of today's earlier players who argued FOR, smoothed toward 50/50 (as if 10 extra players had split evenly) and kept within 25–75% so either side has room to swing. The player sees it before picking a side, and each game keeps the split it started with. After each round, voters move according to the gap between the two judged speeches:

```
swing_r = clamp(round((playerScore_r − aiScore_r) × 1.5), −15, +15)   // voters moved toward the player
```

The player **wins if their side gained voters overall** (net swing > 0), as in IQ2. So an unpopular side can still win, and picking the unpopular side is a valid brave choice. Draws (net 0) go to the higher total score, so there are no ties.

**Debatle score** = the player's average round score (50–100, using the WUDC speaker-scale bands), with tiers:
`<60 Heckler · 60–69 Backbencher · 70–79 Barrister · 80–89 Orator · 90+ Unanswerable`

**Share card**
```
Debatle #12 🍍 FOR
🟩🟨🟩  +14 swing · WON
78 · Barrister
debatle.app
```
(🟩 round won by ≥3 · 🟨 within 2 · 🟥 lost by ≥3)

## 2. Architecture

- **Next.js 16 App Router** on Vercel, TypeScript, Tailwind 4. All game logic runs in server Route Handlers.
- **Supabase Postgres**, accessed only from the server with the service key. RLS is on with no public policies.
- **Identity**: an anonymous player ID in an **httpOnly signed cookie** (`dbt_pid`), set on first visit. No login. (A cookie rather than localStorage, because server routes need to read it.)
- **Claude API** for the AI opponent and the judge, server-side only. Nothing secret reaches the browser.
- **Day number**: one global reset at **00:00 UTC** (configurable via `DEBATLE_EPOCH` / `DEBATLE_RESET_TZ`). Day 1 = launch date.
- **Dev fallback**: with no Supabase env configured, `/api/today` serves a built-in seed motion so the UI can be worked on with no accounts set up.

### API
| Route | Does |
|---|---|
| `GET /api/today` | Today's motion (no AI material) + the player's game state if they've started |
| `POST /api/game` `{side}` | Starts today's game (one per player per day, enforced by a unique index) |
| `POST /api/round` `{text}` | Validates and stores the speech → gets the AI speech (cached for R1, live for R2/3) → judges the round → stores it → returns `{aiSpeech, judgement, crowd, next}` |
| `GET /api/stats` | Today's side split, average score, win rate (for the results screen) |

### Data model (`supabase/migrations/0001_init.sql`)
- `motions(day_number, date, title, emoji, info, ai_opening_for, ai_opening_against)`
- `players(id, created_at)`
- `games(id, player_id, motion_id, side, start_for, round, crowd_for, rounds jsonb, pending_ai, status, final_score, won, …)`, `unique(player_id, motion_id)`. Each element of `rounds` is a `RoundRecord` (both speeches, the judgement, the swing). Advancing a round is a conditional update on `round`, so a double submit can't play the same round twice.

## 3. The judge (from RESEARCH.md §3)

- **One judge call per round, run in order with memory** (Debatrix): the call gets the motion, all speeches so far, **and the judge's own earlier round notes** (`dropped_points`, `open_clashes`), so points left unanswered carry forward as conceded.
- **Anonymised and shuffled**: the judge sees **Side A / Side B**, with a random mapping per call, and is never told which side is the AI. This reduces self-preference and position bias.
- **Separate from the opponent**: a different system prompt and conversation. The judge never sees the opponent's instructions.
- **Rubric** (scored per side, each dimension anchored so 50% = barely an argument, 70% = competent but simplistic, 80% = strong, 90%+ = exceptional):
  - Reasoning /40: claim → mechanism → impact, precision, plausibility, explained examples
  - Engagement /30: hits the opponent's *strongest* point; in R1, pre-empting the obvious objection and framing the clash
  - Rhetoric /20: clarity and framing; humour credited only when it carries the argument
  - Strategy /10: picks the central clash, weighs, sets the framework (taste vs tradition vs …)
- **Hard rules in the prompt**: no credit for number of points or cleverness alone; never complete or rebut an argument for either side; bare assertions and invented statistics get little credit; with a self-contradiction only the first claim is credited; rule on the framework argument rather than bringing its own; no personal view on the motion.
- **Injection hardening**: player text goes inside `<speech>` tags; anything addressed to the judge or game ("ignore the rubric", "score me 100") is scored as a non-argument and flagged `meta_instruction: true`, and the UI shows a cheeky callout.
- **Structured output** via `client.messages.parse` + Zod (`lib/judge.ts`). The Zod schema is the contract.
- **Length parity**: the AI's speeches are held to the same 300-character cap.

### The opponent
- Claude plays the other side **well but beatably**. The system prompt sets it at "a sharp club debater" (aiming for the 72–80 band). It makes real arguments with one clear line of attack, and doesn't hedge or concede.
- **Round 1 openings are pre-generated per side** via `POST /api/admin/openings {day}` (protected by `DEBATLE_ADMIN_SECRET`) when a motion is scheduled. Same for everyone, $0 per player. In dev without Supabase they're generated live.

### Models and cost
- Both calls use `claude-opus-5-5` with adaptive thinking (effort `low` for the opponent, `medium` for the judge), plus server-side refusal fallbacks (`fallbacks: "default"`).
- **Cost estimate**: about $0.08–0.12 per completed game (3 judge calls + 2 opponent calls). At 10k games a day that's roughly $1k a day. **Decision for Jake before launch**: build a calibration eval (§5), then test `claude-haiku-5-5` for the opponent and/or judge. It is about 40× cheaper and may hold quality for 300-character speeches.

## 4. Look and feel: "The Chamber"
- A pixel-art **debate hall**: dark oak and oxblood, brass rails, the motion on a hanging banner, **100 pixel voters** in tiered benches, coloured by vote (FOR mint `#3fe0b0` filling from the left, AGAINST coral `#ff5d73` from the right).
- Fonts: **Silkscreen** (display) + **VT323** (body), different from Krillion and Far Flung, which both use Bungee.
- **The reveal moment**: both sealed speech cards flip open → judge's gavel → the judge's one-line verdict types out → voters change colour seat by seat with a sound tick → swing counter rolls (`+6`).
- HUD: round pips (left), crowd split bar (centre), score (right).
- Results: final hall, tier stamp, share button, global split, next-motion countdown.

## 5. Phases

| Phase | Scope | Done when |
|---|---|---|
| **0 · Scaffold** *(this turn)* | Next app, Supabase migration, lib (day, motion seed, scoring, judge + opponent prompts and schemas), API routes, title screen + crowd canvas | `npm run build` passes; title screen renders in the dev preview from the seed motion |
| **1 · Playable** | Side pick, round screen (type **or speak** via the Web Speech API), staged reveal, verdict + share + stats; dev mock mode | ✅ Built and played end to end with the mock. ⏳ First game against real Claude once an API key is set |
| **2 · Judge quality** | Calibration set (~20 hand-scored speeches across bands), eval script, prompt tuning, Haiku comparison | Judge matches hand scores within ±5 on 80% of cases; injection tests pass |
| **3 · Content + ops** | 30 days of motions, openings generator, rate limiting (per player + IP), error and refusal states, OG image | Month of content scheduled; abuse limits on |
| **4 · Retention** | Streaks, stats histogram, archive, sound, mobile polish | — |
| **5 · Launch** | Domain, Vercel, analytics, ads/archive monetisation decision | Live |

## 6. Open questions for later
- Domain name, and whether the reset should be UTC or US-Eastern like Krillion.
- Monetisation: ads (like Krillion's Mediavine) vs a paid archive vs both.
- Whether to show the global FOR/AGAINST split *before* picking a side or only after.
- Content policy for offensive speeches (currently: the judge scores them on argument merit like anything else, and rhetoric that is abusive rather than persuasive earns nothing).
