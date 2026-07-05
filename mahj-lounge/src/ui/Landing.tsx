import { Tile } from './Tile';

export function Landing() {
  return (
    <main>
      <section className="hero container">
        <span className="hero-eyebrow">American Mahjong · Online</span>
        <h1>Your seat at the table is always open.</h1>
        <hr className="hairline" />
        <p className="lede">
          The Charleston, the jokers, the card — real American Mahjong, anytime, in your browser.
          No app, no ads, no waiting for a fourth.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary btn-block" href="#/play">
            Play now — it&rsquo;s free
          </a>
          <a className="btn btn-ghost btn-block" href="#/learn">
            Learn in 5 minutes
          </a>
        </div>
        <div className="hero-tiles" aria-hidden="true">
          <Tile id="FL" width={46} />
          <Tile id="D2" width={46} />
          <Tile id="GS" width={46} />
          <Tile id="B2" width={46} />
          <Tile id="C6" width={46} />
          <Tile id="JK" width={46} />
        </div>
      </section>

      <section className="features container">
        <div className="feature">
          <div className="icon" />
          <h3>A real game, instantly</h3>
          <p>
            Sit down with Ruthie, CeCe, and Marlene — three bots who pass, call, and redeem jokers
            like seasoned regulars. Full 152-tile set, real Charleston.
          </p>
        </div>
        <div className="feature">
          <div className="icon" />
          <h3>An original card</h3>
          <p>
            Twenty-six hands across nine sections — Year, Evens, Runs, Quints and more — written
            just for the Lounge, so it&rsquo;s free forever.
          </p>
        </div>
        <div className="feature">
          <div className="icon" />
          <h3>Learn as you play</h3>
          <p>
            Quiet hints show which hands you&rsquo;re closest to and how many tiles away you are.
            Keep them open, or tuck them away.
          </p>
        </div>
      </section>

      <section className="container">
        <div className="banner">
          <div>
            <h2>Open source, open table</h2>
            <p>
              Free software under the MIT license. Read the engine, file an idea, or add a hand to
              the card — contributions are welcome.
            </p>
          </div>
          <a
            className="text-link banner-cta"
            href="https://github.com/ardila/life-scripts"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub →
          </a>
        </div>
      </section>
    </main>
  );
}
