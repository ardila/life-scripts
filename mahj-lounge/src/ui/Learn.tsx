import { Tile } from './Tile';

export function Learn() {
  return (
    <main className="page container">
      <h1 className="page-title">Learn American Mahjong</h1>
      <p className="page-sub">
        Five minutes, no gatekeeping. American Mahjong (the one with the card and the jokers) is
        a race to arrange 14 tiles into one of the hands on the card.
      </p>

      <div className="learn-grid">
        <div className="learn-card">
          <h2>
            <span className="step">1</span>Meet the tiles
          </h2>
          <p>
            The set has 152 tiles: three suits — <strong>dots</strong>, <strong>bams</strong>,
            and <strong>craks</strong> — numbered 1–9, plus winds, dragons, flowers, and eight
            precious jokers. The white dragon is called a <strong>soap</strong> and moonlights as
            a zero in year hands.
          </p>
          <div className="tile-row">
            <Tile id="D5" width={44} />
            <Tile id="B5" width={44} />
            <Tile id="C5" width={44} />
            <Tile id="WN" width={44} />
            <Tile id="GR" width={44} />
            <Tile id="GG" width={44} />
            <Tile id="GS" width={44} />
            <Tile id="FL" width={44} />
            <Tile id="JK" width={44} />
          </div>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">2</span>Pick a hand from the card
          </h2>
          <p>
            Unlike other mahjong styles, you can&rsquo;t win with just any sets — your 14 tiles
            must exactly match a hand printed on the card, like <em>FF 2026 2026 2026</em> or{' '}
            <em>NNNN EEE WWW SSSS</em>. Each hand is worth points, and trickier hands are worth
            more. Browse <a href="#/card">the Lounge Card</a> to see them all.
          </p>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">3</span>The Charleston
          </h2>
          <p>
            After the deal, everyone passes three unwanted tiles — right, across, then left.
            That&rsquo;s the Charleston, and it&rsquo;s the soul of the game: you&rsquo;re
            sculpting your hand before play even starts. If the table agrees, you do a second
            round (left, across, right), then an optional courtesy swap with the player across.
          </p>
          <p>One house law above all: <strong>jokers never get passed.</strong></p>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">4</span>Play a turn
          </h2>
          <p>
            On your turn, draw a tile and discard one, calling it out loud. When someone else
            discards a tile you need, you may <strong>call</strong> it — but only to complete a
            pung, kong, or quint (a group of 3, 4, or 5 identical tiles) for the hand
            you&rsquo;re chasing. The called group goes face-up on your rack, exposed for all to
            see.
          </p>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">5</span>Jokers, honey
          </h2>
          <p>
            A joker stands in for any tile in a group of three or more — never in a pair or a
            single. If someone&rsquo;s exposed set contains a joker and you hold the real tile,
            you can trade it for the joker on your turn. That&rsquo;s a joker redemption, and it
            feels as good as it sounds.
          </p>
        </div>

        <div className="learn-card">
          <h2>
            <span className="step">6</span>Mahjong!
          </h2>
          <p>
            Complete all 14 tiles of a card hand — by drawing or by claiming a discard — and
            declare <strong>mahjong</strong>. Hands marked <em>C</em> (concealed) can&rsquo;t use
            called exposures; they&rsquo;re harder, so they score more. If the wall runs out
            first, it&rsquo;s a wall game and nobody wins — pour the wine and reshuffle.
          </p>
          <a className="btn btn-primary" href="#/play" style={{ marginTop: '0.6rem' }}>
            Take a seat →
          </a>
        </div>
      </div>
    </main>
  );
}
