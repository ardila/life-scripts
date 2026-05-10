# Thesis Screener — Design (v2)

A monthly batch that uses every Claude Max token I have to surface the best
AI-related S&P 500 names. Two prompts do the real work; everything else is
~150 lines of plain Python.

## Shape

```
discover  →  seed (per ticker)  →  tournament (bracket of matches)  →  done
```

- **discover** — one Claude call: "list AI-exposed S&P 500 tickers, JSON
  array." No cap. We take whatever it returns.
- **seed** — one Claude call per ticker. Heavy web research + balanced
  bull/bear dossier. One big prompt template.
- **tournament** — single-elimination bracket. Each match is one Claude
  call that reads both dossiers, debates internally, and emits a winner.
  Runs until ≤4 remain. Those are the answer.

No separate research / theses / critic / advocate / judge stages. The big
models with extended thinking do all of that inside two prompts.

## The two prompts

**`prompts/seed.md`** (takes `{TICKER}`). One agent with web search and
extended thinking produces `seeds/{TICKER}.md` with business overview, AI
exposure, balanced bull and bear cases (citations, base rates, falsifiers),
unverified-claims section, and source list.

**`prompts/compete.md`** (takes two dossiers). One agent with web search and
extended thinking reads both, runs an internal debate, web-searches to break
ties on disputed claims, and emits JSON: `{winner, loser, margin,
key_argument, strongest_counter, verified_claims, rejected_claims,
confidence}`.

The prompt tells the model: argue both sides honestly, prefer the cheaper /
more falsifiable case when close, treat unverifiable claims as evidence
against, and write down what was searched.

## Orchestrator

Python stdlib only. `subprocess.run` to call `claude -p`, `ThreadPoolExecutor`
for fan-out, file-existence checks for resumability.

The CLI call shape:

```
claude -p <prompt> \
  --model <model> --effort <effort> \
  --output-format json \
  --allowedTools "WebSearch WebFetch"
```

`--allowedTools` (not `--dangerously-skip-permissions`) is what works in this
environment; the latter is blocked when running as root. The allowlist is
the same in spirit — non-interactive sessions pre-approve the tools they
need.

## Knobs

Two flags, both controlling token spend:

- `--model` — `opus` by default. `sonnet` or `haiku` for cheap dry runs.
- `--effort` — `max` by default. The primary lever for extended thinking.

Plus `--parallel` (wall-clock only) and `--max-tickers` (artificial cap, for
test runs).

## Resumability

The filesystem is the state. Every artifact has a canonical path; if the
file exists, we skip. On crash or quota exhaustion, re-run the script —
completed seeds and completed matches are untouched, the bracket re-derives
from the surviving files. Atomic write via `tmp → rename`.

No state file, no sentinels, no stage markers.

## Logging

One file: `runs/<date>/log.jsonl`. The CLI wrapper appends one line per
Claude invocation with role, ticker(s), model, effort, duration, cost,
exit code, output path. Artifacts (markdown dossiers, JSON verdicts) are
already human-readable so the log only covers what they don't.

## Token profligacy

Defaults tuned to burn quota:

- `opus` + `effort=max` on every call.
- Web search enabled on every call — both seeds and matches re-verify
  claims live.
- No ticker cap. ~30 candidates → 30 seeds + ~26 bracket matches ≈ 56
  heavy calls. Back-of-envelope ~$200-450 per monthly run — well within
  Max.

## Files

```
thesis_screener/
├── DESIGN.md
├── screener.py            # ~150 lines
├── analyze.py             # ~10 lines, rolls up log.jsonl
├── prompts/
│   ├── discover.md
│   ├── seed.md
│   └── compete.md
└── runs/                  # gitignored
```

## Tournament termination

Bracket runs until `len(survivors) <= 4`. With N = 5 we get 3 finalists; N
= 7 → 4; N = 16 → 4; N = 30 → 4. The "≤4" cutoff is a hard stop, not a
guarantee of exactly 4 — depends on N.
