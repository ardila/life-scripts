import { useEffect, useState } from 'react';
import { Landing } from './ui/Landing';
import { Table, SheetState } from './ui/Table';
import { CardBrowser } from './ui/CardBrowser';
import { Learn } from './ui/Learn';

type Route = 'home' | 'play' | 'card' | 'learn';

function currentRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h === 'play' || h === 'card' || h === 'learn') return h;
  return 'home';
}

export default function App() {
  const [route, setRoute] = useState<Route>(currentRoute());
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  useEffect(() => {
    const onHash = () => {
      setRoute(currentRoute());
      setSheet({ open: false });
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const inGame = route === 'play';
  const openSheet = (focus?: string) => setSheet({ open: true, focus });
  const closeSheet = () => setSheet({ open: false });

  // Mid-game, the Card tab opens the sheet over the table instead of routing.
  const onCardTab = () => {
    if (inGame) openSheet();
    else window.location.hash = '#/card';
  };

  return (
    <div className="shell">
      {!inGame && (
        <header className="app-header">
          <a className="wordmark" href="#/">
            Mahj Lounge
          </a>
        </header>
      )}

      {route === 'home' && <Landing />}
      {route === 'play' && <Table sheet={sheet} onOpenSheet={openSheet} onCloseSheet={closeSheet} />}
      {route === 'card' && <CardBrowser />}
      {route === 'learn' && <Learn />}

      {route === 'home' && (
        <footer className="site-footer">
          Made for mahj night. Not affiliated with the National Mah Jongg League.
          <br />
          Open source under MIT ·{' '}
          <a href="https://github.com/ardila/life-scripts" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </footer>
      )}

      <nav className="bottom-nav" aria-label="Primary">
        <a className={`tab${route === 'play' ? ' active' : ''}`} href="#/play">
          <span className="dot" />
          Play
        </a>
        <button
          type="button"
          className={`tab${route === 'card' || (inGame && sheet.open) ? ' active' : ''}`}
          onClick={onCardTab}
        >
          <span className="dot" />
          Card
        </button>
        <a className={`tab${route === 'learn' ? ' active' : ''}`} href="#/learn">
          <span className="dot" />
          Learn
        </a>
      </nav>
    </div>
  );
}
