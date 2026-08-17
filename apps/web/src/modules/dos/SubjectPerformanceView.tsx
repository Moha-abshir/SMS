import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, BookOpen, BarChart3, TrendingUp } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

export const SubjectPerformanceView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [subjectData, setSubjectData] = useState<any[]>([]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/dos/subject-analytics');
      setSubjectData(res.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load subject performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-950 dark:via-slate-900 dark:to-slate-900 text-white rounded-3xl shadow-xl shadow-blue-600/15 dark:shadow-none border border-blue-500/30 dark:border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-blue-100 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
            <BarChart3 className="w-4 h-4 text-blue-200 dark:text-blue-400" />
            Academic Analytics & Grading Performance
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Subject Performance & CBC/KNEC Analytics Engine</h2>
          <p className="text-xs text-blue-100 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Subject average comparisons, CBC 4-tier rubric distributions (EE, ME, AE, BE) & JSS 8-point scales.
          </p>
        </div>

        <div className="flex items-center gap-4 px-5 py-3 bg-white/10 dark:bg-slate-900/80 border border-white/20 dark:border-slate-800 rounded-2xl backdrop-blur-md shrink-0">
          <div className="text-center">
            <span className="block text-xl font-bold text-white dark:text-blue-400 leading-none">4-Tier</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">CBC Rubric</span>
          </div>
          <div className="w-[1px] h-8 bg-white/20 dark:bg-slate-800" />
          <div className="text-center">
            <span className="block text-xl font-bold text-emerald-300 dark:text-emerald-400 leading-none">8-Point</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">KNEC Scale</span>
          </div>
        </div>
      </div>

      {/* CBC & JSS Grading Scale Reference Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">EE — Exceeding Expectations</span>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">Level 4 (80% - 100%)</div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">Grade Points: 8 - 7</p>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400">ME — Meeting Expectations</span>
          <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">Level 3 (65% - 79%)</div>
          <p className="text-[11px] text-blue-800 dark:text-blue-400 mt-0.5">Grade Points: 6 - 5</p>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">AE — Approaching Expectations</span>
          <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-1">Level 2 (50% - 64%)</div>
          <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">Grade Points: 4 - 3</p>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 dark:text-red-400">BE — Below Expectations</span>
          <div className="text-2xl font-extrabold text-red-700 dark:text-red-300 mt-1">Level 1 (0% - 49%)</div>
          <p className="text-[11px] text-red-800 dark:text-red-400 mt-0.5">Grade Points: 2 - 1</p>
        </div>
      </div>

      {/* Subject Performance Analytics Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          School-Wide Subject Averages & Rubric Breakdown ({subjectData.length} Subjects)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Subject Name</th>
                <th className="py-3.5 px-4">Level Tier</th>
                <th className="py-3.5 px-4 text-center">Learners Assessed</th>
                <th className="py-3.5 px-4 text-center">Subject Average</th>
                <th className="py-3.5 px-4 text-center">EE / ME / AE / BE Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjectData.map((row) => (
                <tr key={row.subjectId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {row.subjectName} ({row.subjectCode})
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-500">
                    {row.levelCategory}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold">{row.totalLearnersTested}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                    {row.averageScore > 0 ? `${row.averageScore}%` : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-bold text-[11px]">
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded">
                        EE: {row.gradeBreakdown.EE}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded">
                        ME: {row.gradeBreakdown.ME}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded">
                        AE: {row.gradeBreakdown.AE}
                      </span>
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 rounded">
                        BE: {row.gradeBreakdown.BE}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
