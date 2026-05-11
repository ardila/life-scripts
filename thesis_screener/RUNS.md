# Run index

Past runs of the thesis screener. Each row points to a branch holding the
run's artifacts (dossiers, verdicts, log, full tarball) and a `MANIFEST.md`
with cost and configuration.

The `runs/` directory is gitignored in `master` so the artifacts don't bloat
the working repo. They live on per-run branches named `runs/YYYY-MM-DD`.

To recover a run's artifacts:

```bash
git fetch origin runs/YYYY-MM-DD
git checkout runs/YYYY-MM-DD -- thesis_screener/runs/run.tar.gz
tar xzf thesis_screener/runs/run.tar.gz -C thesis_screener/runs/
cat thesis_screener/runs/MANIFEST.md  # also on the runs branch
```

| Date | Branch | Universe | Finalists | Cost | Model · Effort | Notes |
|---|---|---|---|---|---|---|
| 2026-05-10 | [`runs/2026-05-10`](../../tree/runs/2026-05-10) | 154 | GOOGL, VST, NRG | $467.57 | opus · max | First production run. Quota crash + 2 judge ACMR typos triggered restarts; memo-pattern recovered cleanly. 2 of 3 finalists are utilities — power-bottleneck thesis dominated. |
