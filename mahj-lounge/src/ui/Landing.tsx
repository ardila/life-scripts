import { Tile } from './Tile';

export function Landing() {
  return (
    <main>
      <section className="hero container">
        <span className="hero-eyebrow">American Mahjong, online</span>
        <h1>
          Your seat at the table<br />
          is <em>always</em> open.
        </h1>
        <p className="lede">
          Play American Mahjong the way you would at girls&rsquo; night — the Charleston, the
          jokers, the card — anytime, in your browser. No app, no ads, no waiting for a fourth.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#/play">
            Play now — it&rsquo;s free
          </a>
          <a className="btn btn-ghost" href="#/learn">
            New to mahj? Learn in 5 minutes
          </a>
        </div>
        <div className="hero-tiles" aria-hidden="true">
          <Tile id="FL" width={56} />
          <Tile id="FL" width={56} />
          <Tile id="D2" width={56} />
          <Tile id="GS" width={56} />
          <Tile id="B2" width={56} />
          <Tile id="C6" width={56} />
          <Tile id="JK" width={56} />
        </div>
      </section>

      <section className="features container">
        <div className="feature">
          <div className="icon">🀄</div>
          <h3>A real game, instantly</h3>
          <p>
            Sit down with Ruthie, CeCe, and Marlene — three friendly bots who pass, call, and
            redeem jokers like your Tuesday group. Full 152-tile set, real Charleston.
          </p>
        </div>
        <div className="feature">
          <div className="icon">🌸</div>
          <h3>An original card</h3>
          <p>
            Twenty-six hands across nine sections — Year, Evens, Runs, Winds &amp; Dragons,
            Quints, Singles &amp; Pairs — written just for the Lounge, so it&rsquo;s free forever.
          </p>
        </div>
        <div className="feature">
          <div className="icon">💡</div>
          <h3>Learn as you play</h3>
          <p>
            Gentle hints show which hands you&rsquo;re closest to and how many tiles away you are.
            Keep them open while you learn, tuck them away when you&rsquo;re ready.
          </p>
        </div>
      </section>

      <section className="container">
        <div className="banner">
          <div>
            <h2>Open source, open table</h2>
            <p>
              Mahj Lounge is free software under the MIT license. Peek at the engine, file an
              idea, or add a hand to the card — contributions are warmly welcome.
            </p>
          </div>
          <a
            className="btn btn-primary"
            href="https://github.com/ardila/life-scripts"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}
