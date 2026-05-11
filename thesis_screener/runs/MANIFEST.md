# Thesis Screener Run — 2026-05-10

First production run of the thesis screener with opus + max effort.

## Result

Final 3 finalists:

1. **GOOGL** — Alphabet (hyperscaler / vertically-integrated AI infrastructure)
2. **VST** — Vistra (independent power producer, nuclear + gas, AI power thesis)
3. **NRG** — NRG Energy (merchant gas IPP, AI power thesis)

The power-bottleneck thesis dominated the bracket; 2 of 3 finalists are utilities.

## Bracket

- 154 candidates discovered (long-only S&P 500 AI-exposed names)
- 6 rounds: 154 → 77 → 38 → 19 → 10 → 5 → 3
- 154 seeds + 181 matches (30 of those were cascading rate-limit fails on a
  quota crash, no real work; see Notes)
- 2 discover calls
- **Total cost: $467.57**

## Configuration

- Model: `opus`
- Effort: `max`
- Parallel: 6
- Prompts SHA (master at run time): `5b8cb46` (last commit before merge)
- Tickers: see `tickers.json` inside the tarball

## Artifacts

`run.tar.gz` (1.5 MB compressed, 4.4 MB uncompressed) contains:

```
test-deeper/
├── tickers.json
├── seeds/<TICKER>.md           # 154 dossiers
├── round_1/ … round_6/         # match verdicts (JSON)
├── final.json                  # ["GOOGL", "VST", "NRG"]
├── log.jsonl                   # one line per claude -p invocation
├── full-run.log                # driver stdout/stderr
└── stdout-rerun.log            # extra stdout from resume
```

Extract with `tar xzf run.tar.gz`.

## Notes

- **Quota exhaustion mid-run.** Org monthly limit was hit during R2. The
  `claude()` wrapper raised, killing the ThreadPoolExecutor; 30 cascading
  matches logged as fails (zero real cost — claude -p fast-failed in <2s
  each). Memo-pattern atomic writes meant no corrupt verdicts on disk; one
  re-launch picked up exactly where R2 stopped.
- **Judge typos: ACMR vs ACM.** Two separate judges (in R1 XOM_vs_ACM and
  R2 ACM_vs_CMS) returned the winner field as `"ACMR"` (ACM Research, a
  different company) when the input dossier was `ACM` (Aecom). Hand-patched
  both verdict files to `"ACM"` and re-launched. Each typo caused one extra
  re-launch.
- **Orphaned verdicts.** The patches changed the post-shuffle R2 pair
  structure, leading to a few R2 verdicts being written from one pair
  structure and then re-written from another. Visible as e.g. both
  `NVDA_vs_CDNS.json` and `VST_vs_NVDA.json` existing in `round_2/` — only
  one is the active edge feeding R3.
- **Bug to fix:** validate winner-field against the candidate ticker set
  before passing to next round; persist `survivors_round_N.json` so the
  bracket path is recoverable post-hoc.
