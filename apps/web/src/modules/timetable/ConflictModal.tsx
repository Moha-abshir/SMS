import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCcw, ArrowRightLeft, ShieldAlert } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictMessage: string;
  onRevert: () => void;
  onForceSwap?: () => void;
  isSwapping?: boolean;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  isOpen,
  onClose,
  conflictMessage,
  onRevert,
  onForceSwap,
  isSwapping = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-white/95 dark:bg-[#091326]/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-glass-lg border border-amber-200/70 dark:border-amber-900/40 dark:text-slate-100 p-6 z-10 my-auto"
          >
            {/* Header with gentle notice icon */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Schedule Notice & Conflict Detected
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  The requested timetable swap affects teacher commitments.
                </p>
              </div>
            </div>

            {/* Conflict Details Card */}
            <div className="mt-4 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-amber-900 dark:text-amber-300 block mb-1">
                    Teacher Double-Booking Warning:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    {conflictMessage}
                  </p>
                </div>
              </div>
            </div>

            {/* Friendly guidance note */}
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              You can restore the previous conflict-free schedule, or if this arrangement is intentional, you may proceed with the swap.
            </p>

            {/* Action buttons */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#162b4d]">
              <button
                type="button"
                onClick={onRevert}
                disabled={isSwapping}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-200 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Revert to Previous Schedule
              </button>

              {onForceSwap && (
                <button
                  type="button"
                  onClick={onForceSwap}
                  disabled={isSwapping}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  {isSwapping ? 'Swapping...' : 'Swap Anyway'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
