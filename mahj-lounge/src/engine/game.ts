// ---------------------------------------------------------------------------
// Game state machine — deal, Charleston, turns, calls, joker swaps, wins.
// Player 0 is the human; play proceeds 0 → 1 → 2 → 3 (counterclockwise).
// Pass right = next player (i+1), across = i+2, left = i+3.
// ---------------------------------------------------------------------------

import { ConcreteHand } from './card';
import { claimOptions, ClaimOption, Exposure, findWin } from './match';
import {
  buildDeck,
  isJoker,
  JOKER,
  shuffle,
  sortTiles,
  TileId,
  tileLabel,
} from './tiles';
import { chooseClaim, chooseDiscard, choosePass, courtesyCount, without } from './ai';

export const PLAYER_NAMES = ['You', 'Ruthie', 'CeCe', 'Marlene'];

export type CharlestonDir = 'right' | 'across' | 'left';
export const CHARLESTON_STEPS: CharlestonDir[] = [
  'right',
  'across',
  'left', // first Charleston (mandatory)
  'left',
  'across',
  'right', // second Charleston (optional)
];

export type Phase =
  | { t: 'charleston'; step: number } // waiting on the human's 3 tiles
  | { t: 'charleston-query' } // continue to the second Charleston?
  | { t: 'courtesy-query' } // courtesy pass: how many (0–3)?
  | { t: 'turn'; player: number; drawn: TileId | null } // player holds 14, must discard
  | { t: 'claim' } // a discard is on the table; human may call
  | { t: 'over' };

export type Winner = {
  player: number;
  hand: ConcreteHand;
  points: number;
  selfDraw: boolean;
};

export type JokerSwap = {
  owner: number; // whose exposure holds the joker
  exposureIndex: number;
  tile: TileId; // the real tile the current player would give up
};

export type HumanClaim = {
  canMahjong: boolean;
  options: ClaimOption[];
};

type BotClaim =
  | { player: number; kind: 'mahjong' }
  | { player: number; kind: 'expose'; option: ClaimOption };

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MahjGame {
  wall: TileId[] = [];
  hands: TileId[][] = [[], [], [], []];
  exposures: Exposure[][] = [[], [], [], []];
  discards: { tile: TileId; from: number }[] = [];
  lastDiscard: { tile: TileId; from: number } | null = null;
  dealer = 0;
  phase: Phase = { t: 'over' };
  winner: Winner | null = null;
  log: string[] = [];
  humanClaim: HumanClaim | null = null;
  version = 0;

  private botClaims: BotClaim[] = [];
  private listeners = new Set<() => void>();
  private rng: () => number = Math.random;

  constructor(seed?: number) {
    if (seed !== undefined) this.rng = mulberry32(seed);
    this.deal();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.version++;
    this.listeners.forEach((fn) => fn());
  }

  private say(msg: string) {
    this.log.push(msg);
    if (this.log.length > 60) this.log.shift();
  }

  // ---- setup ---------------------------------------------------------------

  private deal() {
    this.wall = shuffle(buildDeck(), this.rng);
    this.dealer = Math.floor(this.rng() * 4);
    for (let p = 0; p < 4; p++) {
      this.hands[p] = sortTiles(this.wall.splice(0, 13));
    }
    // The dealer starts with a 14th tile and will discard first.
    this.hands[this.dealer] = sortTiles([...this.hands[this.dealer], this.wall.shift()!]);
    this.say(`${PLAYER_NAMES[this.dealer]} deal${this.dealer === 0 ? '' : 's'}. Charleston time — pick 3 tiles to pass right.`);
    this.phase = { t: 'charleston', step: 0 };
  }

  // ---- Charleston ----------------------------------------------------------

  /** Human submits 3 tiles for the current pass; bots pick theirs and all pass. */
  charlestonPass(humanTiles: TileId[]) {
    if (this.phase.t !== 'charleston') return;
    const step = this.phase.step;
    const dir = CHARLESTON_STEPS[step];
    const offset = dir === 'right' ? 1 : dir === 'across' ? 2 : 3;

    const picks: TileId[][] = [humanTiles];
    for (let p = 1; p < 4; p++) picks.push(choosePass(this.hands[p], 3));

    for (let p = 0; p < 4; p++)
      for (const t of picks[p]) this.hands[p] = without(this.hands[p], t);
    for (let p = 0; p < 4; p++) {
      const to = (p + offset) % 4;
      this.hands[to] = sortTiles([...this.hands[to], ...picks[p]]);
    }

    if (step === 2) {
      this.say('First Charleston done. Continue to a second?');
      this.phase = { t: 'charleston-query' };
    } else if (step === 5) {
      this.say('Charleston complete. Courtesy pass — exchange up to 3 with CeCe across.');
      this.phase = { t: 'courtesy-query' };
    } else {
      const next = CHARLESTON_STEPS[step + 1];
      this.say(`Passed ${dir}. Now pick 3 to pass ${next}.`);
      this.phase = { t: 'charleston', step: step + 1 };
    }
    this.notify();
  }

  /** Human answers the "second Charleston?" question. */
  charlestonDecision(cont: boolean) {
    if (this.phase.t !== 'charleston-query') return;
    if (cont) {
      this.say('Second Charleston — pick 3 to pass left.');
      this.phase = { t: 'charleston', step: 3 };
    } else {
      this.say('Skipping the second Charleston. Courtesy pass — exchange up to 3 with CeCe.');
      this.phase = { t: 'courtesy-query' };
    }
    this.notify();
  }

  /** Human chooses how many tiles to offer in the courtesy pass (0–3). */
  courtesy(humanCount: number, humanTiles: TileId[]) {
    if (this.phase.t !== 'courtesy-query') return;
    const wants = [
      humanCount,
      courtesyCount(this.hands[1]),
      courtesyCount(this.hands[2]),
      courtesyCount(this.hands[3]),
    ];
    for (const [a, b] of [
      [0, 2],
      [1, 3],
    ] as const) {
      const n = Math.min(wants[a], wants[b]);
      if (n === 0) continue;
      const fromA = a === 0 ? humanTiles.slice(0, n) : choosePass(this.hands[a], n);
      const fromB = choosePass(this.hands[b], n);
      for (const t of fromA) this.hands[a] = without(this.hands[a], t);
      for (const t of fromB) this.hands[b] = without(this.hands[b], t);
      this.hands[a] = sortTiles([...this.hands[a], ...fromB]);
      this.hands[b] = sortTiles([...this.hands[b], ...fromA]);
      if (a === 0) this.say(`Courtesy: exchanged ${n} tile${n === 1 ? '' : 's'} with CeCe.`);
    }
    this.say(`${PLAYER_NAMES[this.dealer]} open${this.dealer === 0 ? '' : 's'} the game.`);
    this.phase = { t: 'turn', player: this.dealer, drawn: null };
    this.notify();
  }

  // ---- turns ---------------------------------------------------------------

  /** True when the engine is waiting on a bot move (UI drives with a timer). */
  pendingBot(): boolean {
    return this.phase.t === 'turn' && this.phase.player !== 0;
  }

  /** Advance one bot turn: win check → joker swaps → discard. */
  stepBot() {
    if (this.phase.t !== 'turn' || this.phase.player === 0) return;
    const p = this.phase.player;

    const win = findWin(this.hands[p], this.exposures[p]);
    if (win) {
      this.declareWin(p, win, this.phase.drawn !== null);
      return;
    }
    for (const swap of this.availableJokerSwaps(p)) {
      this.applyJokerSwap(p, swap);
    }
    const tile = chooseDiscard(this.hands[p], this.exposures[p]);
    this.performDiscard(p, tile);
  }

  /** Human discards on their turn. */
  discard(tile: TileId) {
    if (this.phase.t !== 'turn' || this.phase.player !== 0) return;
    this.performDiscard(0, tile);
  }

  private performDiscard(p: number, tile: TileId) {
    this.hands[p] = without(this.hands[p], tile);
    this.lastDiscard = { tile, from: p };
    this.say(`${PLAYER_NAMES[p]} discard${p === 0 ? '' : 's'} ${tileLabel(tile)}.`);
    this.collectClaims();
  }

  // ---- claims --------------------------------------------------------------

  private collectClaims() {
    const { tile, from } = this.lastDiscard!;
    this.botClaims = [];
    for (let p = 1; p < 4; p++) {
      if (p === from) continue;
      const winHand = findWin([...this.hands[p], tile], this.exposures[p]);
      if (winHand) {
        this.botClaims.push({ player: p, kind: 'mahjong' });
        continue;
      }
      const opt = chooseClaim(this.hands[p], this.exposures[p], tile);
      if (opt) this.botClaims.push({ player: p, kind: 'expose', option: opt });
    }

    if (from !== 0 && !isJoker(tile)) {
      const canMahjong = findWin([...this.hands[0], tile], this.exposures[0]) !== null;
      const options = claimOptions(this.hands[0], this.exposures[0], tile);
      if (canMahjong || options.length > 0) {
        this.humanClaim = { canMahjong, options };
        this.phase = { t: 'claim' };
        this.notify();
        return;
      }
    }
    this.resolveClaims(null);
  }

  /** Human answers the claim prompt: 'pass', 'mahjong', or an exposure option. */
  humanClaimDecision(choice: 'pass' | 'mahjong' | ClaimOption) {
    if (this.phase.t !== 'claim') return;
    this.humanClaim = null;
    if (choice === 'pass') this.resolveClaims(null);
    else if (choice === 'mahjong') this.resolveClaims({ player: 0, kind: 'mahjong' });
    else this.resolveClaims({ player: 0, kind: 'expose', option: choice });
  }

  private resolveClaims(human: BotClaim | null) {
    const { tile, from } = this.lastDiscard!;
    const all = [...this.botClaims, ...(human ? [human] : [])];
    this.botClaims = [];
    const dist = (p: number) => (p - from + 4) % 4;
    all.sort(
      (a, b) =>
        Number(b.kind === 'mahjong') - Number(a.kind === 'mahjong') || dist(a.player) - dist(b.player),
    );
    const claim = all[0];

    if (!claim) {
      this.discards.push(this.lastDiscard!);
      this.lastDiscard = null;
      this.nextTurn((from + 1) % 4);
      return;
    }

    if (claim.kind === 'mahjong') {
      const p = claim.player;
      this.hands[p] = sortTiles([...this.hands[p], tile]);
      this.lastDiscard = null;
      const win = findWin(this.hands[p], this.exposures[p])!;
      this.declareWin(p, win, false);
      return;
    }

    // Exposure claim.
    const p = claim.player;
    const opt = claim.option;
    for (const t of opt.commit) this.hands[p] = without(this.hands[p], t);
    this.exposures[p] = [
      ...this.exposures[p],
      { tile: opt.group.tile, tiles: sortTiles([...opt.commit, tile]), count: opt.group.count },
    ];
    this.lastDiscard = null;
    const kind = opt.group.count === 3 ? 'pung' : opt.group.count === 4 ? 'kong' : 'quint';
    this.say(`${PLAYER_NAMES[p]} call${p === 0 ? '' : 's'} the ${tileLabel(tile)} for a ${kind}.`);
    this.phase = { t: 'turn', player: p, drawn: null };
    this.notify();
  }

  private nextTurn(p: number) {
    if (this.wall.length === 0) {
      this.say('The wall is empty — wall game. Nobody wins this one.');
      this.phase = { t: 'over' };
      this.notify();
      return;
    }
    const drawn = this.wall.shift()!;
    this.hands[p] = sortTiles([...this.hands[p], drawn]);
    if (p === 0) this.say(`You draw ${tileLabel(drawn)}.`);
    this.phase = { t: 'turn', player: p, drawn };
    this.notify();
  }

  // ---- jokers --------------------------------------------------------------

  /** Exposed jokers the given player could redeem with a real tile. */
  availableJokerSwaps(p: number): JokerSwap[] {
    const out: JokerSwap[] = [];
    for (let owner = 0; owner < 4; owner++) {
      this.exposures[owner].forEach((e, i) => {
        if (!e.tiles.includes(JOKER)) return;
        if (this.hands[p].includes(e.tile)) out.push({ owner, exposureIndex: i, tile: e.tile });
      });
    }
    return out;
  }

  /** Human joker swap on their turn. */
  swapJoker(swap: JokerSwap) {
    if (this.phase.t !== 'turn' || this.phase.player !== 0) return;
    this.applyJokerSwap(0, swap);
    this.notify();
  }

  private applyJokerSwap(p: number, swap: JokerSwap) {
    const e = this.exposures[swap.owner][swap.exposureIndex];
    const jk = e.tiles.indexOf(JOKER);
    if (jk === -1 || !this.hands[p].includes(swap.tile)) return;
    const tiles = e.tiles.slice();
    tiles[jk] = swap.tile;
    this.exposures[swap.owner] = this.exposures[swap.owner].map((x, i) =>
      i === swap.exposureIndex ? { ...x, tiles: sortTiles(tiles) } : x,
    );
    this.hands[p] = sortTiles([...without(this.hands[p], swap.tile), JOKER]);
    this.say(
      `${PLAYER_NAMES[p]} redeem${p === 0 ? '' : 's'} a joker from ${
        swap.owner === p ? (p === 0 ? 'your' : 'their') : `${PLAYER_NAMES[swap.owner]}'s`
      } ${tileLabel(e.tile)} exposure.`,
    );
  }

  // ---- winning -------------------------------------------------------------

  /** Human declares mahjong on their own turn (14 tiles in hand). */
  declareMahjong() {
    if (this.phase.t !== 'turn' || this.phase.player !== 0) return;
    const win = findWin(this.hands[0], this.exposures[0]);
    if (!win) return;
    this.declareWin(0, win, this.phase.drawn !== null);
  }

  private declareWin(p: number, hand: ConcreteHand, selfDraw: boolean) {
    // Jokerless singles-and-pairs style bonus is not modeled; base points only.
    this.winner = { player: p, hand, points: hand.pattern.points, selfDraw };
    this.say(
      `Mahjong! ${PLAYER_NAMES[p]} complete${p === 0 ? '' : 's'} “${hand.pattern.display}” for ${hand.pattern.points} points.`,
    );
    this.phase = { t: 'over' };
    this.notify();
  }
}
