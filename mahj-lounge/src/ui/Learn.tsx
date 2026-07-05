import { Tile } from './Tile';

export function Learn() {
  return (
    <main className="page container">
      <h1 className="page-title">Learn American Mahjong</h1>
      <p className="page-sub">
        Five minutes is all it takes. American Mahjong — the one with the card and the jokers — is a
        race to arrange 14 tiles into one of the hands on the card.
      </p>

      <div className="learn-grid">
        <div className="learn-card">
          <h2>
            <span className="step">01</span>Meet the tiles
          </h2>
          <p>
            152 tiles: three suits — <strong>dots</strong>, <strong>bams</strong>, and{' '}
            <strong>craks</strong> — numbered 1–9, plus winds, dragons, flowers, and eight jokers.
            The white dragon is called a <strong>soap</strong> and doubles as a zero in year hands.
          </p>
          <div className="tile-row">
            <Tile id="D5" width={40} />
            <Tile id="B5" width={40} />
            <Tile id="C5" width={40} />
            <Tile id="WN" width={40} />
            <Tile id="GR" width={40} />
            <Tile id="GS" width={40} />
            <Tile id="FL" width={40} />
            <Tile id="JK" width={40} />
          </div>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">02</span>Pick a hand from the card
          </h2>
          <p>
            Your 14 tiles must exactly match a hand printed on the card, like{' '}
            <em>FF 2026 2026 2026</em> or <em>NNNN EEE WWW SSSS</em>. Trickier hands are worth more
            points. Browse <a href="#/card">the Lounge Card</a> to see them all.
          </p>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">03</span>The Charleston
          </h2>
          <p>
            After the deal, everyone passes three unwanted tiles — right, across, then left. It&rsquo;s
            the soul of the game: you&rsquo;re shaping your hand before play starts. One house law
            above all: <strong>jokers never get passed.</strong>
          </p>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">04</span>Play a turn
          </h2>
          <p>
            Draw a tile, discard one, and call it out. When someone discards a tile you need, you may{' '}
            <strong>call</strong> it — only to complete a pung, kong, or quint. The called group goes
            face-up on your rack.
          </p>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">05</span>The jokers
          </h2>
          <p>
            A joker stands in for any tile in a group of three or more — never in a pair or a single.
            Hold the real tile someone&rsquo;s exposed joker replaces? Trade for it on your turn.
            That&rsquo;s a joker redemption, and it feels as good as it sounds.
          </p>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">06</span>Mahjong
          </h2>
          <p>
            Complete all 14 tiles of a card hand and declare <strong>mahjong</strong>. Concealed
            hands can&rsquo;t use called exposures — harder, so they score more. If the wall runs
            out, it&rsquo;s a wall game: no winner, no harm. Reshuffle and go again.
          </p>
          <a className="btn btn-primary btn-block" href="#/play" style={{ marginTop: '0.8rem' }}>
            Take a seat →
          </a>
        </div>
      </div>
    </main>
  );
}
