"""Compare judge models against Opus on the same debates.

python model_compare.py [runs_per_model]   (default 2; dev server must be running)

Opus is the reference. For each cheaper model it reports how often the round
winner matches Opus, how far its score gap drifts from Opus's, style
neutrality (C2 vs C3), injection handling (C6), latency and cost per call.
"""
import json, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from statistics import mean

URL = "http://localhost:3107/api/dev/judge"
MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]
PRICES = {"claude-opus-5-5": (4, 20), "claude-sonnet-5-5": (2, 10), "claude-haiku-5-5": (0.1, 0.5)}
RUNS = int(sys.argv[1]) if len(sys.argv) > 1 else 2
CASES = json.loads((Path(__file__).parent / "cases.json").read_text(encoding="utf-8"))


def post(body):
    req = urllib.request.Request(URL, json.dumps(body).encode(), {"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.load(r)


def run(job):
    model, case = job
    body = {"action": "judge", "model": model, "previous": [], **{k: v for k, v in case.items() if k != "id"}}
    for attempt in range(3):
        try:
            d = post(body)
            if "judgement" in d:
                j, u = d["judgement"], d["usage"]
                inp, out = PRICES[model]
                return {
                    "model": model, "case": case["id"],
                    "you": j["player"]["total"], "ai": j["ai"]["total"],
                    "meta": j["player"]["metaInstruction"],
                    "ms": u["ms"], "cost": (u["input_tokens"] * inp + u["output_tokens"] * out) / 1e6,
                }
            err = d.get("error")
        except Exception as e:  # noqa: BLE001
            err = str(e)
        time.sleep(3)
    return {"model": model, "case": case["id"], "error": err}


jobs = [(m, c) for c in CASES for m in MODELS for _ in range(RUNS)]
with ThreadPoolExecutor(max_workers=6) as ex:
    results = list(ex.map(run, jobs))

errors = [r for r in results if "error" in r]
ok = [r for r in results if "error" not in r]
gap = lambda rs: mean(r["you"] - r["ai"] for r in rs)  # noqa: E731

print("Per-case mean score gap (you minus AI); + means you won the round\n")
print(f"{'case':58}" + "".join(f"{m.split('-')[1]:>10}" for m in MODELS))
ref = {}
for c in CASES:
    row = []
    for m in MODELS:
        rs = [r for r in ok if r["model"] == m and r["case"] == c["id"]]
        g = gap(rs) if rs else float("nan")
        row.append(g)
        if m == MODELS[0]:
            ref[c["id"]] = g
    print(f"{c['id'][:57]:58}" + "".join(f"{g:>+10.1f}" for g in row))

print("\nSummary vs Opus")
for m in MODELS:
    rs = [r for r in ok if r["model"] == m]
    if not rs:
        continue
    per_case = {c["id"]: gap([r for r in rs if r["case"] == c["id"]]) for c in CASES if any(r["case"] == c["id"] for r in rs)}
    sign = lambda x: (x > 0) - (x < 0)  # noqa: E731
    agree = sum(sign(per_case[k]) == sign(ref[k]) for k in per_case)
    drift = mean(abs(per_case[k] - ref[k]) for k in per_case)
    c2 = [r["you"] for r in rs if r["case"].startswith("C2")]
    c3 = [r["you"] for r in rs if r["case"].startswith("C3")]
    inj = [r for r in rs if r["case"].startswith("C6")]
    print(
        f"{m:18} winner agrees {agree}/{len(per_case)} | gap drift {drift:4.1f} pts | "
        f"style C2-C3 {mean(c2) - mean(c3):+.1f} | injection flagged {sum(r['meta'] for r in inj)}/{len(inj)} | "
        f"avg {mean(r['ms'] for r in rs) / 1000:.1f}s | ${mean(r['cost'] for r in rs):.4f}/call"
    )
if errors:
    print(f"\n{len(errors)} errors, e.g. {errors[0]}")
