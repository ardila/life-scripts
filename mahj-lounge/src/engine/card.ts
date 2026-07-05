// ---------------------------------------------------------------------------
// The Lounge Card, No. 1 — an original set of American Mahjong hands.
//
// American Mahjong is played against a card of valid hands. The official
// National Mah Jongg League card is copyrighted and changes yearly, so
// Mahj Lounge ships its own original card in the same spirit: familiar
// section names, 14-tile hands, jokers allowed only in groups of 3+.
// ---------------------------------------------------------------------------

import {
  DRAGON_OF_SUIT,
  DragonColor,
  Suit,
  SUITS,
  TileId,
  WindDir,
  dragonTile,
  numTile,
  windTile,
  FLOWER,
} from './tiles';

export type SuitVar = 'A' | 'B' | 'C';
export type NumRef = number | { run: number }; // {run:k} => base + k

export type TileSpec =
  | { t: 'flower' }
  | { t: 'wind'; dir: WindDir }
  | { t: 'dragon'; color: DragonColor } // a specific color (soap plays as 0)
  | { t: 'dragonOf'; suit: SuitVar } // the dragon matching a suit variable
  | { t: 'dragonAny' } // any one dragon color
  | { t: 'num'; suit: SuitVar; num: NumRef };

export type GroupSpec = { count: number; tile: TileSpec };

export type HandPattern = {
  id: string;
  section: string;
  display: string;
  points: number;
  concealed: boolean;
  groups: GroupSpec[];
  /** Allowed values for the run base when any group uses {run:k}. */
  runBases?: number[];
  note?: string;
};

// -- tiny builders to keep the card readable --------------------------------
const F = (count: number): GroupSpec => ({ count, tile: { t: 'flower' } });
const N = (suit: SuitVar, num: NumRef, count: number): GroupSpec => ({
  count,
  tile: { t: 'num', suit, num },
});
const W = (dir: WindDir, count: number): GroupSpec => ({
  count,
  tile: { t: 'wind', dir },
});
const SOAP = (count: number): GroupSpec => ({
  count,
  tile: { t: 'dragon', color: 'soap' },
});
const DOF = (suit: SuitVar, count: number): GroupSpec => ({
  count,
  tile: { t: 'dragonOf', suit },
});
const DANY = (count: number): GroupSpec => ({ count, tile: { t: 'dragonAny' } });
const R = (k: number): NumRef => ({ run: k });

export const CARD: HandPattern[] = [
  // ----- Year · 2026 -----
  {
    id: 'year-1',
    section: 'Year · 2026',
    display: 'FF 2026 2026 2026',
    points: 25,
    concealed: false,
    note: 'Pairs of 2, a soap for 0, and a 6 — once in each suit.',
    groups: [F(2), N('A', 2, 2), SOAP(1), N('A', 6, 1), N('B', 2, 2), SOAP(1), N('B', 6, 1), N('C', 2, 2), SOAP(1), N('C', 6, 1)],
  },
  {
    id: 'year-2',
    section: 'Year · 2026',
    display: '222 0000 222 6666',
    points: 25,
    concealed: false,
    note: 'Pungs of 2 in two suits, kong of soaps, kong of 6.',
    groups: [N('A', 2, 3), SOAP(4), N('B', 2, 3), N('B', 6, 4)],
  },
  {
    id: 'year-3',
    section: 'Year · 2026',
    display: 'FFF 2222 0000 666',
    points: 30,
    concealed: false,
    note: 'One suit.',
    groups: [F(3), N('A', 2, 4), SOAP(4), N('A', 6, 3)],
  },

  // ----- 2468 · Evens -----
  {
    id: 'even-1',
    section: '2468 · Evens',
    display: '222 4444 666 8888',
    points: 25,
    concealed: false,
    note: 'One suit.',
    groups: [N('A', 2, 3), N('A', 4, 4), N('A', 6, 3), N('A', 8, 4)],
  },
  {
    id: 'even-2',
    section: '2468 · Evens',
    display: '2222 4444 666 888',
    points: 25,
    concealed: false,
    note: 'Kongs in one suit, pungs in a second.',
    groups: [N('A', 2, 4), N('A', 4, 4), N('B', 6, 3), N('B', 8, 3)],
  },
  {
    id: 'even-3',
    section: '2468 · Evens',
    display: 'FF 222 444 666 888',
    points: 30,
    concealed: false,
    note: 'One suit.',
    groups: [F(2), N('A', 2, 3), N('A', 4, 3), N('A', 6, 3), N('A', 8, 3)],
  },

  // ----- Any Like Numbers -----
  {
    id: 'like-1',
    section: 'Any Like Numbers',
    display: 'FF 1111 1111 1111',
    points: 25,
    concealed: false,
    note: 'Kongs of any one number in all three suits.',
    runBases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    groups: [F(2), N('A', R(0), 4), N('B', R(0), 4), N('C', R(0), 4)],
  },
  {
    id: 'like-2',
    section: 'Any Like Numbers',
    display: '111 DDDD 111 DDDD',
    points: 30,
    concealed: false,
    note: 'Pungs of any number in two suits, kongs of the matching dragons.',
    runBases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    groups: [N('A', R(0), 3), DOF('A', 4), N('B', R(0), 3), DOF('B', 4)],
  },

  // ----- Consecutive Run -----
  {
    id: 'run-1',
    section: 'Consecutive Run',
    display: '111 222 3333 4444',
    points: 25,
    concealed: false,
    note: 'Any four consecutive numbers, one suit.',
    runBases: [1, 2, 3, 4, 5, 6],
    groups: [N('A', R(0), 3), N('A', R(1), 3), N('A', R(2), 4), N('A', R(3), 4)],
  },
  {
    id: 'run-2',
    section: 'Consecutive Run',
    display: 'FF 111 222 333 444',
    points: 25,
    concealed: false,
    note: 'Any four consecutive numbers — first two pungs in one suit, next two in a second.',
    runBases: [1, 2, 3, 4, 5, 6],
    groups: [F(2), N('A', R(0), 3), N('A', R(1), 3), N('B', R(2), 3), N('B', R(3), 3)],
  },
  {
    id: 'run-3',
    section: 'Consecutive Run',
    display: '11 222 3333 444 55',
    points: 30,
    concealed: false,
    note: 'Any five consecutive numbers, one suit.',
    runBases: [1, 2, 3, 4, 5],
    groups: [N('A', R(0), 2), N('A', R(1), 3), N('A', R(2), 4), N('A', R(3), 3), N('A', R(4), 2)],
  },

  // ----- 13579 · Odds -----
  {
    id: 'odd-1',
    section: '13579 · Odds',
    display: '1111 333 555 7777',
    points: 25,
    concealed: false,
    note: 'Any four consecutive odd numbers, one suit.',
    runBases: [1, 3],
    groups: [N('A', R(0), 4), N('A', R(2), 3), N('A', R(4), 3), N('A', R(6), 4)],
  },
  {
    id: 'odd-2',
    section: '13579 · Odds',
    display: 'FF 1111 3333 5555',
    points: 25,
    concealed: false,
    note: 'Any three consecutive odd numbers, one suit.',
    runBases: [1, 3, 5],
    groups: [F(2), N('A', R(0), 4), N('A', R(2), 4), N('A', R(4), 4)],
  },
  {
    id: 'odd-3',
    section: '13579 · Odds',
    display: '555 7777 999 9999',
    points: 30,
    concealed: false,
    note: 'Three consecutive odds in one suit, kong of the highest in a second.',
    runBases: [1, 3, 5],
    groups: [N('A', R(0), 3), N('A', R(2), 4), N('A', R(4), 3), N('B', R(4), 4)],
  },

  // ----- Winds & Dragons -----
  {
    id: 'wind-1',
    section: 'Winds & Dragons',
    display: 'NNNN EEE WWW SSSS',
    points: 25,
    concealed: false,
    groups: [W('N', 4), W('E', 3), W('W', 3), W('S', 4)],
  },
  {
    id: 'wind-2',
    section: 'Winds & Dragons',
    display: 'NNN EEE WWW SSS DD',
    points: 30,
    concealed: false,
    note: 'Any dragon pair.',
    groups: [W('N', 3), W('E', 3), W('W', 3), W('S', 3), DANY(2)],
  },
  {
    id: 'wind-3',
    section: 'Winds & Dragons',
    display: 'FFFF DDD DDD DDDD',
    points: 30,
    concealed: false,
    note: 'All three dragon colors.',
    groups: [F(4), DOF('A', 3), DOF('B', 3), DOF('C', 4)],
  },

  // ----- 369 -----
  {
    id: '369-1',
    section: '369',
    display: 'FF 3333 6666 9999',
    points: 25,
    concealed: false,
    note: 'One suit.',
    groups: [F(2), N('A', 3, 4), N('A', 6, 4), N('A', 9, 4)],
  },
  {
    id: '369-2',
    section: '369',
    display: '333 666 999 333 66',
    points: 25,
    concealed: false,
    note: 'Pungs of 3-6-9 in one suit, pung of 3 and pair of 6 in a second.',
    groups: [N('A', 3, 3), N('A', 6, 3), N('A', 9, 3), N('B', 3, 3), N('B', 6, 2)],
  },
  {
    id: '369-3',
    section: '369',
    display: '333 6666 999 3333',
    points: 30,
    concealed: false,
    note: '3-6-9 in one suit, kong of 3 in a second.',
    groups: [N('A', 3, 3), N('A', 6, 4), N('A', 9, 3), N('B', 3, 4)],
  },

  // ----- Quints -----
  {
    id: 'quint-1',
    section: 'Quints',
    display: '11111 FFFF 11111',
    points: 40,
    concealed: false,
    note: 'Quints of any like number in two suits — jokers required!',
    runBases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    groups: [N('A', R(0), 5), F(4), N('B', R(0), 5)],
  },
  {
    id: 'quint-2',
    section: 'Quints',
    display: '11 222 3333 44444',
    points: 40,
    concealed: false,
    note: 'The Staircase — any four consecutive numbers, one suit.',
    runBases: [1, 2, 3, 4, 5, 6],
    groups: [N('A', R(0), 2), N('A', R(1), 3), N('A', R(2), 4), N('A', R(3), 5)],
  },

  // ----- Singles & Pairs (concealed) -----
  {
    id: 'sp-1',
    section: 'Singles & Pairs',
    display: 'FF 11 22 33 44 55 66',
    points: 50,
    concealed: true,
    note: 'Any six consecutive pairs, one suit. No jokers.',
    runBases: [1, 2, 3, 4],
    groups: [F(2), N('A', R(0), 2), N('A', R(1), 2), N('A', R(2), 2), N('A', R(3), 2), N('A', R(4), 2), N('A', R(5), 2)],
  },
  {
    id: 'sp-2',
    section: 'Singles & Pairs',
    display: '11 22 33 11 22 33 DD',
    points: 50,
    concealed: true,
    note: 'Any three consecutive pairs in two suits, any dragon pair. No jokers.',
    runBases: [1, 2, 3, 4, 5, 6, 7],
    groups: [N('A', R(0), 2), N('A', R(1), 2), N('A', R(2), 2), N('B', R(0), 2), N('B', R(1), 2), N('B', R(2), 2), DANY(2)],
  },
  {
    id: 'sp-3',
    section: 'Singles & Pairs',
    display: 'NN EE WW SS 11 11 11',
    points: 50,
    concealed: true,
    note: 'All wind pairs, plus pairs of any like number in all three suits. No jokers.',
    runBases: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    groups: [W('N', 2), W('E', 2), W('W', 2), W('S', 2), N('A', R(0), 2), N('B', R(0), 2), N('C', R(0), 2)],
  },
];

// ---------------------------------------------------------------------------
// Concretization — expand suit variables, run bases and dragon choices into
// concrete tile requirements the matcher can score against.
// ---------------------------------------------------------------------------

export type ConcreteGroup = { tile: TileId; count: number; jokerOk: boolean };
export type ConcreteHand = {
  pattern: HandPattern;
  groups: ConcreteGroup[];
};

const SUIT_PERMS: Suit[][] = [
  ['dot', 'bam', 'crak'],
  ['dot', 'crak', 'bam'],
  ['bam', 'dot', 'crak'],
  ['bam', 'crak', 'dot'],
  ['crak', 'dot', 'bam'],
  ['crak', 'bam', 'dot'],
];

function usedSuitVars(p: HandPattern): SuitVar[] {
  const used = new Set<SuitVar>();
  for (const g of p.groups) {
    if (g.tile.t === 'num' || g.tile.t === 'dragonOf') used.add(g.tile.suit);
  }
  return ['A', 'B', 'C'].filter((v) => used.has(v as SuitVar)) as SuitVar[];
}

function resolveNum(ref: NumRef, base: number): number | null {
  const n = typeof ref === 'number' ? ref : base + ref.run;
  return n >= 1 && n <= 9 ? n : null;
}

export function concretize(p: HandPattern): ConcreteHand[] {
  const out: ConcreteHand[] = [];
  const seen = new Set<string>();
  const vars = usedSuitVars(p);
  const bases = p.runBases ?? [0];
  const usesDragonAny = p.groups.some((g) => g.tile.t === 'dragonAny');
  const dragonChoices: DragonColor[] = usesDragonAny ? ['red', 'green', 'soap'] : ['red'];

  for (const perm of SUIT_PERMS) {
    const suitOf: Record<SuitVar, Suit> = { A: perm[0], B: perm[1], C: perm[2] };
    for (const base of bases) {
      for (const dAny of dragonChoices) {
        const groups: ConcreteGroup[] = [];
        let valid = true;
        for (const g of p.groups) {
          let tile: TileId;
          switch (g.tile.t) {
            case 'flower':
              tile = FLOWER;
              break;
            case 'wind':
              tile = windTile(g.tile.dir);
              break;
            case 'dragon':
              tile = dragonTile(g.tile.color);
              break;
            case 'dragonOf':
              tile = dragonTile(DRAGON_OF_SUIT[suitOf[g.tile.suit]]);
              break;
            case 'dragonAny':
              tile = dragonTile(dAny);
              break;
            case 'num': {
              const n = resolveNum(g.tile.num, base);
              if (n === null) {
                valid = false;
                break;
              }
              tile = numTile(suitOf[g.tile.suit], n);
              break;
            }
          }
          if (!valid) break;
          groups.push({ tile: tile!, count: g.count, jokerOk: g.count >= 3 });
        }
        if (!valid) continue;
        const key = groups.map((g) => `${g.tile}x${g.count}`).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ pattern: p, groups });
      }
    }
  }
  return out;
}

let cachedAll: ConcreteHand[] | null = null;
export function allConcreteHands(): ConcreteHand[] {
  if (!cachedAll) cachedAll = CARD.flatMap(concretize);
  return cachedAll;
}

export const CARD_SECTIONS: string[] = [...new Set(CARD.map((h) => h.section))];
