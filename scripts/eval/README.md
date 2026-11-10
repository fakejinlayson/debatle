# Judge and opponent calibration

Dev-only checks that run against `POST /api/dev/judge` (disabled in production).
Start the dev server first. Each run makes real Claude calls (roughly $0.25 to $0.50).

- `python bias_test.py run variants.json`: judges the same arguments written in
  different styles (3 runs each). Same words typed differently should score the
  same. Baseline 10 Nov 2026: V3 62.3 vs V4 61.3 after the "spoken aloud" rule.
- `python bias_test.py speak`: has the opponent write an AGAINST opening.
- `python strength_test.py`: generates 4 AI openers and judges them against two
  fixed human-level speeches. Baseline 10 Nov 2026: AI average 62.8; a decent
  human argument wins about half the time.
- `python model_compare.py [runs]`: judges the 10 debates in `cases.json` with
  Opus, Sonnet and Haiku and compares each to Opus (winner agreement, score
  drift, style neutrality, injection handling, latency, cost).
  Baseline 10 Nov 2026 (2 runs):
  - Opus: $0.035/call, 11.4s
  - Sonnet: 7/9 winners agree, $0.015/call, 7.1s, malformed JSON on ~8 calls (C8 failed 3x)
  - Haiku: 6/10 winners agree (all disagreements were close rounds), $0.001/call,
    6.7s, scores ~5-10 points lower than Opus in absolute terms
  - All three: style-neutral (within 2 pts) and flagged every injection
- `python strength_test.py claude-haiku-5-5`: Haiku as the opponent averaged
  60.6 (Opus opponent 62.8); a decent human argument wins about half the time.
- `model_compare.py` / dev route accept `"model": "production"` to run the real
  Haiku-then-Opus-tiebreak path. Close cases (C3, C7) went to Opus 3 of 4 times.
- `python speech_leak_test.py [n] [model]`: generates n round-3 closings and
  flags any that read like notes or instructions instead of a speech.
  10 Nov 2026: Haiku at low effort leaked 1/16 (plus "This is the last word,
  so keep it simple" self-talk in most); after the output rule + medium effort
  + retry guard in `opponent.ts`: 0/16, no retries needed.
