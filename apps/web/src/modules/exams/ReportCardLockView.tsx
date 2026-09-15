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
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <Lock className="w-4 h-4 text-sky-500" />
            Report Card Release & Access Controls
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Report Card Lock & Publication Control Engine</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Control student & parent portal report card publication status per class stream.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/60 border border-sky-100 rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-slate-800 leading-none">{locks.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase mt-1 block">Class Streams</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-sky-600 leading-none">{locks.filter(l => l.isLocked).length} Locked</span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 uppercase mt-1 block">Status</span>
          </div>
        </div>
      </div>

      {/* Guidance Notice */}
      <div className="p-3.5 sm:p-4 bg-sky-50/70 border border-sky-100 rounded-xl sm:rounded-2xl flex items-center gap-3 text-xs text-slate-700 shadow-xs">
        <ShieldAlert className="w-5 h-5 shrink-0 text-sky-600" />
        <div>
          <strong className="font-bold text-slate-900">Report Card Lock Logic:</strong>
          <p className="text-[11px] text-slate-600 mt-0.5">
            <strong>LOCKED (Default):</strong> Report cards cannot be accessed or printed by learners/parents if marks are incomplete or fees outstanding.
            <br />
            <strong>RELEASED / PUBLISHED:</strong> Report cards are published and visible on student and parent portal dashboards.
          </p>
        </div>
      </div>

      {/* Locks Table */}
      <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <Lock className="w-4 h-4 text-sky-600" />
          Class Stream Report Card Status ({locks.length} Classes)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[580px]">
            <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
              <tr>
                <th className="py-3.5 px-4">Class Stream</th>
                <th className="py-3.5 px-4">Category Tier</th>
                <th className="py-3.5 px-4 text-center">Publication Status</th>
                <th className="py-3.5 px-4 text-center">Control Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60">
              {locks.map((row) => (
                <tr key={row.class.id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {row.class.name}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-500">
                    {row.class.levelCategory}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full flex items-center justify-center gap-1 mx-auto w-32 border ${
                      row.isLocked
                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-sky-100 text-sky-800 border-sky-200'
                    }`}>
                      {row.isLocked ? (
                        <>
                          <Lock className="w-3 h-3 text-slate-500" /> LOCKED
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-sky-600" /> PUBLISHED
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleLock(row.class.id, row.isLocked)}
                      disabled={togglingClassId === row.class.id}
                      className={`px-3.5 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 mx-auto transition-all ${
                        row.isLocked
                          ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-glass'
                          : 'bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 shadow-xs'
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
                          <Lock className="w-3.5 h-3.5 text-slate-500" /> Restrict / Lock
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
