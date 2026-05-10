#!/usr/bin/env python3
"""Roll up runs/<date>/log.jsonl into totals by role."""
import json, pathlib, sys, collections

path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else max(pathlib.Path("runs").glob("*/log.jsonl"))
rows = [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
by_role = collections.defaultdict(lambda: {"calls": 0, "cost": 0.0, "secs": 0.0, "in": 0, "out": 0, "fail": 0})
for r in rows:
    b = by_role[r["role"]]
    b["calls"] += 1
    b["cost"] += r.get("cost_usd") or 0
    b["secs"] += r.get("duration_s") or 0
    b["in"]   += r.get("input_tokens") or 0
    b["out"]  += r.get("output_tokens") or 0
    b["fail"] += 1 if r.get("is_error") else 0
print(f"{'role':<10} {'calls':>6} {'fail':>5} {'cost_usd':>10} {'secs':>8} {'in_tok':>10} {'out_tok':>10}")
for role, b in by_role.items():
    print(f"{role:<10} {b['calls']:>6} {b['fail']:>5} {b['cost']:>10.2f} {b['secs']:>8.0f} {b['in']:>10} {b['out']:>10}")
tot = lambda k: sum(b[k] for b in by_role.values())
print(f"{'TOTAL':<10} {tot('calls'):>6} {tot('fail'):>5} {tot('cost'):>10.2f} {tot('secs'):>8.0f} {tot('in'):>10} {tot('out'):>10}")
