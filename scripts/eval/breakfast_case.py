"""Re-judge a real game (11 Nov 2026) that the player felt they should have won.

python scripts/eval/breakfast_case.py [runs]   (dev server must be running)
python scripts/eval/breakfast_case.py 4 claude-haiku-5-5,production

Judges rounds 2 and 3 with Haiku and Opus, `runs` times each, and prints the
gap (player minus AI) plus each side's "weakness" line, so judge prompt
changes can be checked against this exact debate.
"""
import json, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding="utf-8")
URL = "http://localhost:3107/api/dev/judge"
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 3
MOTION = "This House prefers breakfast for dinner over dinner for breakfast"
SPEECHES = [
    (  # player FOR, AI AGAINST
        "The last thing you want to do after a long hard day of work is to make a three course banquet, do you know what does work? Some delicious cereal that's super easy to make and ready in a minute so you can get back some of that sweet free time",
        "Nah, dinner for breakfast is the better deal. You wake up to a big, hearty meal that's already made, and by the time you're getting home at night you've got nothing left in you to cook a proper breakfast anyway.",
    ),
    (
        "Who's making the dinner in the breakfast? Dinner definitely takes longer to cook then breakfast. And also, a proper breakfast can literally just be cereal, milk and maybe some fruit if you're feeling fancy. All in one bowl ready to eat in a moment rather then getting a million pots and pans out",
        "I'd argue the opposite here. Cereal is quick, sure, but nobody's leaving a dinner party feeling fed by a bowl of Cheerios. Dinner for breakfast gives you a proper hot meal that's already cooked, and you can just reheat it in five minutes while you're half asleep.",
    ),
    (
        "You're completely inventing a dinner party here when my original point was that it's quick and easy. You're also making the assumption that the dinner is already cooked but you'd need to make breakfast, you're literally not comparing the two fairly. Cereal is quick to make, dinner takes time",
        "Cereal is fine for a quick bite, but you're still stuck washing up a bowl and a spoon at 7am. Dinner for breakfast wins because the cooking's already done, and you can eat it half awake without thinking about it. Nobody's ever said \"I can't wait to make my own cereal\" in a voice like that.",
    ),
]
MODELS = sys.argv[2].split(",") if len(sys.argv) > 2 else ["claude-haiku-5-5", "claude-opus-5-5", "production"]


def judge(job):
    model, rnd = job
    prev = [{"round": i + 1, "playerText": p, "aiText": a} for i, (p, a) in enumerate(SPEECHES[: rnd - 1])]
    p, a = SPEECHES[rnd - 1]
    body = {"action": "judge", "model": model, "motion": MOTION, "playerSide": "for", "round": rnd,
            "playerText": p, "aiText": a, "previous": prev}
    req = urllib.request.Request(URL, json.dumps(body).encode(), {"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=240) as r:
        j = json.load(r)["judgement"]
    return model, rnd, j


jobs = [(m, r) for r in (2, 3) for m in MODELS for _ in range(RUNS)]
with ThreadPoolExecutor(max_workers=6) as ex:
    results = list(ex.map(judge, jobs))

for model, rnd, j in results:
    gap = j["player"]["total"] - j["ai"]["total"]
    print(f"R{rnd} {(model.split('-')[1] if '-' in model else model):10} you {j['player']['total']} AI {j['ai']['total']} gap {gap:+d}")
    if model == "production":
        print(f"   judged by {j.get('judgedBy')}")
    print(f"   you gap: {j['player']['weakness']}")
    print(f"   AI gap:  {j['ai']['weakness']}")
