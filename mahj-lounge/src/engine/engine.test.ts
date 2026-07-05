import { describe, expect, it } from 'vitest';
import { buildDeck, countTiles, JOKER, TileId } from './tiles';
import { allConcreteHands, CARD, concretize } from './card';
import { claimOptions, evaluateHand, findWin } from './match';
import { chooseClaim, chooseDiscard } from './ai';
import { MahjGame } from './game';

describe('deck', () => {
  it('has exactly 152 tiles with American composition', () => {
    const deck = buildDeck();
    expect(deck.length).toBe(152);
    const counts = countTiles(deck);
    expect(counts.get('D5')).toBe(4);
    expect(counts.get('C9')).toBe(4);
    expect(counts.get('WN')).toBe(4);
    expect(counts.get('GS')).toBe(4);
    expect(counts.get('FL')).toBe(8);
    expect(counts.get(JOKER)).toBe(8);
  });
});

describe('card', () => {
  it('every hand totals exactly 14 tiles', () => {
    for (const h of CARD) {
      const total = h.groups.reduce((s, g) => s + g.count, 0);
      expect(total, `${h.id} (${h.display})`).toBe(14);
    }
  });

  it('every hand concretizes to at least one arrangement', () => {
    for (const h of CARD) {
      expect(concretize(h).length, h.id).toBeGreaterThan(0);
    }
  });

  it('concrete hands never require more copies of a tile than exist', () => {
    for (const hand of allConcreteHands()) {
      const need = new Map<TileId, number>();
      for (const g of hand.groups) need.set(g.tile, (need.get(g.tile) ?? 0) + g.count);
      for (const [tile, n] of need) {
        const supply = tile === 'FL' ? 8 : 4;
        // Shortfall beyond real copies must be joker-fillable (3+ groups only).
        const jokerless = hand.groups
          .filter((g) => g.tile === tile && !g.jokerOk)
          .reduce((s, g) => s + g.count, 0);
        expect(jokerless, `${hand.pattern.id} ${tile}`).toBeLessThanOrEqual(supply);
        expect(n, `${hand.pattern.id} ${tile}`).toBeLessThanOrEqual(supply + 8);
      }
    }
  });
});

describe('win detection', () => {
  const evens = ['D2', 'D2', 'D2', 'D4', 'D4', 'D4', 'D4', 'D6', 'D6', 'D6', 'D8', 'D8', 'D8', 'D8'];

  it('recognizes a complete hand', () => {
    const win = findWin(evens, []);
    expect(win?.pattern.id).toBe('even-1');
  });

  it('allows jokers in groups of 3+', () => {
    const withJoker = [...evens.slice(0, 13), JOKER];
    expect(findWin(withJoker, [])?.pattern.id).toBe('even-1');
  });

  it('rejects jokers standing in for singles or pairs', () => {
    // year-1: FF 2026 2026 2026 — the soap and 6 are singles, the 2s a pair.
    const hand = [
      'FL', 'FL',
      'D2', 'D2', 'GS', 'D6',
      'B2', 'B2', 'GS', 'B6',
      'C2', 'C2', 'GS', JOKER, // joker replacing the single C6 — not allowed
    ];
    expect(findWin(hand, [])).toBeNull();
  });

  it('rejects a 13-tile rack', () => {
    expect(findWin(evens.slice(0, 13), [])).toBeNull();
  });

  it('validates exposures against the pattern', () => {
    const concealed = ['D2', 'D2', 'D2', 'D4', 'D4', 'D4', 'D4', 'D6', 'D6', 'D6'];
    const exposures = [{ tile: 'D8', tiles: ['D8', 'D8', 'D8', 'D8'], count: 4 }];
    expect(findWin(concealed, exposures)?.pattern.id).toBe('even-1');
  });

  it('refuses exposures on concealed-only hands', () => {
    const concealed = ['FL', 'FL', 'D1', 'D1', 'D2', 'D2', 'D3', 'D3', 'D4', 'D4'];
    const exposures = [{ tile: 'D5', tiles: ['D5', 'D5', 'D5', 'D5'], count: 4 }];
    expect(findWin(concealed, exposures)).toBeNull();
  });
});

describe('evaluation & claims', () => {
  it('counts missing tiles sensibly', () => {
    const hand = ['D2', 'D2', 'D2', 'D4', 'D4', 'D4', 'D4', 'D6', 'D6', 'D6', 'D8', 'D8', 'D8'];
    const target = allConcreteHands().find(
      (h) => h.pattern.id === 'even-1' && h.groups[0].tile === 'D2',
    )!;
    expect(evaluateHand(hand, [], target).missing).toBe(1);
  });

  it('offers exposure claims when holding count-1 matching tiles', () => {
    const hand = ['D8', 'D8', 'D8', 'D2', 'D2', 'D4', 'B1', 'B5', 'C3', 'C7', 'WN', 'GS', 'FL'];
    const opts = claimOptions(hand, [], 'D8');
    expect(opts.some((o) => o.group.count === 4)).toBe(true);
  });

  it('never claims a discarded joker', () => {
    const hand = [JOKER, JOKER, 'D8', 'D8', 'D2', 'D2', 'D4', 'B1', 'B5', 'C3', 'C7', 'WN', 'FL'];
    expect(claimOptions(hand, [], JOKER).length).toBe(0);
  });
});

describe('full game simulation', () => {
  it('plays 12 seeded games to completion without breaking invariants', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const game = new MahjGame(seed);

      const totalTiles = () =>
        game.wall.length +
        game.hands.flat().length +
        game.discards.length +
        (game.lastDiscard ? 1 : 0) +
        game.exposures.flat().reduce((s, e) => s + e.tiles.length, 0);

      // Drive the human seat with the same bot policies.
      let guard = 0;
      while (game.phase.t !== 'over' && guard++ < 800) {
        expect(totalTiles()).toBe(152);
        const phase = game.phase;
        if (phase.t === 'charleston') {
          game.charlestonPass(
            game.hands[0].filter((t) => t !== JOKER).slice(0, 3),
          );
        } else if (phase.t === 'charleston-query') {
          game.charlestonDecision(seed % 2 === 0);
        } else if (phase.t === 'courtesy-query') {
          game.courtesy(0, []);
        } else if (phase.t === 'claim') {
          if (game.humanClaim?.canMahjong) game.humanClaimDecision('mahjong');
          else {
            const opt = chooseClaim(game.hands[0], game.exposures[0], game.lastDiscard!.tile);
            game.humanClaimDecision(opt ?? 'pass');
          }
        } else if (phase.t === 'turn' && phase.player === 0) {
          const win = findWin(game.hands[0], game.exposures[0]);
          if (win) game.declareMahjong();
          else game.discard(chooseDiscard(game.hands[0], game.exposures[0]));
        } else {
          game.stepBot();
        }
      }
      expect(game.phase.t).toBe('over');
      if (game.winner) {
        expect(game.winner.points).toBeGreaterThanOrEqual(25);
      }
    }
  }, 120000);
});
