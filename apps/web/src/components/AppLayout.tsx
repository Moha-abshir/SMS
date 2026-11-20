import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { WorkspaceErrorBoundary } from './WorkspaceErrorBoundary';
import { RouteLoading } from './RouteLoading';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  user: any;
  onLogout: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout }) => {
  const location = useLocation();

  return (
    <div className="min-h-dvh lg:h-dvh w-full lg:overflow-hidden bg-slate-50 text-slate-800 dark:bg-[#081020] dark:text-slate-100 flex flex-col lg:flex-row font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-200">
      {/* Dynamic Route-Aware Sidebar */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Main Routed Content Area */}
      <main className="flex-1 flex flex-col min-w-0 lg:overflow-y-auto lg:h-full">
        <div className="flex-1 min-w-0 p-3 sm:p-4 lg:p-5 max-w-7xl w-full mx-auto space-y-4">
          <WorkspaceErrorBoundary key={location.pathname}>
            <Suspense fallback={<RouteLoading />}>
              <Outlet />
            </Suspense>
          </WorkspaceErrorBoundary>
        </div>
      </main>
    </div>
  );
};
