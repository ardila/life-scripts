// ---------------------------------------------------------------------------
// Tiles — the American Mahjong set: 152 tiles.
//   3 suits (dots, bams, craks) × numbers 1–9 × 4 copies  = 108
//   4 winds (N E W S) × 4 copies                          =  16
//   3 dragons (red, green, soap/white) × 4 copies         =  12
//   8 flowers                                             =   8
//   8 jokers                                              =   8
// Tiles are represented as short string ids so multiset math stays simple.
// ---------------------------------------------------------------------------

export type Suit = 'dot' | 'bam' | 'crak';
export type WindDir = 'N' | 'E' | 'W' | 'S';
export type DragonColor = 'red' | 'green' | 'soap';

export const SUITS: Suit[] = ['dot', 'bam', 'crak'];
export const WINDS: WindDir[] = ['N', 'E', 'W', 'S'];
export const DRAGONS: DragonColor[] = ['red', 'green', 'soap'];

// In American Mahjong each dragon "belongs" to a suit:
// red ↔ craks, green ↔ bams, soap (white) ↔ dots. Soap also plays as zero.
export const DRAGON_OF_SUIT: Record<Suit, DragonColor> = {
  crak: 'red',
  bam: 'green',
  dot: 'soap',
};

/** Tile ids: D1–D9, B1–B9, C1–C9, WN/WE/WW/WS, GR/GG/GS, FL, JK */
export type TileId = string;

export const JOKER: TileId = 'JK';
export const FLOWER: TileId = 'FL';

export const numTile = (suit: Suit, n: number): TileId =>
  (suit === 'dot' ? 'D' : suit === 'bam' ? 'B' : 'C') + n;

export const windTile = (dir: WindDir): TileId => 'W' + dir;

export const dragonTile = (color: DragonColor): TileId =>
  color === 'red' ? 'GR' : color === 'green' ? 'GG' : 'GS';

export function parseTile(id: TileId): {
  kind: 'num' | 'wind' | 'dragon' | 'flower' | 'joker';
  suit?: Suit;
  n?: number;
  dir?: WindDir;
  color?: DragonColor;
} {
  if (id === JOKER) return { kind: 'joker' };
  if (id === FLOWER) return { kind: 'flower' };
  if (id[0] === 'W') return { kind: 'wind', dir: id[1] as WindDir };
  if (id[0] === 'G')
    return {
      kind: 'dragon',
      color: id[1] === 'R' ? 'red' : id[1] === 'G' ? 'green' : 'soap',
    };
  const suit: Suit = id[0] === 'D' ? 'dot' : id[0] === 'B' ? 'bam' : 'crak';
  return { kind: 'num', suit, n: Number(id.slice(1)) };
}

export function isJoker(id: TileId): boolean {
  return id === JOKER;
}

/** Full 152-tile deck. */
export function buildDeck(): TileId[] {
  const deck: TileId[] = [];
  for (const s of SUITS)
    for (let n = 1; n <= 9; n++)
      for (let c = 0; c < 4; c++) deck.push(numTile(s, n));
  for (const w of WINDS) for (let c = 0; c < 4; c++) deck.push(windTile(w));
  for (const d of DRAGONS) for (let c = 0; c < 4; c++) deck.push(dragonTile(d));
  for (let c = 0; c < 8; c++) deck.push(FLOWER);
  for (let c = 0; c < 8; c++) deck.push(JOKER);
  return deck;
}

export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Counts by tile id. */
export function countTiles(tiles: TileId[]): Map<TileId, number> {
  const m = new Map<TileId, number>();
  for (const t of tiles) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/** Stable, human-friendly sort for a rack of tiles. */
const SORT_ORDER: Record<string, number> = { D: 0, B: 1, C: 2, W: 3, G: 4 };
export function sortTiles(tiles: TileId[]): TileId[] {
  const key = (id: TileId): [number, number] => {
    if (id === JOKER) return [6, 0];
    if (id === FLOWER) return [5, 0];
    const fam = SORT_ORDER[id[0]] ?? 7;
    if (id[0] === 'W') return [fam, 'ENWS'.indexOf(id[1])];
    if (id[0] === 'G') return [fam, 'RGS'.indexOf(id[1])];
    return [fam, Number(id.slice(1))];
  };
  return tiles
    .slice()
    .sort((a, b) => {
      const [fa, na] = key(a);
      const [fb, nb] = key(b);
      return fa - fb || na - nb;
    });
}

/** Short display label, used in logs and the card browser. */
export function tileLabel(id: TileId): string {
  const p = parseTile(id);
  switch (p.kind) {
    case 'joker':
      return 'Joker';
    case 'flower':
      return 'Flower';
    case 'wind':
      return { N: 'North', E: 'East', W: 'West', S: 'South' }[p.dir!];
    case 'dragon':
      return { red: 'Red Dragon', green: 'Green Dragon', soap: 'Soap' }[p.color!];
    default:
      return `${p.n} ${p.suit === 'dot' ? 'Dot' : p.suit === 'bam' ? 'Bam' : 'Crak'}`;
  }
}
