import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, ShieldAlert, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

export const ReportCardLockView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [locks, setLocks] = useState<any[]>([]);
  const [togglingClassId, setTogglingClassId] = useState<string | null>(null);

  const fetchLocks = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/report-card-locks');
      setLocks(res.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load report card locks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocks();
  }, []);

  const handleToggleLock = async (classId: string, currentIsLocked: boolean) => {
    try {
      setTogglingClassId(classId);
      const newStatus = !currentIsLocked;
      const res = await apiClient.put('/api/report-card-locks/toggle', {
        classId,
        isLocked: newStatus,
        notes: newStatus ? 'Report cards locked by DoS' : 'Report cards published & released by DoS',
      });
      toast.success(res.data.message || (newStatus ? 'Report cards locked' : 'Report cards published'));
      fetchLocks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update lock status');
    } finally {
      setTogglingClassId(null);
    }
  };

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
      className="space-y-4 sm:space-y-6 max-w-5xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-950 dark:via-slate-900 dark:to-slate-900 text-white rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-600/15 dark:shadow-none border border-blue-500/30 dark:border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-blue-100 dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Lock className="w-4 h-4 text-blue-200 dark:text-blue-400" />
            Report Card Release & Access Controls
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Report Card Lock & Publication Control Engine</h2>
          <p className="text-xs text-blue-100 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Control student & parent portal report card publication status per class stream.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/10 dark:bg-slate-900/80 border border-white/20 dark:border-slate-800 rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-white dark:text-blue-400 leading-none">{locks.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">Class Streams</span>
          </div>
          <div className="w-[1px] h-8 bg-white/20 dark:bg-slate-800" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-amber-300 dark:text-amber-400 leading-none">{locks.filter(l => l.isLocked).length} Locked</span>
            <span className="text-[10px] font-bold tracking-wider text-blue-100 dark:text-slate-400 uppercase mt-1 block">Status</span>
          </div>
        </div>
      </div>

      {/* Guidance Notice */}
      <div className="p-3.5 sm:p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl sm:rounded-2xl flex items-center gap-3 text-xs text-amber-900 dark:text-amber-300">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
        <div>
          <strong className="font-bold">Report Card Lock Logic:</strong>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
            <strong>LOCKED (Default):</strong> Report cards cannot be accessed or printed by learners/parents if marks are incomplete or fees outstanding.
            <br />
            <strong>RELEASED / PUBLISHED:</strong> Report cards are published and visible on student and parent portal dashboards.
          </p>
        </div>
      </div>

      {/* Locks Table */}
      <div className="p-4 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-600" />
          Class Stream Report Card Status ({locks.length} Classes)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[580px]">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Class Stream</th>
                <th className="py-3.5 px-4">Category Tier</th>
                <th className="py-3.5 px-4 text-center">Publication Status</th>
                <th className="py-3.5 px-4 text-center">Control Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {locks.map((row) => (
                <tr key={row.class.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {row.class.name}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-500">
                    {row.class.levelCategory}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full flex items-center justify-center gap-1 mx-auto w-32 ${
                      row.isLocked
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {row.isLocked ? (
                        <>
                          <Lock className="w-3 h-3" /> LOCKED
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> PUBLISHED
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleLock(row.class.id, row.isLocked)}
                      disabled={togglingClassId === row.class.id}
                      className={`px-3.5 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 mx-auto transition-all shadow-sm ${
                        row.isLocked
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-amber-600 hover:bg-amber-700 text-white'
                      }`}
                    >
                      {togglingClassId === row.class.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : row.isLocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" /> Publish / Release
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" /> Restrict / Lock
                        </>
                      )}
                    </button>
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
