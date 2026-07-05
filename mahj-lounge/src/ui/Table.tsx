import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { CHARLESTON_STEPS, MahjGame, PLAYER_NAMES } from '../engine/game';
import { findWin, rankHands } from '../engine/match';
import { isJoker, tileLabel } from '../engine/tiles';
import { Tile, TileButton } from './Tile';

const BOT_DELAY_MS = 850;

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

function BotSeat({
  game,
  player,
  className,
}: {
  game: MahjGame;
  player: number;
  className: string;
}) {
  const active =
    (game.phase.t === 'turn' && game.phase.player === player) ||
    (game.lastDiscard?.from === player && game.phase.t === 'claim');
  return (
    <div className={`seat ${className}${active ? ' active' : ''}`}>
      <div className="seat-name">
        {PLAYER_NAMES[player]}
        {game.dealer === player && <span className="chip">Dealer</span>}
      </div>
      <div className="seat-tiles">
        {Array.from({ length: game.hands[player].length }, (_, i) => (
          <Tile key={i} faceDown width={22} />
        ))}
      </div>
      {game.exposures[player].length > 0 && (
        <div className="seat-exposures">
          {game.exposures[player].map((e, i) => (
            <span key={i} className="exposure">
              {e.tiles.map((t, j) => (
                <Tile key={j} id={t} width={26} />
              ))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Table() {
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

  const actionBar = () => {
    if (inCharleston) {
      const dir = CHARLESTON_STEPS[(phase as { t: 'charleston'; step: number }).step];
      return (
        <>
          <span className="action-note">
            Charleston — choose 3 tiles to pass <strong>{dir}</strong>.
          </span>
          <button
            className="btn btn-primary btn-small"
            disabled={selected.length !== 3}
            onClick={() => game.charlestonPass(selectedTiles)}
          >
            Pass {selected.length}/3 {dir}
          </button>
        </>
      );
    }
    if (phase.t === 'charleston-query') {
      return (
        <>
          <span className="action-note">Do a second Charleston?</span>
          <button className="btn btn-secondary btn-small" onClick={() => game.charlestonDecision(true)}>
            Yes, keep passing
          </button>
          <button className="btn btn-ghost btn-small" onClick={() => game.charlestonDecision(false)}>
            No, let&rsquo;s play
          </button>
        </>
      );
    }
    if (inCourtesy) {
      return (
        <>
          <span className="action-note">
            Courtesy pass — select up to 3 tiles to offer {PLAYER_NAMES[2]} (she&rsquo;ll match the
            smaller number).
          </span>
          <button
            className="btn btn-primary btn-small"
            onClick={() => game.courtesy(selected.length, selectedTiles)}
          >
            {selected.length === 0 ? 'Skip courtesy' : `Offer ${selected.length}`}
          </button>
        </>
      );
    }
    if (phase.t === 'claim' && game.humanClaim) {
      const tile = game.lastDiscard!.tile;
      return (
        <>
          <span className="action-note">
            {PLAYER_NAMES[game.lastDiscard!.from]} discarded <strong>{tileLabel(tile)}</strong> — want it?
          </span>
          {game.humanClaim.canMahjong && (
            <button className="btn btn-primary btn-small" onClick={() => game.humanClaimDecision('mahjong')}>
              Mahjong!
            </button>
          )}
          {game.humanClaim.options.map((opt, i) => (
            <button
              key={i}
              className="btn btn-secondary btn-small"
              onClick={() => game.humanClaimDecision(opt)}
            >
              Call {opt.group.count === 3 ? 'pung' : opt.group.count === 4 ? 'kong' : 'quint'}
            </button>
          ))}
          <button className="btn btn-ghost btn-small" onClick={() => game.humanClaimDecision('pass')}>
            Pass
          </button>
        </>
      );
    }
    if (isHumanTurn) {
      return (
        <>
          <span className="action-note">Your turn — pick a tile to discard.</span>
          {jokerSwaps.map((s, i) => (
            <button key={i} className="swap-chip" onClick={() => game.swapJoker(s)}>
              ♻ Trade {tileLabel(s.tile)} for {PLAYER_NAMES[s.owner]}&rsquo;s joker
            </button>
          ))}
          {canMahjong && (
            <button className="btn btn-primary btn-small" onClick={() => game.declareMahjong()}>
              Mahjong!
            </button>
          )}
          <button
            className="btn btn-secondary btn-small"
            disabled={selected.length !== 1}
            onClick={() => game.discard(selectedTiles[0])}
          >
            Discard
          </button>
        </>
      );
    }
    if (phase.t === 'over') {
      return (
        <>
          <span className="action-note">Game over.</span>
          <button className="btn btn-primary btn-small" onClick={newGame}>
            Play again
          </button>
        </>
      );
    }
    return <span className="action-note">Waiting for {PLAYER_NAMES[(phase as { t: 'turn'; player: number }).player]}…</span>;
  };

  return (
    <main className="table-page container">
      <div className="table-grid">
        <BotSeat game={game} player={2} className="seat-top" />
        <BotSeat game={game} player={3} className="seat-left" />
        <BotSeat game={game} player={1} className="seat-right" />

        <div className="center-area">
          <div className="center-meta">
            <span>Discards</span>
            <span>{game.wall.length} tiles in the wall</span>
          </div>
          <div className="discard-pool">
            {game.discards.map((d, i) => (
              <span key={i}>
                <Tile id={d.tile} width={30} />
              </span>
            ))}
            {game.lastDiscard && (
              <span className="latest">
                <Tile id={game.lastDiscard.tile} width={30} />
              </span>
            )}
          </div>
          <div className="table-log">{game.log[game.log.length - 1]}</div>
        </div>

        <div className={`seat seat-you${isHumanTurn || inCharleston || inCourtesy ? ' active' : ''}`}>
          <div className="seat-name">
            You
            {game.dealer === 0 && <span className="chip">Dealer</span>}
          </div>
          {game.exposures[0].length > 0 && (
            <div className="seat-exposures">
              {game.exposures[0].map((e, i) => (
                <span key={i} className="exposure">
                  {e.tiles.map((t, j) => (
                    <Tile key={j} id={t} width={34} />
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
                width={52}
                selected={selected.includes(i)}
                disabled={!selectable || ((inCharleston || inCourtesy) && isJoker(t))}
                onClick={() => toggleTile(i)}
              />
            ))}
          </div>
          <div className="action-bar">{actionBar()}</div>
          {hints.length > 0 && (
            <details className="hints">
              <summary>Hints — closest hands on the card</summary>
              {hints.map((h) => (
                <div key={h.hand.pattern.id} className="hint-row">
                  <span className="pattern">{h.hand.pattern.display}</span>
                  <span>{h.hand.pattern.section}</span>
                  <span className="away">
                    {h.missing === 0 ? 'Mahjong!' : `${h.missing} tile${h.missing === 1 ? '' : 's'} away`}
                  </span>
                </div>
              ))}
            </details>
          )}
        </div>
      </div>

      {phase.t === 'over' && (
        <div className="overlay">
          <div className="overlay-card">
            {game.winner ? (
              <>
                <h2>
                  {game.winner.player === 0 ? '🎉 Mahjong — you won!' : `${PLAYER_NAMES[game.winner.player]} wins`}
                </h2>
                <p>
                  “{game.winner.hand.pattern.display}” · {game.winner.hand.pattern.section} ·{' '}
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
                <p>The wall ran dry before anyone made mahjong. It happens to the best tables.</p>
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
