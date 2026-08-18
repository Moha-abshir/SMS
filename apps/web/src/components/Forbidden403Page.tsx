import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Forbidden403PageProps {
  requestedPath?: string;
  userRole?: string;
}

export const Forbidden403Page: React.FC<Forbidden403PageProps> = ({ requestedPath, userRole }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6"
    >
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-8 sm:p-10 text-center relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon Badge */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 mb-6 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-red-200 dark:border-red-800">
          <Lock className="w-3.5 h-3.5" />
          HTTP 403 · Access Restricted
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Permission Denied
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2.5 leading-relaxed">
          You do not have the required role credentials to view or modify resources on this page.
        </p>

        {/* Context Details Card */}
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-left space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Your Active Role:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
              {userRole || 'GUEST'}
            </span>
          </div>
          {requestedPath && (
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Target Route:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                {requestedPath}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <button
            onClick={() => navigate('/overview')}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <Home className="w-4 h-4" /> Return to Workspace
          </button>
        </div>
      </div>
    </motion.div>
  );
};
