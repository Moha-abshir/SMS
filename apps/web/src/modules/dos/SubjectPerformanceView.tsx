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
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            Academic Analytics & Grading Performance
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Subject Performance & CBC/KNEC Analytics Engine</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Subject average comparisons, CBC 4-tier rubric distributions (EE, ME, AE, BE) & JSS 8-point scales.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/60 border border-sky-100 rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-slate-800 leading-none">4-Tier</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase mt-1 block">CBC Rubric</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-sky-600 leading-none">8-Point</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase mt-1 block">KNEC Scale</span>
          </div>
        </div>
      </div>

      {/* CBC & JSS Grading Scale Reference Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-xl sm:rounded-2xl shadow-glass">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">EE — Exceeding Expectations</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Level 4 (80% - 100%)</div>
          <p className="text-[11px] text-sky-600 font-medium mt-0.5">Grade Points: 8 - 7</p>
        </div>

        <div className="p-3.5 sm:p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-xl sm:rounded-2xl shadow-glass">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">ME — Meeting Expectations</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Level 3 (65% - 79%)</div>
          <p className="text-[11px] text-sky-600 font-medium mt-0.5">Grade Points: 6 - 5</p>
        </div>

        <div className="p-3.5 sm:p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-xl sm:rounded-2xl shadow-glass">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">AE — Approaching Expectations</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Level 2 (50% - 64%)</div>
          <p className="text-[11px] text-sky-600 font-medium mt-0.5">Grade Points: 4 - 3</p>
        </div>

        <div className="p-3.5 sm:p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-xl sm:rounded-2xl shadow-glass">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">BE — Below Expectations</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Level 1 (0% - 49%)</div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Grade Points: 2 - 1</p>
        </div>
      </div>

      {/* Subject Performance Analytics Table */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-sky-600" />
          School-Wide Subject Averages & Rubric Breakdown ({subjectData.length} Subjects)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Subject Name</th>
                <th className="py-3.5 px-4">Level Tier</th>
                <th className="py-3.5 px-4 text-center">Learners Assessed</th>
                <th className="py-3.5 px-4 text-center">Subject Average</th>
                <th className="py-3.5 px-4 text-center">EE / ME / AE / BE Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {subjectData.map((row) => (
                <tr key={row.subjectId} className="hover:bg-sky-50/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {row.subjectName} ({row.subjectCode})
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-500">
                    {row.levelCategory}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">{row.totalLearnersTested}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sky-600 text-sm">
                    {row.averageScore > 0 ? `${row.averageScore}%` : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 font-bold text-[11px]">
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded border border-sky-200">
                        EE: {row.gradeBreakdown.EE}
                      </span>
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100">
                        ME: {row.gradeBreakdown.ME}
                      </span>
                      <span className="px-2 py-0.5 bg-white text-slate-700 rounded border border-sky-100">
                        AE: {row.gradeBreakdown.AE}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded border border-slate-200">
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
