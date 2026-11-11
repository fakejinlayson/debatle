"""One-off (11 Nov 2026): Debatle now starts on 7 Nov 2026 (DEBATLE_EPOCH=2026-11-07).

Moves the last two scheduled motions (No. 30 and No. 31) to 7 and 8 Nov as
No. 1 and No. 2, the fixed free archive days, and renumbers every other motion
+2 so each keeps its date. Games point at motions by id, so played games stay
attached to the right motion.

python scripts/shift_schedule_nov7.py          (dry run: prints the plan)
python scripts/shift_schedule_nov7.py --apply  (writes to Supabase)

Run it right as the deploy with the new epoch goes live: until both match,
the site shows the wrong motion for today.
"""
import json, sys, urllib.error, urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, _, v = line.strip().partition("=")
        env[k] = v.strip().strip('"').strip("'")
URL, KEY = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": KEY, "authorization": f"Bearer {KEY}", "content-type": "application/json"}
APPLY = "--apply" in sys.argv


def call(method, path, body=None):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", method=method, headers=HEADERS,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            text = r.read()
            return json.loads(text) if text else []
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path}: HTTP {e.code} {e.read().decode()[:300]}")


motions = call("GET", "motions?select=id,day_number,date,title,emoji&order=day_number")
by_day = {m["day_number"]: m for m in motions}
if motions[0]["date"] == "2026-11-07":
    raise SystemExit("Already moved: No. 1 is on 2026-11-07.")
if sorted(by_day) != list(range(1, 32)) or by_day[1]["date"] != "2026-11-09":
    raise SystemExit("Schedule isn't the expected days 1-31 from 2026-11-09; check it by hand.")

moved = [(by_day[30], 1, "2026-11-07"), (by_day[31], 2, "2026-11-08")]
for m, day, date in moved:
    print(f"No. {m['day_number']} {m['emoji']} {m['title']}  ->  No. {day} on {date}")
print("Nos. 1-29 -> Nos. 3-31 (dates unchanged)")
if not APPLY:
    raise SystemExit("Dry run. Add --apply to write.")


def patch(m, **fields):
    call("PATCH", f"motions?id=eq.{m['id']}", fields)


# Park the two moved motions out of the way (day_number and date are unique).
for i, (m, _, date) in enumerate(moved):
    patch(m, day_number=1000 + i, date=date)
# Shift the rest up by two, highest first so numbers never collide.
for d in range(29, 0, -1):
    patch(by_day[d], day_number=d + 2)
for m, day, _ in moved:
    patch(m, day_number=day)
print("Done.")
