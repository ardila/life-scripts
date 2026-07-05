// ---------------------------------------------------------------------------
// Bot brains — pleasant, competent opponents (not sharks).
// Strategy: chase the card hand with the fewest missing tiles.
// ---------------------------------------------------------------------------

import { bestMissing, claimOptions, ClaimOption, Exposure } from './match';
import { isJoker, TileId } from './tiles';

/** Remove one occurrence of a tile from a rack (returns a new array). */
export function without(hand: TileId[], tile: TileId): TileId[] {
  const i = hand.indexOf(tile);
  if (i === -1) return hand.slice();
  return [...hand.slice(0, i), ...hand.slice(i + 1)];
}

/** Pick the discard that leaves the strongest 13-tile rack. */
export function chooseDiscard(hand: TileId[], exposures: Exposure[]): TileId {
  let best: TileId | null = null;
  let bestScore = Infinity;
  const tried = new Set<TileId>();
  for (const t of hand) {
    if (isJoker(t) || tried.has(t)) continue; // never throw a joker
    tried.add(t);
    const m = bestMissing(without(hand, t), exposures);
    if (m < bestScore) {
      bestScore = m;
      best = t;
    }
  }
  // Rack of pure jokers can't happen in practice, but stay safe.
  return best ?? hand[0];
}

/** Choose `n` tiles to pass in the Charleston (jokers may never be passed). */
export function choosePass(hand: TileId[], n: number): TileId[] {
  let rack = hand.slice();
  const picks: TileId[] = [];
  for (let k = 0; k < n; k++) {
    let best: TileId | null = null;
    let bestScore = Infinity;
    const tried = new Set<TileId>();
    for (const t of rack) {
      if (isJoker(t) || tried.has(t)) continue;
      tried.add(t);
      const m = bestMissing(without(rack, t), []);
      if (m < bestScore) {
        bestScore = m;
        best = t;
      }
    }
    if (best === null) break;
    picks.push(best);
    rack = without(rack, best);
  }
  return picks;
}

/** How many tiles a bot wants to exchange in the courtesy pass (0–3). */
export function courtesyCount(hand: TileId[]): number {
  const m = bestMissing(hand, []);
  if (m <= 2) return 0;
  if (m === 3) return 1;
  if (m === 4) return 2;
  return 3;
}

/** Whether (and how) a bot wants to call a discard for an exposure. */
export function chooseClaim(
  hand: TileId[],
  exposures: Exposure[],
  discard: TileId,
): ClaimOption | null {
  const before = bestMissing(hand, exposures);
  let best: ClaimOption | null = null;
  let bestScore = Infinity;
  for (const opt of claimOptions(hand, exposures, discard)) {
    let rack = hand.slice();
    for (const t of opt.commit) rack = without(rack, t);
    const after = bestMissing(rack, [
      ...exposures,
      { tile: opt.group.tile, tiles: [...opt.commit, discard], count: opt.group.count },
    ]);
    // Claim only when it clearly advances the hand and keeps it viable.
    if (after < before && after <= 4 && after < bestScore) {
      bestScore = after;
      best = opt;
    }
  }
  return best;
}
