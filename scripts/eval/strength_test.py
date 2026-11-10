import json, urllib.request
from concurrent.futures import ThreadPoolExecutor
from statistics import mean

# How strong is the opponent? Generate several FOR openings and judge each
# against two fixed AGAINST speeches: Claude's own (V3) and Jake's tidied (V2).
URL = "http://localhost:3107/api/dev/judge"
MOTION = "This House believes cereal is a soup"
REFS = {
    "Claude's AGAINST (V3)": "Soup is something you cook, and cereal is just stuff you pour out of a box. Nobody's ever made a pot of cereal or had it for a starter. If you called it soup at breakfast, everyone at the table would look at you funny.",
    "Your AGAINST, tidied (V2)": "Soup means a broth, usually vegetables, that has to be cooked and is normally served hot. Cereal is just milk poured over flakes, maybe with some fruit. They're made in completely different ways, so they're different foods.",
}

def post(body):
    req = urllib.request.Request(URL, json.dumps(body).encode(), {"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)

with ThreadPoolExecutor(max_workers=4) as ex:
    openers = list(ex.map(lambda _: post({"action": "speak", "motion": MOTION, "side": "for", "round": 1})["text"], range(4)))

jobs = [(i, ref) for i in range(len(openers)) for ref in REFS]
def judge(job):
    i, ref = job
    j = post({"action": "judge", "motion": MOTION, "playerSide": "against", "round": 1,
              "playerText": REFS[ref], "aiText": openers[i]})["judgement"]
    return i, ref, j["player"]["total"], j["ai"]["total"]

with ThreadPoolExecutor(max_workers=6) as ex:
    res = list(ex.map(judge, jobs))

for i, text in enumerate(openers):
    print(f"AI opener {i+1}: {text}")
for ref in REFS:
    rs = [r for r in res if r[1] == ref]
    print(f"{ref}: player {[r[2] for r in rs]} vs AI {[r[3] for r in rs]}  avg gap {mean(r[2]-r[3] for r in rs):+.1f}  "
          f"player wins {sum(r[2] > r[3] for r in rs)}/{len(rs)}")
print(f"AI average score: {mean(r[3] for r in res):.1f}")
