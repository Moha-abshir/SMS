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
    <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-sky-50/25 text-slate-800 flex flex-col lg:flex-row font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Dynamic Route-Aware Sidebar */}
      <Sidebar user={user} onLogout={onLogout} />

      {/* Main Routed Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto lg:h-screen">
        <div className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5 sm:space-y-6">
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
