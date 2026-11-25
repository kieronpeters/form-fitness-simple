import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { ToastViewport } from './ToastViewport';

const ROOT_PATHS = new Set(['/', '/history', '/activities', '/statistics']);

export function AppShell() {
  const location = useLocation();
  const showNav = ROOT_PATHS.has(location.pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="app-frame">
      <main className={`app-main ${showNav ? 'app-main--with-nav' : ''}`}>
        <Outlet />
      </main>
      {showNav && <BottomNav />}
      <ToastViewport />
    </div>
  );
}
