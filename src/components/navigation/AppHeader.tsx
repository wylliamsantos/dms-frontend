import { Link } from 'react-router-dom';

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <Link to="/">DMS Console</Link>
      </div>
      <div className="app-header__meta">
        <span className="app-header__version">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}</span>
      </div>
    </header>
  );
}
