import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/25 dark:bg-black/60 backdrop-blur-xs"
          />

          {/* Dialog Container with max height limit & scrollable content */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col bg-white/95 dark:bg-[#091326]/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-glass-lg border border-sky-100 dark:border-[#162b4d] dark:text-slate-100 p-5 sm:p-6 z-10 my-auto`}
          >
            {title && (
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-sky-100 dark:border-[#162b4d] shrink-0">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate pr-2">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 rounded-xl hover:bg-sky-50 dark:hover:bg-[#0d1c38] transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1 pr-1 space-y-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
