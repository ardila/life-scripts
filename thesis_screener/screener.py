#!/usr/bin/env python3
"""Thesis screener — see DESIGN.md."""
from __future__ import annotations
import argparse, concurrent.futures, datetime, json, pathlib, random, re, subprocess, sys, time

ROOT = pathlib.Path(__file__).parent
PROMPTS = ROOT / "prompts"

def claude(prompt: str, model: str, effort: str, run: pathlib.Path, role: str, unit: str) -> dict:
    """One claude -p call. Returns parsed JSON envelope; logs to run/log.jsonl."""
    cmd = [
        "claude", "-p", prompt,
        "--model", model,
        "--effort", effort,
        "--output-format", "json",
        "--allowedTools", "WebSearch WebFetch",
    ]
    t0 = time.time()
    r = subprocess.run(cmd, capture_output=True, text=True)
    dt = time.time() - t0
    try:
        env = json.loads(r.stdout)
    except json.JSONDecodeError:
        env = {"is_error": True, "result": "", "stderr": r.stderr, "raw": r.stdout[:2000]}
    log = run / "log.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("a") as f:
        f.write(json.dumps({
            "ts": datetime.datetime.utcnow().isoformat() + "Z",
            "role": role, "unit": unit, "model": model, "effort": effort,
            "duration_s": round(dt, 1), "exit_code": r.returncode,
            "is_error": env.get("is_error", True),
            "cost_usd": env.get("total_cost_usd"),
            "input_tokens": env.get("usage", {}).get("input_tokens"),
            "output_tokens": env.get("usage", {}).get("output_tokens"),
        }) + "\n")
    if r.returncode != 0 or env.get("is_error"):
        raise RuntimeError(f"{role}/{unit} failed (rc={r.returncode}): {env.get('result') or r.stderr[:500]}")
    return env

def memo(path: pathlib.Path, fn):
    """Run fn() only if path doesn't exist. Atomic write."""
    if path.exists():
        return path.read_text()
    path.parent.mkdir(parents=True, exist_ok=True)
    text = fn()
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text)
    tmp.rename(path)
    return text

def discover(run, model, effort, max_tickers):
    out = run / "tickers.json"
    def go():
        prompt = (PROMPTS / "discover.md").read_text()
        env = claude(prompt, model, effort, run, "discover", "_")
        text = env["result"].strip()
        m = re.search(r"\[.*\]", text, re.DOTALL)
        if not m:
            raise RuntimeError(f"discover did not return a JSON array: {text[:500]}")
        return m.group(0)
    tickers = json.loads(memo(out, go))
    if max_tickers:
        tickers = tickers[:max_tickers]
    return tickers

def seed(ticker, run, model, effort):
    out = run / "seeds" / f"{ticker}.md"
    def go():
        prompt = (PROMPTS / "seed.md").read_text().replace("{TICKER}", ticker)
        env = claude(prompt, model, effort, run, "seed", ticker)
        return env["result"]
    memo(out, go)
    return out

def match(a_path, b_path, run, round_n, model, effort):
    """a_path, b_path are seed Paths. Returns the winning Path. The judge
    picks 'A' or 'B'; orchestrator maps to the path mechanically so judge
    typos can't break the bracket."""
    a, b = a_path.stem, b_path.stem
    out = run / f"round_{round_n}" / f"{a}_vs_{b}.json"
    def go():
        prompt = (PROMPTS / "compete.md").read_text() \
            .replace("{A}", a_path.read_text()) \
            .replace("{B}", b_path.read_text())
        env = claude(prompt, model, effort, run, "match", f"{a}_vs_{b}")
        text = env["result"].strip()
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if not m:
            raise RuntimeError(f"match {a}_vs_{b} did not return JSON: {text[:500]}")
        return m.group(0)
    verdict = json.loads(memo(out, go))
    side = verdict.get("winner", "").strip().upper()
    if side not in ("A", "B"):
        raise RuntimeError(f"match {a}_vs_{b} winner is {side!r}, expected 'A' or 'B'")
    return a_path if side == "A" else b_path

def tournament(tickers, run, model, effort, parallel):
    survivors = [run / "seeds" / f"{t}.md" for t in tickers]
    round_n = 1
    while len(survivors) > 4:
        survivors.sort(key=lambda p: p.stem)        # deterministic input...
        random.Random(round_n).shuffle(survivors)   # ...seeded shuffle for diverse pairings
        pairs = list(zip(survivors[0::2], survivors[1::2]))
        bye = [survivors[-1]] if len(survivors) % 2 else []
        print(f"[round {round_n}] {len(survivors)} survivors → {len(pairs)} matches" + (" + 1 bye" if bye else ""))
        with concurrent.futures.ThreadPoolExecutor(parallel) as ex:
            winners = list(ex.map(lambda p: match(*p, run, round_n, model, effort), pairs))
        survivors = winners + bye
        round_n += 1
    return [s.stem for s in survivors]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="opus")
    ap.add_argument("--effort", default="max")
    ap.add_argument("--parallel", type=int, default=4)
    ap.add_argument("--max-tickers", type=int, default=0)
    ap.add_argument("--run-dir", default=None)
    args = ap.parse_args()

    run = pathlib.Path(args.run_dir) if args.run_dir else ROOT / "runs" / datetime.date.today().isoformat()
    run.mkdir(parents=True, exist_ok=True)
    print(f"run_dir = {run}")

    tickers = discover(run, args.model, args.effort, args.max_tickers)
    print(f"discovered {len(tickers)} tickers: {tickers}")

    with concurrent.futures.ThreadPoolExecutor(args.parallel) as ex:
        list(ex.map(lambda t: seed(t, run, args.model, args.effort), tickers))
    print(f"seeded {len(tickers)} dossiers")

    finalists = tournament(tickers, run, args.model, args.effort, args.parallel)
    (run / "final.json").write_text(json.dumps(finalists, indent=2))
    print(f"finalists: {finalists}")

if __name__ == "__main__":
    sys.exit(main())
