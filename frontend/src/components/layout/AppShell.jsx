import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MobileDrawer from './MobileDrawer.jsx';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import { navTitleForPath } from './navItems.js';

export default function AppShell() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const title = navTitleForPath(location.pathname);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[80]"
      >
        Skip to content
      </a>

      <Sidebar />

      <div className="flex min-h-screen min-w-0 flex-col">
        <TopBar onMenuOpen={() => setDrawerOpen(true)} title={title} />

        <main id="main-content" className="flex-1 px-4 pt-5 pb-12 sm:px-6 lg:px-8 lg:pt-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
