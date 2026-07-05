import { Fragment, useState } from 'react';
import { CARD, CARD_SECTIONS, concretize, HandPattern } from '../engine/card';
import { Tile } from './Tile';

function sectionId(section: string) {
  return 'sec-' + section.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function HandRow({ hand }: { hand: HandPattern }) {
  // Render the first concrete arrangement as example tiles.
  const example = concretize(hand)[0];
  return (
    <div className="card-hand">
      <div className="tiles" aria-label={hand.display}>
        {example.groups.map((g, gi) => (
          <Fragment key={gi}>
            {gi > 0 && <span className="group-gap" />}
            {Array.from({ length: g.count }, (_, i) => (
              <Tile key={i} id={g.tile} width={30} />
            ))}
          </Fragment>
        ))}
      </div>
      <div className="row">
        <span className="display">{hand.display}</span>
        <span className="meta">
          {hand.concealed && <span className="badge badge-concealed">Concealed</span>}
          <span className="badge badge-points">{hand.points} pts</span>
        </span>
      </div>
      {hand.note && <p className="note">{hand.note}</p>}
    </div>
  );
}

export function CardBrowser() {
  const [active, setActive] = useState(CARD_SECTIONS[0]);

  const jumpTo = (section: string) => {
    setActive(section);
    document.getElementById(sectionId(section))?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="page container">
      <h1 className="page-title">The Lounge Card, No. 1</h1>
      <p className="page-sub">
        Every winning hand in the game. Suits shown are examples — most hands can be made in any
        suits. Jokers stand in only in groups of three or more.
      </p>

      <div className="section-chips" role="tablist" aria-label="Card sections">
        {CARD_SECTIONS.map((section) => (
          <button
            key={section}
            type="button"
            className={`chip${active === section ? ' active' : ''}`}
            onClick={() => jumpTo(section)}
          >
            {section}
          </button>
        ))}
      </div>

      {CARD_SECTIONS.map((section) => (
        <section key={section} id={sectionId(section)} className="card-section">
          <h2>{section}</h2>
          {CARD.filter((h) => h.section === section).map((h) => (
            <HandRow key={h.id} hand={h} />
          ))}
        </section>
      ))}
    </main>
  );
}
