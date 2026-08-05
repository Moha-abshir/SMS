import React from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, BookOpen, Wallet, UserPlus, Plus } from 'lucide-react';

interface OverviewViewProps {
  onAddLearner?: () => void;
  onRecordExpense?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onAddLearner, onRecordExpense }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Learners</span>
            <Users className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">482</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Grades 1–9 & PPE Active</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Today Attendance</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">96.4%</div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">18 Absences Recorded</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">DoS CAT Progress</span>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">CAT 2</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Grade 6 & Grade 9 Candidates</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Term 1 Fee Collections</span>
            <Wallet className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">84.2%</div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Cash & M-Pesa Synced</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xl shadow-blue-600/20">
        <div>
          <h3 className="text-lg font-bold">Quick Administrative Actions</h3>
          <p className="text-xs text-blue-100 mt-1">Admit new learner, post expense voucher, or trigger parent SMS alerts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddLearner}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-bold text-xs rounded-xl border border-white/20 flex items-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Unified Admission
          </button>
          <button
            onClick={onRecordExpense}
            className="px-4 py-2.5 bg-white text-blue-600 hover:bg-slate-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Record Expense
          </button>
        </div>
      </div>
    </motion.div>
  );
};
