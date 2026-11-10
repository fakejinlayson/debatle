"""Does the opponent ever output planning notes instead of a speech?

python speech_leak_test.py [n] [model]   (dev server running; default n=12, model = production opponent)

Generates n round-3 closing speeches for a fixed hot dog debate and flags any
that look like notes or instructions rather than something said out loud.
"""
import json, re, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

N = int(sys.argv[1]) if len(sys.argv) > 1 else 12
MODEL = sys.argv[2] if len(sys.argv) > 2 else None
PREVIOUS = [
    {"round": 1,
     "playerText": "A sandwich is multiple stacked ingredients in bread. A hot dog is a sausage in bread, so it is a sandwich.",
     "aiText": "A hot dog isn't a sandwich. A sandwich is two slices of bread with stuff in between, and a hot dog bun is one piece."},
    {"round": 2,
     "playerText": "Definitions change with society. A sub roll is one hinged piece of bread and everyone calls that a sandwich.",
     "aiText": "A sub roll gets called a sub, not a sandwich, half the time. And a hot dog is built around one sausage, that's its own thing."},
]
# Signs of leaked planning: talking about the task instead of the topic.
LEAK = re.compile(r"(?i)\b(constraint|round [123]|closing\b.*:|no new points|don'?t say|instruction|my speech|the speech|character limit|draft|they ignored my|last word|keep it (?:short|simple)|this is (?:the|my) (?:closing|opening|reply))\b")


def post(body):
    req = urllib.request.Request("http://localhost:3107/api/dev/judge", json.dumps(body).encode(),
                                 {"content-type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def speak(_):
    body = {"action": "speak", "motion": "This House believes a hot dog is a sandwich",
            "side": "against", "round": 3, "previous": PREVIOUS}
    if MODEL:
        body["model"] = MODEL
    return post(body)["text"]


with ThreadPoolExecutor(max_workers=6) as ex:
    texts = list(ex.map(speak, range(N)))
leaks = [t for t in texts if LEAK.search(t)]
for t in texts:
    print(("LEAK  " if t in leaks else "ok    ") + t)
print(f"\n{len(leaks)}/{len(texts)} looked like leaked notes")
