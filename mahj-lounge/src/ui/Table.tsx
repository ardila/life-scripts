import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CARD, CARD_SECTIONS } from '../engine/card';
import { CHARLESTON_STEPS, MahjGame, PLAYER_NAMES } from '../engine/game';
import { findWin, rankHands } from '../engine/match';
import { isJoker, tileLabel } from '../engine/tiles';
import { Tile, TileButton } from './Tile';

const BOT_DELAY_MS = 850;

export type SheetState = { open: boolean; focus?: string };

function useGame() {
  const ref = useRef<MahjGame | null>(null);
  if (!ref.current) ref.current = new MahjGame();
  const [game, setGame] = useState(ref.current);
  useSyncExternalStore(
    (cb) => game.subscribe(cb),
    () => game.version,
  );
  const newGame = () => {
    const g = new MahjGame();
    ref.current = g;
    setGame(g);
  };
  return { game, newGame };
}

/** One opponent in the collapsed status strip; tap to peek at exposures. */
function OpponentSeat({ game, player }: { game: MahjGame; player: number }) {
  const [open, setOpen] = useState(false);
  const active =
    (game.phase.t === 'turn' && game.phase.player === player) ||
    (game.lastDiscard?.from === player && game.phase.t === 'claim');
  const exposures = game.exposures[player];
  const count = game.hands[player].length;

  let status: React.ReactNode;
  if (active) status = 'discarding';
  else if (game.dealer === player) status = <span className="tag-dealer">dealer</span>;
  else if (exposures.length > 0)
    status = <span className="tag-expose">{exposures.length} exposed</span>;
  else status = 'in hand';

  return (
    <button
      type="button"
      className={`seat${active ? ' active' : ''}`}
      onClick={() => exposures.length > 0 && setOpen((o) => !o)}
      aria-expanded={exposures.length > 0 ? open : undefined}
    >
      <div className="seat-name">{PLAYER_NAMES[player]}</div>
      <div className="seat-sub">
        {count} tiles · {status}
      </div>
      {open && exposures.length > 0 && (
        <div className="seat-exposures">
          {exposures.map((e, i) => (
            <span key={i} className="exposure">
              {e.tiles.map((t, j) => (
                <Tile key={j} id={t} width={22} />
              ))}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

/** The in-game card as a bottom sheet (right drawer on desktop). */
function CardSheet({
  closest,
  focus,
  onClose,
}: {
  closest: { id: string; missing: number }[];
  focus?: string;
  onClose: () => void;
}) {
  const closestById = useMemo(() => new Map(closest.map((c) => [c.id, c.missing])), [closest]);

  // Scroll the focused hand into view when the sheet opens.
  useLayoutEffect(() => {
    if (!focus) return;
    document.getElementById(`sheet-hand-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [focus]);

  const pointsById = useMemo(() => new Map(CARD.map((h) => [h.id, h.points])), []);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="card-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="The Lounge Card">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <h2>The Lounge Card, No. 1</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Close card">
            ×
          </button>
        </div>
        <p className="sheet-intro">
          The game waits underneath. Tinted rows are the hands you&rsquo;re closest to.
        </p>
        <div className="sheet-body">
          {closest.length > 0 && (
            <>
              <span className="overline">Closest to your hand</span>
              {closest.map((c) => {
                const pts = pointsById.get(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="closest-row"
                    onClick={() =>
                      document
                        .getElementById(`sheet-hand-${c.id}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  >
                    <span className="pattern">{CARD.find((h) => h.id === c.id)?.display}</span>
                    <span className="meta">
                      {c.missing} away{pts != null ? ` · ${pts} pts` : ''}
                    </span>
                  </button>
                );
              })}
            </>
          )}
          {CARD_SECTIONS.map((section) => (
            <div key={section}>
              <div className="sheet-section-head">{section}</div>
              {CARD.filter((h) => h.section === section).map((h) => {
                const missing = closestById.get(h.id);
                const tinted = missing != null;
                return (
                  <div
                    key={h.id}
                    id={`sheet-hand-${h.id}`}
                    className={`sheet-hand${tinted ? ' tinted' : ''}${focus === h.id ? ' focus' : ''}`}
                  >
                    <span className="pattern">{h.display}</span>
                    <span className="pts">
                      {h.points}
                      {tinted ? ` · ${missing} away` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Table({
  sheet,
  onOpenSheet,
  onCloseSheet,
}: {
  sheet: SheetState;
  onOpenSheet: (focus?: string) => void;
  onCloseSheet: () => void;
}) {
  const { game, newGame } = useGame();
  const [selected, setSelected] = useState<number[]>([]);
  const phase = game.phase;
  const rack = game.hands[0];

  // Clear tile selection whenever the phase advances.
  const phaseKey = JSON.stringify(phase);
  useEffect(() => setSelected([]), [phaseKey]);

  // Drive bot turns on a gentle timer.
  useEffect(() => {
    if (!game.pendingBot()) return;
    const t = setTimeout(() => game.stepBot(), BOT_DELAY_MS);
    return () => clearTimeout(t);
  }, [game, game.version]);

  const isHumanTurn = phase.t === 'turn' && phase.player === 0;
  const inCharleston = phase.t === 'charleston';
  const inCourtesy = phase.t === 'courtesy-query';
  const selectable = isHumanTurn || inCharleston || inCourtesy;
  const maxSelect = isHumanTurn ? 1 : 3;

  const canMahjong = useMemo(
    () => (isHumanTurn ? findWin(rack, game.exposures[0]) !== null : false),
    [isHumanTurn, game.version],
  );
  const jokerSwaps = isHumanTurn ? game.availableJokerSwaps(0) : [];
  const hints = useMemo(
    () => (phase.t === 'over' ? [] : rankHands(rack, game.exposures[0], 3)),
    [game.version, phase.t],
  );
  const closest = useMemo(
    () => hints.map((h) => ({ id: h.hand.pattern.id, missing: h.missing })),
    [hints],
  );

  const toggleTile = (i: number) => {
    if (!selectable) return;
    if ((inCharleston || inCourtesy) && isJoker(rack[i])) return; // jokers never pass
    setSelected((sel) =>
      sel.includes(i)
        ? sel.filter((x) => x !== i)
        : maxSelect === 1
          ? [i]
          : sel.length < maxSelect
            ? [...sel, i]
            : sel,
    );
  };

  const selectedTiles = selected.map((i) => rack[i]);

  // Split the action UI into a status note + a set of buttons.
  const renderActions = (): { note: React.ReactNode; buttons: React.ReactNode } => {
    if (inCharleston) {
      const dir = CHARLESTON_STEPS[(phase as { t: 'charleston'; step: number }).step];
      return {
        note: (
          <>
            Charleston — choose 3 to pass <strong>{dir}</strong>.
          </>
        ),
        buttons: (
          <button
            className="btn btn-primary"
            disabled={selected.length !== 3}
            onClick={() => game.charlestonPass(selectedTiles)}
          >
            Pass {selected.length}/3 {dir}
          </button>
        ),
      };
    }
    if (phase.t === 'charleston-query') {
      return {
        note: 'Do a second Charleston?',
        buttons: (
          <>
            <button className="btn btn-secondary" onClick={() => game.charlestonDecision(true)}>
              Keep passing
            </button>
            <button className="btn btn-primary" onClick={() => game.charlestonDecision(false)}>
              Let&rsquo;s play
            </button>
          </>
        ),
      };
    }
    if (inCourtesy) {
      return {
        note: <>Courtesy pass — offer up to 3 to {PLAYER_NAMES[2]}.</>,
        buttons: (
          <button
            className="btn btn-primary"
            onClick={() => game.courtesy(selected.length, selectedTiles)}
          >
            {selected.length === 0 ? 'Skip courtesy' : `Offer ${selected.length}`}
          </button>
        ),
      };
    }
    if (phase.t === 'claim' && game.humanClaim) {
      const tile = game.lastDiscard!.tile;
      return {
        note: (
          <>
            {PLAYER_NAMES[game.lastDiscard!.from]} discarded <strong>{tileLabel(tile)}</strong>.
          </>
        ),
        buttons: (
          <>
            {game.humanClaim.canMahjong && (
              <button className="btn btn-primary" onClick={() => game.humanClaimDecision('mahjong')}>
                Mahjong
              </button>
            )}
            {game.humanClaim.options.map((opt, i) => (
              <button key={i} className="btn btn-secondary" onClick={() => game.humanClaimDecision(opt)}>
                Call {opt.group.count === 3 ? 'pung' : opt.group.count === 4 ? 'kong' : 'quint'}
              </button>
            ))}
            <button className="btn btn-ghost" onClick={() => game.humanClaimDecision('pass')}>
              Pass
            </button>
          </>
        ),
      };
    }
    if (isHumanTurn) {
      return {
        note: 'Your turn — pick a tile to discard.',
        buttons: (
          <>
            {jokerSwaps.map((s, i) => (
              <button key={i} className="swap-chip" onClick={() => game.swapJoker(s)}>
                ♻ Trade {tileLabel(s.tile)} for {PLAYER_NAMES[s.owner]}&rsquo;s joker
              </button>
            ))}
            {canMahjong && (
              <button className="btn btn-primary" onClick={() => game.declareMahjong()}>
                Mahjong
              </button>
            )}
            <button
              className="btn btn-primary"
              disabled={selected.length !== 1}
              onClick={() => game.discard(selectedTiles[0])}
            >
              {selected.length === 1 ? `Discard ${tileLabel(selectedTiles[0])}` : 'Discard'}
            </button>
          </>
        ),
      };
    }
    if (phase.t === 'over') {
      return {
        note: 'Game over.',
        buttons: (
          <button className="btn btn-primary" onClick={newGame}>
            Play again
          </button>
        ),
      };
    }
    return {
      note: <>Waiting for {PLAYER_NAMES[(phase as { t: 'turn'; player: number }).player]}…</>,
      buttons: null,
    };
  };

  const actions = renderActions();
  const topHint = hints[0];

  return (
    <main className="table-page">
      <div className="table-topbar">
        <a className="wordmark" href="#/">
          Mahj Lounge
        </a>
        <span className="wall-count">{game.wall.length} in the wall</span>
      </div>

      <div className="table-scroll">
        <div className="opponents">
          {[3, 2, 1].map((p) => (
            <OpponentSeat key={p} game={game} player={p} />
          ))}
        </div>

        <div className="discards">
          <span className="overline">Discards</span>
          <div className="discard-pool">
            {game.discards.map((d, i) => (
              <span key={i}>
                <Tile id={d.tile} width={28} />
              </span>
            ))}
            {game.lastDiscard && (
              <span className="latest">
                <Tile id={game.lastDiscard.tile} width={28} />
              </span>
            )}
          </div>
          <div className="table-log">{game.log[game.log.length - 1]}</div>
        </div>

        {topHint && (
          <button
            type="button"
            className="hint-chip"
            onClick={() => onOpenSheet(topHint.hand.pattern.id)}
          >
            <span className="pattern">{topHint.hand.pattern.display}</span>
            <span className="away">
              {topHint.missing === 0
                ? 'Mahjong!'
                : `${topHint.missing} away · view on card →`}
            </span>
          </button>
        )}

        <div className={`you-tray${selectable ? '' : ''}`}>
          <div className="tray-head">
            <span className="you-label">
              You
              {game.dealer === 0 && <span className="chip">Dealer</span>}
            </span>
            <span className="action-note">{actions.note}</span>
          </div>

          {game.exposures[0].length > 0 && (
            <div className="seat-you-exposures">
              {game.exposures[0].map((e, i) => (
                <span key={i} className="exposure">
                  {e.tiles.map((t, j) => (
                    <Tile key={j} id={t} width={30} />
                  ))}
                </span>
              ))}
            </div>
          )}

          <div className="rack">
            {rack.map((t, i) => (
              <TileButton
                key={`${t}-${i}`}
                id={t}
                width={46}
                selected={selected.includes(i)}
                disabled={!selectable || ((inCharleston || inCourtesy) && isJoker(t))}
                onClick={() => toggleTile(i)}
              />
            ))}
          </div>

          <div className="action-bar">{actions.buttons}</div>
        </div>
      </div>

      {sheet.open && <CardSheet closest={closest} focus={sheet.focus} onClose={onCloseSheet} />}

      {phase.t === 'over' && (
        <div className="overlay">
          <div className="overlay-card">
            {game.winner ? (
              <>
                <h2>
                  {game.winner.player === 0 ? 'Mahjong — you won' : `${PLAYER_NAMES[game.winner.player]} wins`}
                </h2>
                <p>
                  &ldquo;{game.winner.hand.pattern.display}&rdquo; · {game.winner.hand.pattern.section} ·{' '}
                  {game.winner.points} points{game.winner.selfDraw ? ' · self-drawn' : ''}
                </p>
                <div className="tiles">
                  {game.exposures[game.winner.player].flatMap((e, i) =>
                    e.tiles.map((t, j) => <Tile key={`e${i}-${j}`} id={t} width={32} />),
                  )}
                  {game.hands[game.winner.player].map((t, i) => (
                    <Tile key={i} id={t} width={32} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2>Wall game</h2>
                <p>The wall ran dry before anyone made mahjong. No winner, no harm.</p>
              </>
            )}
            <button className="btn btn-primary" onClick={newGame}>
              Deal the next hand
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
