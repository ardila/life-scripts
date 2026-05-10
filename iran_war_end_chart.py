"""
Polymarket-implied probability that US-Iran military operations end by ~June 1, 2026.

Synthesizes a time series from the May-31 outcomes of two multi-outcome
Polymarket events ('Trump announces end of operations' and 'US x Iran
permanent peace deal'), with the June-30 outcome plotted as a reference
line and a single-outcome 'Iranian regime falls by May 31' market as a
sanity-check sidebar.

Run: python iran_war_end_chart.py
Outputs:
  ./output/iran_war_end_by_june_1.png
  ./output/iran_markets_timeseries.csv
"""

from __future__ import annotations

import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pandas as pd
import requests
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

GAMMA = "https://gamma-api.polymarket.com"
CLOB = "https://clob.polymarket.com"

CACHE_DIR = Path("./cache")
OUT_DIR = Path("./output")
CACHE_DIR.mkdir(exist_ok=True)
OUT_DIR.mkdir(exist_ok=True)

EVENT_SLUGS = {
    "trump_end":  "trump-announces-end-of-military-operations-against-iran-by",
    "peace_deal": "us-x-iran-permanent-peace-deal-by",
    "no_strike":  "iran-x-israelus-conflict-ends-by",
    "regime":     "will-the-iranian-regime-fall-by-may-31",
}

# The two main constituent series for the synthesis. Equal-weighted.
MAIN_KEYS = ["trump_end", "peace_deal"]

TARGET_DATES = ("May 31", "June 30")

ANNOTATIONS = [
    ("2026-02-28", "Op. Epic Fury starts"),
    ("2026-04-07", "First ceasefire"),
    ("2026-04-12", "Islamabad talks collapse"),
    ("2026-04-13", "Hormuz blockade announced"),
    ("2026-04-29", "War Powers 60-day clock"),
]


def _cache_path(url: str) -> Path:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    safe = "".join(c if c.isalnum() else "_" for c in url)[:180]
    return CACHE_DIR / f"{today}_{safe}.json"


def fetch_json(url: str, retries: int = 3) -> dict | list | None:
    cache = _cache_path(url)
    if cache.exists():
        return json.loads(cache.read_text())
    last_err: Exception | None = None
    for i in range(retries):
        try:
            r = requests.get(url, timeout=30, headers={"Accept": "application/json"})
            if r.status_code == 404:
                print(f"WARN 404 for {url}", file=sys.stderr)
                return None
            r.raise_for_status()
            data = r.json()
            cache.write_text(json.dumps(data))
            return data
        except Exception as e:
            last_err = e
            time.sleep(2 ** i)
    print(f"WARN fetch failed for {url}: {last_err}", file=sys.stderr)
    return None


# ----- Gamma resolution -----------------------------------------------------

@dataclass
class MarketInfo:
    key: str            # short label for the source event
    market_id: str
    outcome_label: str  # groupItemTitle, e.g. "May 31"
    yes_token_id: str
    no_token_id: str
    snapshot_yes: float | None
    closed: bool
    end_date: str | None


def resolve_event(slug: str, key: str) -> list[MarketInfo]:
    data = fetch_json(f"{GAMMA}/events?slug={slug}")
    if not data:
        return []
    if not isinstance(data, list) or not data:
        print(f"WARN gamma returned no event for slug={slug}", file=sys.stderr)
        return []

    # Multiple events can share a slug pattern after relaunches. Pick the
    # currently-active one (closed=false, endDate in the future).
    now = datetime.now(timezone.utc)
    candidates = []
    for ev in data:
        if ev.get("closed"):
            continue
        end = ev.get("endDate")
        if end:
            try:
                end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
                if end_dt < now:
                    continue
            except Exception:
                pass
        candidates.append(ev)
    event = candidates[0] if candidates else data[0]

    out: list[MarketInfo] = []
    for m in event.get("markets", []):
        token_ids_raw = m.get("clobTokenIds")
        if isinstance(token_ids_raw, str):
            try:
                token_ids = json.loads(token_ids_raw)
            except Exception:
                token_ids = []
        else:
            token_ids = token_ids_raw or []
        if len(token_ids) < 2:
            continue

        prices_raw = m.get("outcomePrices")
        if isinstance(prices_raw, str):
            try:
                prices = json.loads(prices_raw)
            except Exception:
                prices = []
        else:
            prices = prices_raw or []
        snap_yes = float(prices[0]) if prices else None

        out.append(MarketInfo(
            key=key,
            market_id=str(m.get("id")),
            outcome_label=str(m.get("groupItemTitle") or m.get("outcome") or ""),
            yes_token_id=str(token_ids[0]),
            no_token_id=str(token_ids[1]),
            snapshot_yes=snap_yes,
            closed=bool(m.get("closed")),
            end_date=m.get("endDate"),
        ))
    return out


# ----- CLOB price history ---------------------------------------------------

def fetch_history(token_id: str, fidelity: int = 1440) -> pd.Series:
    """Returns a UTC-indexed Series of Yes prices."""
    url = f"{CLOB}/prices-history?market={token_id}&interval=max&fidelity={fidelity}"
    data = fetch_json(url)
    if not data or "history" not in data:
        return pd.Series(dtype=float)
    pts = data["history"]
    if not pts:
        return pd.Series(dtype=float)
    df = pd.DataFrame(pts)
    df["t"] = pd.to_datetime(df["t"], unit="s", utc=True)
    df = df.set_index("t")["p"].astype(float).sort_index()
    return df


def yes_series(mi: MarketInfo) -> pd.Series:
    """Pull Yes-price history; handle resolved markets and Yes/No swap heuristic."""
    s = fetch_history(mi.yes_token_id)

    # Resolved markets: anchor the YES series at the resolved value through today.
    # CLOB history often stops at a stale last-trade price and misses the
    # settlement jump, which would otherwise trigger a wrong Yes/No swap.
    if mi.closed and mi.snapshot_yes is not None and (mi.snapshot_yes >= 0.99 or mi.snapshot_yes <= 0.01):
        now = pd.Timestamp.now(tz="UTC").floor("D")
        if s.empty:
            print(f"INFO market {mi.market_id} ({mi.key} {mi.outcome_label}) resolved at {mi.snapshot_yes}; no history")
            return pd.Series([mi.snapshot_yes], index=[now], dtype=float)
        last_trade = s.index.max()
        if now > last_trade:
            fill_idx = pd.date_range(last_trade + pd.Timedelta(days=1), now, freq="1D", tz="UTC")
            s = pd.concat([s, pd.Series(mi.snapshot_yes, index=fill_idx, dtype=float)])
            print(f"INFO market {mi.market_id} ({mi.key} {mi.outcome_label}) resolved at {mi.snapshot_yes}; "
                  f"extended from {last_trade.date()} to {now.date()}")
        return s.sort_index()

    if s.empty:
        s_alt = fetch_history(mi.no_token_id)
        if not s_alt.empty and mi.snapshot_yes is not None:
            if abs(s_alt.iloc[-1] - mi.snapshot_yes) <= 0.05:
                print(f"INFO swapped Yes/No for market {mi.market_id} ({mi.key} {mi.outcome_label})")
                return s_alt
        return s

    if mi.snapshot_yes is not None and abs(s.iloc[-1] - mi.snapshot_yes) > 0.05:
        s_alt = fetch_history(mi.no_token_id)
        if not s_alt.empty and abs(s_alt.iloc[-1] - mi.snapshot_yes) < abs(s.iloc[-1] - mi.snapshot_yes):
            print(f"INFO swapped Yes/No for market {mi.market_id} ({mi.key} {mi.outcome_label})")
            return s_alt
    return s


# ----- Build the synthesized series ----------------------------------------

def to_daily(s: pd.Series) -> pd.Series:
    if s.empty:
        return s
    return s.resample("1D").last().ffill(limit=2)


def is_locked(s: pd.Series, hi: float = 0.99, lo: float = 0.01) -> bool:
    """Yes-token pinned at 0 or 1 over the last week => already resolved."""
    if s.empty:
        return False
    tail = s.tail(7).dropna()
    if tail.empty:
        return False
    return bool((tail >= hi).all() or (tail <= lo).all())


def build_frame() -> tuple[pd.DataFrame, dict[str, MarketInfo]]:
    cols: dict[str, pd.Series] = {}
    chosen: dict[str, MarketInfo] = {}

    for key, slug in EVENT_SLUGS.items():
        markets = resolve_event(slug, key)
        if not markets:
            print(f"WARN no markets resolved for {key} ({slug})", file=sys.stderr)
            continue

        if key == "regime":
            # Single-outcome event; first market is it.
            m = markets[0]
            s = to_daily(yes_series(m))
            if not s.empty and not is_locked(s):
                cols[f"{key}"] = s
                chosen[f"{key}"] = m
            continue

        for label in TARGET_DATES:
            picks = [m for m in markets if m.outcome_label.strip().lower() == label.lower()]
            if not picks:
                continue
            m = picks[0]
            s = to_daily(yes_series(m))
            if s.empty:
                print(f"WARN empty history for {key} {label}", file=sys.stderr)
                continue
            # is_locked skip is only for the optional sidebar markets (no_strike);
            # main constituents should still contribute their resolved value to the mean.
            if key not in MAIN_KEYS and is_locked(s):
                print(f"INFO skipping locked market {key} {label} (already resolved)")
                continue
            col = f"{key}__{label.replace(' ', '_').lower()}"
            cols[col] = s
            chosen[col] = m

    if not cols:
        raise SystemExit("No usable markets fetched. Aborting.")

    df = pd.concat(cols, axis=1).sort_index()
    df = df.ffill(limit=2)

    may_cols = [f"{k}__may_31" for k in MAIN_KEYS if f"{k}__may_31" in df.columns]
    jun_cols = [f"{k}__june_30" for k in MAIN_KEYS if f"{k}__june_30" in df.columns]

    df["P_may31_synth"] = df[may_cols].mean(axis=1) if may_cols else pd.NA
    df["P_jun30_synth"] = df[jun_cols].mean(axis=1) if jun_cols else pd.NA
    df["P_by_jun1_est"] = df["P_may31_synth"]  # closest tradeable proxy

    return df, chosen


# ----- Plot -----------------------------------------------------------------

def plot(df: pd.DataFrame, chosen: dict[str, MarketInfo]) -> Path:
    fig, ax = plt.subplots(figsize=(12, 6), dpi=100)

    # Constituent May 31 series (thin, faded)
    palette = {"trump_end": "#1f77b4", "peace_deal": "#d62728"}
    label_pretty = {
        "trump_end": "Trump end-of-ops, May 31",
        "peace_deal": "US-Iran peace deal, May 31",
    }
    for k in MAIN_KEYS:
        col = f"{k}__may_31"
        if col in df.columns:
            ax.plot(df.index, df[col] * 100, color=palette[k], alpha=0.35, linewidth=1.2,
                    label=label_pretty[k])

    # Synthesized May 31
    if "P_may31_synth" in df.columns:
        ax.plot(df.index, df["P_may31_synth"] * 100, color="black", linewidth=2.5,
                label="Synthesized P(end by ~Jun 1)  [= mean of May 31 markets]")

    # June 30 reference
    if "P_jun30_synth" in df.columns:
        ax.plot(df.index, df["P_jun30_synth"] * 100, color="gray", linewidth=1.2,
                linestyle="--", label="Synthesized P(end by Jun 30)  [reference]")

    # Regime-fall sidebar
    if "regime" in df.columns:
        ax.plot(df.index, df["regime"] * 100, color="#9467bd", linewidth=1.0, alpha=0.7,
                label="Iranian regime falls by May 31  [sidebar]")

    data_max_pct = 0.0
    for col in df.columns:
        v = df[col].max()
        if pd.notna(v):
            data_max_pct = max(data_max_pct, float(v) * 100)
    ymax = min(100, max(60, int(data_max_pct * 1.15) + 5))
    ax.set_ylim(0, ymax)
    ax.set_ylabel("Implied probability (%)")
    ax.set_xlabel("Date")
    ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f"{x:.0f}%"))
    ax.xaxis.set_major_locator(mdates.AutoDateLocator())
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
    ax.grid(True, alpha=0.25)

    # Annotations
    ymax_anno = ymax * 0.92
    for d, label in ANNOTATIONS:
        dt = pd.Timestamp(d, tz="UTC")
        if dt < df.index.min() or dt > df.index.max():
            continue
        ax.axvline(dt, color="black", alpha=0.15, linewidth=1)
        ax.annotate(label, xy=(dt, ymax_anno), xytext=(2, 0),
                    textcoords="offset points", rotation=90,
                    fontsize=8, color="dimgray", va="top")

    fig.suptitle("Polymarket-implied probability that US-Iran military operations end by ~June 1, 2026",
                 fontsize=13, fontweight="bold", y=0.98)
    ax.set_title("Synthesized from 'Trump announces end of operations' and 'US x Iran permanent peace deal' markets, May 31 outcome",
                 fontsize=10, color="#444", pad=8)

    ax.legend(loc="upper left", fontsize=8, framealpha=0.9)

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    fig.text(0.01, 0.01,
             f"Source: Polymarket Gamma + CLOB APIs. May 31 outcome used as closest tradeable proxy for 'by June 1'. "
             f"Last updated {ts}.",
             fontsize=7, color="#666")

    fig.tight_layout(rect=(0, 0.03, 1, 0.95))
    out = OUT_DIR / "iran_war_end_by_june_1.png"
    fig.savefig(out, dpi=100)
    plt.close(fig)
    return out


# ----- Summary stats -------------------------------------------------------

def pct(x) -> str:
    return "n/a" if pd.isna(x) else f"{x*100:.1f}%"


def summarize(df: pd.DataFrame) -> None:
    if df.empty:
        print("No data.")
        return
    latest = df.iloc[-1]
    last_day = df.index[-1]

    def at_offset(days: int):
        cutoff = last_day - timedelta(days=days)
        prior = df[df.index <= cutoff]
        return prior.iloc[-1] if not prior.empty else None

    p7 = at_offset(7)
    p30 = at_offset(30)

    print("=" * 72)
    print(f"As of {last_day.strftime('%Y-%m-%d')} (UTC)")
    print("-" * 72)
    print(f"Synthesized P(end by ~Jun 1)        : {pct(latest.get('P_by_jun1_est'))}")
    if p7 is not None and not pd.isna(p7.get("P_by_jun1_est")) and not pd.isna(latest.get("P_by_jun1_est")):
        print(f"  7-day change                      : {(latest['P_by_jun1_est']-p7['P_by_jun1_est'])*100:+.1f} pp")
    if p30 is not None and not pd.isna(p30.get("P_by_jun1_est")) and not pd.isna(latest.get("P_by_jun1_est")):
        print(f"  30-day change                     : {(latest['P_by_jun1_est']-p30['P_by_jun1_est'])*100:+.1f} pp")
    print("-" * 72)
    print("Constituents (May 31):")
    for k in MAIN_KEYS:
        col = f"{k}__may_31"
        print(f"  {k:<12} P(May 31)             : {pct(latest.get(col))}")
    print(f"Synthesized P(June 30)              : {pct(latest.get('P_jun30_synth'))}")
    print("Constituents (June 30):")
    for k in MAIN_KEYS:
        col = f"{k}__june_30"
        print(f"  {k:<12} P(June 30)            : {pct(latest.get(col))}")
    if "regime" in df.columns:
        print(f"Sidebar  P(regime falls by May 31)  : {pct(latest.get('regime'))}")
    print("=" * 72)


def main() -> None:
    df, chosen = build_frame()
    df.index.name = "date_utc"
    df.to_csv(OUT_DIR / "iran_markets_timeseries.csv")
    out = plot(df, chosen)
    print(f"Wrote {out}")
    print(f"Wrote {OUT_DIR/'iran_markets_timeseries.csv'}")
    summarize(df)


if __name__ == "__main__":
    main()
