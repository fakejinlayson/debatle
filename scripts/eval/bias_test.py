import json, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from statistics import mean

URL = "http://localhost:3107/api/dev/judge"
MOTION = "This House believes cereal is a soup"
AI_FOR = ("Think about what soup actually is. It's bits of food floating in a liquid that you eat with a spoon "
          "out of a bowl. Cereal ticks every box. It's just cold soup that happens to be sweet, and nobody "
          "complains about gazpacho.")

def post(body):
    req = urllib.request.Request(URL, json.dumps(body).encode(), {"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)

def judge(text):
    j = post({"action": "judge", "motion": MOTION, "playerSide": "against", "round": 1,
              "playerText": text, "aiText": AI_FOR})["judgement"]
    p, a = j["player"], j["ai"]
    return p["total"], a["total"], (p["reasoning"], p["engagement"], p["rhetoric"], p["strategy"])

if sys.argv[1] == "speak":
    print(post({"action": "speak", "motion": MOTION, "side": "against", "round": 1})["text"])
    sys.exit()

variants = json.load(open(sys.argv[2], encoding="utf-8"))
RUNS = 3
jobs = [(name, text) for name, text in variants.items() for _ in range(RUNS)]
with ThreadPoolExecutor(max_workers=6) as ex:
    results = list(ex.map(lambda nt: (nt[0], judge(nt[1])), jobs))

for name, text in variants.items():
    rs = [r for n, r in results if n == name]
    you = [r[0] for r in rs]; ai = [r[1] for r in rs]
    print(f"{name}: you {you} (avg {mean(you):.1f}) vs AI {ai} (avg {mean(ai):.1f})  gap {mean(you)-mean(ai):+.1f}")
    print(f"    R/E/Rh/S per run: {[r[2] for r in rs]}")
    print(f"    text: {text}")
