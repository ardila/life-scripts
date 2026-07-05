import { Fragment } from 'react';
import { CARD, CARD_SECTIONS, concretize, HandPattern } from '../engine/card';
import { Tile } from './Tile';

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
              <Tile key={i} id={g.tile} width={34} />
            ))}
          </Fragment>
        ))}
      </div>
      <div className="meta">
        {hand.concealed && <span className="badge badge-concealed">Concealed</span>}
        <span className="badge badge-points">{hand.points} pts</span>
      </div>
      {hand.note && <p className="note">{hand.note}</p>}
    </div>
  );
}

export function CardBrowser() {
  return (
    <main className="page container">
      <h1 className="page-title">The Lounge Card, No. 1</h1>
      <p className="page-sub">
        Every winning hand in the game, organized the way a card should be. Suits shown are just
        examples — most hands can be made in any suits. Jokers may stand in for any tile in a
        group of three or more, never in singles or pairs.
      </p>
      {CARD_SECTIONS.map((section) => (
        <section key={section} className="card-section">
          <h2>{section}</h2>
          {CARD.filter((h) => h.section === section).map((h) => (
            <HandRow key={h.id} hand={h} />
          ))}
        </section>
      ))}
    </main>
  );
}
