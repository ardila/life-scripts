# Thesis Screener — Design

A monthly batch job that surfaces the four most compelling AI-related S&P 500
investment ideas. It works by spawning many Claude sub-agents through the
`claude -p --dangerously-skip-permissions` CLI, organized as a resumable
pipeline of file-based stages, culminating in a tournament of debates judged
by independent panels.

The hard constraints driving the design are:

- **Resumability.** Quota or network can die at any point. Every restart must
  pick up exactly where the last one left off, without redoing expensive work.
- **Auditability.** Every agent call leaves a structured log and a readable
  artifact on disk. We must be able to read every thesis, every debate, every
  judge's reasoning after the fact and improve prompts.
- **Truth-seeking.** Sub-agents are pushed toward calibration: citations,
  falsification criteria, base rates, anonymized judging, multi-judge panels.
- **Simplicity.** Bash driver + a handful of prompt files. No databases, no
  servers, no queues. One run = one timestamped directory.

---

## 1. Pipeline overview

Five stages, each one a function from a directory of inputs to a directory of
outputs. Stages are idempotent: if the output artifact for a unit of work
already exists, the stage skips it.

```
00_universe        → list of S&P 500 tickers, filtered to AI-related set (~16)
01_research        → deep research dossier per ticker (web search + synthesis)
02_theses          → bull thesis + bear thesis per ticker, with citations
03_tournament      → bracket of debates, judged by anonymous panels
04_report          → final 4 tickers with their winning theses, presented
```

Output tree for one run:

```
runs/2026-05-10/
├── 00_universe/
│   ├── sp500.json                # {ticker, name, sector} for all 500
│   └── ai_candidates.json        # filtered set + one-line rationale each
├── 01_research/
│   └── NVDA/
│       ├── dossier.md            # the research artifact (markdown)
│       ├── sources.json          # urls fetched, with retrieval timestamps
│       └── meta.json             # model, duration, exit_code, cost_usd
├── 02_theses/
│   └── NVDA/
│       ├── bull.md
│       ├── bear.md
│       ├── critique_bull.md      # red-team pass
│       ├── critique_bear.md
│       └── meta.json
├── 03_tournament/
│   ├── bracket.json              # the seeded bracket, immutable after seed
│   ├── round_1/
│   │   └── NVDA_vs_AMD/
│   │       ├── opening_A.md
│   │       ├── opening_B.md
│   │       ├── rebuttal_A.md
│   │       ├── rebuttal_B.md
│   │       ├── judge_1.json      # {scores, winner, reasoning}
│   │       ├── judge_2.json
│   │       ├── judge_3.json
│   │       └── verdict.json      # majority vote, ties broken by score sum
│   └── round_2/...
├── 04_report/
│   └── final_4.md                # the deliverable
├── logs/
│   ├── driver.log                # human-readable progress
│   └── invocations.jsonl         # one line per claude -p call
└── state.json                    # last completed stage + restart hints
```

---

## 2. Spawning sub-agents

All sub-agents are invoked through a single wrapper:

```bash
spawn() {
  local out="$1"; shift
  local prompt_file="$1"; shift
  local model="${MODEL:-sonnet}"
  local tools="${TOOLS:-WebSearch,WebFetch,Read,Write}"
  local tmp="${out}.tmp"

  [ -f "$out" ] && return 0          # idempotent skip

  local started=$(date -u +%s)
  claude -p "$(cat "$prompt_file")" \
    --model "$model" \
    --tools "$tools" \
    --output-format json \
    --dangerously-skip-permissions \
    --max-budget-usd "${MAX_BUDGET:-2}" \
    > "$tmp" 2> "${tmp}.err"
  local rc=$?
  local ended=$(date -u +%s)

  log_invocation "$out" "$model" "$started" "$ended" "$rc" "$tmp"

  if [ $rc -eq 0 ]; then
    mv "$tmp" "$out"                 # atomic publish
  else
    mv "$tmp" "${out}.failed.$(date +%s)"
    return $rc
  fi
}
```

Key properties:

- **Atomic publish.** Output only appears at its final path if the call
  succeeded. Half-written files never poison a resume.
- **Per-call budget.** `--max-budget-usd` caps blast radius if a prompt loops.
- **Structured output.** `--output-format json` lets us parse cost, duration,
  and stop reason into `invocations.jsonl`.
- **Tool allowlist.** Stages that don't need the web don't get the web.

A `spawn_parallel` helper fans out N calls with `xargs -P "$CONCURRENCY"`
(default 4) — enough to make a run finish in a reasonable wall clock without
swamping rate limits.

---

## 3. Stage details

### Stage 00 — Universe

1. **Fetch S&P 500 list.** One agent with WebFetch pulls the constituents
   from a known source (e.g. Wikipedia's list page) and writes `sp500.json`.
   Cached for the month — re-running the stage is a no-op once the file exists.
2. **Classify AI-relatedness.** Tickers chunked 25 at a time; one Haiku call
   per chunk emits `{ticker, ai_related: bool, rationale: str, category: str}`
   where category ∈ {chip, model_lab, infra, application, picks_and_shovels,
   adjacent, none}. Chunks are independent files in
   `00_universe/classify/chunk_NN.json` so a partial failure only loses one
   chunk's worth of work.
3. **Merge + cap.** Concatenate, keep `ai_related = true`, cap to 16
   candidates (or pad to next power of 2 with byes) by category diversity:
   no more than 4 from any single category, to avoid an all-chip bracket.

Output: `ai_candidates.json` — ordered list of 16 tickers.

### Stage 01 — Research

For each ticker, one Sonnet agent with `WebSearch,WebFetch` produces a
`dossier.md` with a fixed schema:

```
# {TICKER} — {Company name}

## Business
## AI exposure (specific products, revenue lines, customers)
## Recent results & guidance (last 2 quarters)
## Competitive position
## Valuation snapshot (P/E, EV/Rev, vs sector)
## Key risks
## Open questions / things I could not verify
## Sources
[1] url — retrieved YYYY-MM-DD — one-line gloss
```

The prompt explicitly rewards "things I could not verify" and penalizes
unsourced claims. Every numeric claim in the dossier must carry a `[n]`
citation pointing to `Sources`. A short follow-up call validates that every
`[n]` resolves; failures are written to `meta.json:lint_errors` and the
dossier is regenerated up to twice before giving up.

Cost expectation: ~16 tickers × ~$0.50 = ~$8.

### Stage 02 — Theses

For each ticker, four sub-agents in sequence, all reading `dossier.md`:

1. **Bull author** writes `bull.md` arguing the stock beats S&P 500 over the
   next 12 months. Required sections: thesis statement, key drivers, base
   rates ("how often do stocks with these characteristics beat the market?"),
   target price with arithmetic, falsification criteria ("I am wrong if...").
2. **Bear author** writes `bear.md`, symmetric.
3. **Bull critic** reads `bull.md` + `dossier.md`, writes `critique_bull.md`
   listing every overclaim, missing base rate, cherry-picked stat, and weak
   citation. Score 0–10 on calibration.
4. **Bear critic** symmetric.

The author prompts include the critic's rubric — they know they'll be
scored, which sharpens the writing. If a critic score is below 5, the
author is invoked once more with the critique as input and overwrites the
thesis. We cap revision at one pass to keep cost bounded.

Cost expectation: ~16 × 4 × ~$0.40 = ~$25.

### Stage 03 — Tournament

**Seeding.** The 16 tickers are seeded into a bracket by category to avoid
chip-vs-chip first-round matchups (1 vs 16 by alphabetical ticker within
category-balanced groups — the seeding is dumb on purpose; the point of the
tournament is the debates, not the seeding).

**Match structure.** Each match pits ticker A vs ticker B. A match is:

```
opening_A    : advocate reads A's bull.md, writes 600-word case for A > B
opening_B    : advocate reads B's bull.md, writes 600-word case for B > A
rebuttal_A   : reads opening_B, writes 400-word rebuttal
rebuttal_B   : reads opening_A, writes 400-word rebuttal
judge_1..3   : three independent judges, each reads all four documents
               with ticker labels replaced by "STOCK_LEFT" / "STOCK_RIGHT"
               (the judge does not know which company is which until after
               scoring — anti-prior measure)
verdict      : majority of judges; tie-break = sum of judge scores
```

Each judge emits JSON:

```json
{
  "scores": {
    "left":  {"evidence": 7, "falsifiability": 6, "calibration": 8, "novelty": 5},
    "right": {"evidence": 8, "falsifiability": 7, "calibration": 6, "novelty": 7}
  },
  "winner": "right",
  "reasoning": "...",
  "concerns": "..."
}
```

**Anti-bias measures:**

- Ticker names are replaced with `STOCK_LEFT` / `STOCK_RIGHT` before judging.
  A mapping file is written separately so we can de-anonymize after.
- Left/right assignment is randomized per match (seeded from match dir name
  so it's reproducible).
- Judges run with different temperatures (0.2, 0.5, 0.8) to widen the panel.
- One judge is told "default to skepticism — only pick a winner if the case
  is materially stronger; otherwise pick the cheaper / lower-multiple stock."
  This is a deliberate prior to counter narrative-chasing.

**Rounds.** 16 → 8 → 4. Two rounds, eight matches total. After round 2 the 4
winners are the final 4.

Cost expectation: 8 matches × (4 advocates + 3 judges) × ~$0.30 = ~$10.

### Stage 04 — Report

One Sonnet call reads the 4 winning tickers' theses + their tournament
verdicts and writes `final_4.md` — a one-pager per stock with the
tournament-tested bull case, the strongest unresolved bear point, and a
"what to watch" list of falsifiers for the next 90 days.

---

## 4. Resumability

Resumability is enforced at three layers:

1. **Per-artifact.** `spawn` skips if the output file exists. Restart =
   re-run the driver; completed work is untouched.
2. **Per-stage.** Each stage writes `00_universe/.done` etc. on completion.
   The driver checks these in order and starts at the first incomplete stage.
3. **Per-run.** `state.json` records the current stage, last successful
   ticker/match, wall-clock spent, and aggregate cost so far. On startup the
   driver prints "resuming from stage 02, 11/16 theses complete" before doing
   anything.

**Quota exhaustion** surfaces as a non-zero exit + a recognizable error
string from `claude -p`. The driver catches it, logs a `quota_exhausted`
event, and exits with code 2. A cron wrapper (or human) can re-run later
and pick up.

**Corruption recovery.** If a file looks present but malformed (e.g., a
dossier with no Sources section), the relevant stage's linter renames it to
`*.malformed.<ts>` and re-spawns. The linter is a tiny shell + jq affair —
not another Claude call — so it can't burn quota itself.

---

## 5. Logging

Two log streams per run:

- `logs/driver.log` — human-readable, what's happening now, one line per
  meaningful event. Tail-able during a run.
- `logs/invocations.jsonl` — machine-readable, one line per `claude -p` call:

  ```json
  {
    "ts": "2026-05-10T14:22:01Z",
    "stage": "02_theses",
    "unit": "NVDA",
    "role": "bull_author",
    "model": "claude-sonnet-4-6",
    "duration_s": 47.3,
    "exit_code": 0,
    "input_tokens": 8421,
    "output_tokens": 2103,
    "cost_usd": 0.041,
    "output_path": "runs/2026-05-10/02_theses/NVDA/bull.md"
  }
  ```

After a run, a small `analyze.sh` rolls up `invocations.jsonl` into:

- total cost, total wall time, calls per stage
- p50/p95 duration per role (find slow prompts)
- exit-code histogram (find flaky prompts)
- aggregate token usage per model (validate model choices)

This is the iteration loop: read the logs, find the weakest agent (e.g.,
"bear critics keep scoring everything 8/10"), edit `prompts/bear_critic.md`,
re-run.

---

## 6. Truth-seeking levers

Concentrated in one section because this is the part most likely to need
tuning over time:

- **Citations required.** Numeric claims without `[n]` markers are linted
  out before the thesis stage consumes the dossier.
- **Falsification mandatory.** Every thesis has an "I am wrong if..."
  section; debates explicitly cite falsifiers from the opposing thesis.
- **Base rates.** Authors must state the base rate for their claim
  ("how often does a stock at 40× forward earnings beat the market over
  12 months?") before stating the specific case.
- **Anonymized judging.** Judges don't see ticker names until after scoring.
- **Diverse panel.** Three judges with different temperatures + one with an
  adversarial system prompt biased toward skepticism.
- **No model self-grading.** The bull author for ticker X is never the bear
  author for ticker X (different invocations, fresh context — guaranteed by
  the spawn model). Critic and author are separate calls.
- **Calibration check.** After the tournament, a final agent reads each
  judge's verdict and rates it on internal consistency (did the reasoning
  match the scores?). Inconsistent verdicts get flagged in the report — we
  don't auto-discard, but we surface them for human review.

---

## 7. Files in the repo

```
thesis_screener/
├── DESIGN.md                 # this document
├── run.sh                    # the driver — entrypoint
├── lib/
│   ├── spawn.sh              # claude -p wrapper + logging
│   ├── stages.sh             # stage_00 .. stage_04 functions
│   └── lint.sh               # citation/section linters
├── prompts/
│   ├── 00_classify_ai.md
│   ├── 01_research_dossier.md
│   ├── 02_bull_author.md
│   ├── 02_bear_author.md
│   ├── 02_bull_critic.md
│   ├── 02_bear_critic.md
│   ├── 03_advocate.md
│   ├── 03_judge_default.md
│   ├── 03_judge_skeptical.md
│   └── 04_final_report.md
└── runs/                     # gitignored; one dir per monthly run
```

Total: ~12 prompt files and ~3 shell files. No Python, no dependencies
beyond `bash`, `jq`, `claude`, `xargs`.

---

## 8. Open questions for review

1. **Universe source.** Wikipedia is fine for SP500 membership but won't
   give us fundamentals. Do we want one additional data-source dependency
   (e.g., yfinance) to ground the valuation section, or trust web search?
   Recommendation: trust web search for v1, add a data source only if
   dossiers are systematically wrong on numbers.
2. **Bracket vs round-robin.** A 16-stock round-robin is 120 matches —
   ~15× the cost. Bracket is cheaper but seeding matters more. v1 = bracket.
3. **Re-running monthly.** Do we want cross-run memory (last month's
   final 4, did they actually beat the market)? Cheap to add: a
   `runs/_history.jsonl` updated at the end of each run + an agent that
   reads it in stage 04 to call out repeat picks and past misses.
   Recommendation: add in v1, it's basically free and makes the system
   self-correcting over time.
