import { Outlet } from 'react-router-dom';

import { AppHeader } from './navigation/AppHeader';
import { SideNavigation } from './navigation/SideNavigation';

export function MainLayout() {
  return (
    <div className="app-shell">
      <AppHeader />
      <div className="app-body">
        <aside className="app-sidebar">
          <SideNavigation />
        </aside>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <footer className="app-footer">
        <span>DMS Console · {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
