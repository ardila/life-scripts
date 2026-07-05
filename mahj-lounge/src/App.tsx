import { useEffect, useState } from 'react';
import { Landing } from './ui/Landing';
import { Table } from './ui/Table';
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

  useEffect(() => {
    const onHash = () => {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="shell">
      <header className="header">
        <div className="container header-inner">
          <a className="brand" href="#/">
            <span className="brand-mark">
              <span />
            </span>
            <span className="brand-name">Mahj Lounge</span>
          </a>
          <nav className="nav">
            <a href="#/play" className={route === 'play' ? 'active' : ''}>
              Play
            </a>
            <a href="#/card" className={route === 'card' ? 'active' : ''}>
              The Card
            </a>
            <a href="#/learn" className={route === 'learn' ? 'active' : ''}>
              Learn
            </a>
          </nav>
        </div>
      </header>

      {route === 'home' && <Landing />}
      {route === 'play' && <Table />}
      {route === 'card' && <CardBrowser />}
      {route === 'learn' && <Learn />}

      <footer className="footer">
        <div className="container footer-inner">
          <span>Made with ♥ for mahj night. Not affiliated with the National Mah Jongg League.</span>
          <span>
            Open source under MIT ·{' '}
            <a href="https://github.com/ardila/life-scripts" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
