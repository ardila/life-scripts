// ---------------------------------------------------------------------------
// Matching & evaluation — score a rack against every concrete hand on the
// card, validate wins, and find legal exposures for a called discard.
//
// Joker rules (American): jokers substitute for any tile, but only inside
// groups of three or more. Singles and pairs must be the real tiles.
// ---------------------------------------------------------------------------

import { allConcreteHands, ConcreteGroup, ConcreteHand } from './card';
import { countTiles, JOKER, TileId } from './tiles';

/** A face-up called set on the table. `tile` is the tile it represents. */
export type Exposure = { tile: TileId; tiles: TileId[]; count: number };

export type HandEval = {
  hand: ConcreteHand;
  feasible: boolean; // exposures compatible & singles/pairs not impossible
  missing: number; // tiles still needed to complete (0 = mahjong)
};

/**
 * Evaluate one concrete hand against a rack.
 * `concealed` is the hidden rack (13 or 14 tiles); `exposures` are called sets.
 */
export function evaluateHand(
  concealed: TileId[],
  exposures: Exposure[],
  hand: ConcreteHand,
): HandEval {
  const infeasible: HandEval = { hand, feasible: false, missing: Infinity };
  if (hand.pattern.concealed && exposures.length > 0) return infeasible;

  // Match each exposure to a distinct group (exact tile, count, jokers ok).
  const remaining = matchExposures(hand.groups, exposures);
  if (remaining === null) return infeasible;

  const counts = countTiles(concealed);
  const jokers = counts.get(JOKER) ?? 0;

  // Group remaining requirements by tile id, splitting joker-eligible needs.
  const needStrict = new Map<TileId, number>(); // singles/pairs — real only
  const needFlex = new Map<TileId, number>(); // pungs+ — jokers allowed
  for (const g of remaining) {
    const m = g.jokerOk ? needFlex : needStrict;
    m.set(g.tile, (m.get(g.tile) ?? 0) + g.count);
  }

  let missing = 0;
  let jokerShortfall = 0;
  const ids = new Set<TileId>([...needStrict.keys(), ...needFlex.keys()]);
  for (const id of ids) {
    const have = id === JOKER ? 0 : counts.get(id) ?? 0;
    const strict = needStrict.get(id) ?? 0;
    const flex = needFlex.get(id) ?? 0;
    // Real tiles fill strict needs first — jokers can never cover those.
    const usedStrict = Math.min(have, strict);
    missing += strict - usedStrict; // unfillable by jokers; counts as missing
    const leftover = have - usedStrict;
    const usedFlex = Math.min(leftover, flex);
    jokerShortfall += flex - usedFlex;
  }
  missing += Math.max(0, jokerShortfall - jokers);

  return { hand, feasible: true, missing };
}

/** Assign exposures to groups; return the unmatched groups, or null. */
function matchExposures(
  groups: ConcreteGroup[],
  exposures: Exposure[],
): ConcreteGroup[] | null {
  if (exposures.length === 0) return groups;
  const used = new Array(groups.length).fill(false);
  const assign = (i: number): boolean => {
    if (i === exposures.length) return true;
    const e = exposures[i];
    for (let g = 0; g < groups.length; g++) {
      if (used[g]) continue;
      const grp = groups[g];
      if (grp.tile === e.tile && grp.count === e.count && grp.jokerOk) {
        used[g] = true;
        if (assign(i + 1)) return true;
        used[g] = false;
      }
    }
    return false;
  };
  if (!assign(0)) return null;
  return groups.filter((_, i) => !used[i]);
}

/** Best few candidate hands for a rack, sorted by fewest missing tiles. */
export function rankHands(
  concealed: TileId[],
  exposures: Exposure[],
  limit = 5,
): HandEval[] {
  const evals: HandEval[] = [];
  for (const hand of allConcreteHands()) {
    const e = evaluateHand(concealed, exposures, hand);
    if (e.feasible) evals.push(e);
  }
  evals.sort((a, b) => a.missing - b.missing || b.hand.pattern.points - a.hand.pattern.points);
  // De-dupe by pattern id so the hint list reads well.
  const seen = new Set<string>();
  const out: HandEval[] = [];
  for (const e of evals) {
    if (seen.has(e.hand.pattern.id)) continue;
    seen.add(e.hand.pattern.id);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

/** Minimum missing-tile count across the whole card. */
export function bestMissing(concealed: TileId[], exposures: Exposure[]): number {
  let best = Infinity;
  for (const hand of allConcreteHands()) {
    const e = evaluateHand(concealed, exposures, hand);
    if (e.feasible && e.missing < best) {
      best = e.missing;
      if (best === 0) break;
    }
  }
  return best;
}

/**
 * Win check: a 14-tile position (concealed + exposures) matches some hand
 * exactly — every concealed tile used, jokers only in 3+ groups.
 */
export function findWin(
  concealed: TileId[],
  exposures: Exposure[],
): ConcreteHand | null {
  const exposedCount = exposures.reduce((s, e) => s + e.count, 0);
  if (concealed.length + exposedCount !== 14) return null;
  for (const hand of allConcreteHands()) {
    if (isExactWin(concealed, exposures, hand)) return hand;
  }
  return null;
}

function isExactWin(
  concealed: TileId[],
  exposures: Exposure[],
  hand: ConcreteHand,
): boolean {
  if (hand.pattern.concealed && exposures.length > 0) return false;
  const remaining = matchExposures(hand.groups, exposures);
  if (remaining === null) return false;

  const needed = remaining.reduce((s, g) => s + g.count, 0);
  if (needed !== concealed.length) return false;

  const counts = countTiles(concealed);
  let jokers = counts.get(JOKER) ?? 0;
  const pool = new Map(counts);
  pool.delete(JOKER);

  // Strict groups first (must be real tiles), then flexible groups.
  const ordered = [...remaining].sort((a, b) => Number(a.jokerOk) - Number(b.jokerOk));
  for (const g of ordered) {
    const have = pool.get(g.tile) ?? 0;
    const useReal = Math.min(have, g.count);
    pool.set(g.tile, have - useReal);
    const short = g.count - useReal;
    if (short > 0) {
      if (!g.jokerOk || jokers < short) return false;
      jokers -= short;
    }
  }
  // Every concealed tile must be consumed.
  if (jokers > 0) return false;
  for (const v of pool.values()) if (v > 0) return false;
  return true;
}

export type ClaimOption = {
  hand: ConcreteHand;
  group: ConcreteGroup; // the group the discard completes
  /** Tiles from the claimant's rack committed to the exposure (discard excluded). */
  commit: TileId[];
};

/**
 * Legal exposure claims for a discarded tile: the claimant holds count-1
 * matching tiles (real or joker) of some 3+ group on a non-concealed hand
 * compatible with their existing exposures.
 */
export function claimOptions(
  concealed: TileId[],
  exposures: Exposure[],
  discard: TileId,
): ClaimOption[] {
  if (discard === JOKER) return []; // a discarded joker can never be claimed
  const counts = countTiles(concealed);
  const real = counts.get(discard) ?? 0;
  const jokers = counts.get(JOKER) ?? 0;
  const options: ClaimOption[] = [];
  const seen = new Set<string>();

  for (const hand of allConcreteHands()) {
    if (hand.pattern.concealed) continue;
    for (const g of hand.groups) {
      if (!g.jokerOk || g.tile !== discard) continue;
      const need = g.count - 1;
      if (real + jokers < need) continue;
      // The rest of the hand must still be compatible with prior exposures.
      if (matchExposures(hand.groups, exposures) === null) continue;
      const key = `${g.tile}x${g.count}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const useReal = Math.min(real, need);
      const commit = [
        ...Array(useReal).fill(discard),
        ...Array(need - useReal).fill(JOKER),
      ];
      options.push({ hand, group: g, commit });
    }
  }
  options.sort((a, b) => a.group.count - b.group.count);
  return options;
}
