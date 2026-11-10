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
