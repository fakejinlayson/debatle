"""Load supabase/seed_schedule.sql into Supabase through its REST API.

python scripts/seed_schedule.py        (run from the repo root)

Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local. Like the SQL
file, it removes motions nobody has played yet and inserts the schedule; days
already played are kept. Use this when you can't run the SQL file directly
(the Supabase CLI has no "run this SQL file" command).
"""
import json, re, urllib.error, urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
env = {}
for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, _, v = line.strip().partition("=")
        env[k] = v.strip().strip('"').strip("'")
URL, KEY = env["SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]
HEADERS = {"apikey": KEY, "content-type": "application/json", "prefer": "return=representation"}

sql = (ROOT / "supabase" / "seed_schedule.sql").read_text(encoding="utf-8")
start = date.fromisoformat(re.search(r"date '(\d{4}-\d{2}-\d{2})'", sql).group(1))
rows = [
    {"day_number": int(d), "date": (start + timedelta(days=int(d) - 1)).isoformat(),
     "title": t.replace("''", "'"), "emoji": e}
    for d, t, e in re.findall(r"\((\d+),\s*'((?:[^']|'')*)',\s*'([^']*)'\)", sql)
]


def call(method, path, body=None):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}", method=method, headers=HEADERS,
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            text = r.read()
            return json.loads(text) if text else []
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path}: HTTP {e.code} {e.read().decode()[:300]}")


played = {g["motion_id"] for g in call("GET", "games?select=motion_id")}
existing = call("GET", "motions?select=id,day_number")
for m in existing:
    if m["id"] not in played:
        call("DELETE", f"motions?id=eq.{m['id']}")
kept = {m["day_number"] for m in existing if m["id"] in played}
inserted = call("POST", "motions", [r for r in rows if r["day_number"] not in kept])
print(f"Schedule from {start}: removed {len(existing) - len(kept)} unplayed, kept {len(kept)} played, inserted {len(inserted)}.")
