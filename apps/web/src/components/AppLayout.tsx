import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  user: any;
  onLogout: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ user, onLogout }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Dynamic Route-Aware Sidebar */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Main Routed Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
