import { Link } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';

export function AppHeader() {
  const { userName, logout, isAuthenticated } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <Link to="/">DMS Console</Link>
      </div>
      <div className="app-header__meta">
        {isAuthenticated ? (
          <>
            <span className="app-header__user">Usuário: {userName ?? 'desconhecido'}</span>
            <button type="button" className="app-header__logout" onClick={logout}>
              Sair
            </button>
          </>
        ) : null}
        <span className="app-header__version">
          v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}
        </span>
      </div>
    </header>
  );
}
