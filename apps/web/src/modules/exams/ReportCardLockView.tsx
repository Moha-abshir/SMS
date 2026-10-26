import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Layers,
  Search,
  User,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { isSelfContainedClass } from '@school/shared/types';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

export const ReportCardLockView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [locks, setLocks] = useState<any[]>([]);
  const [togglingClassId, setTogglingClassId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'SELF_CONTAINED' | 'SUBJECT_SPECIALIST'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (togglingClassId) return;
    try {
      setTogglingClassId(classId);
      const newStatus = !currentIsLocked;
      const res = await apiClient.put('/api/report-card-locks/toggle', {
        classId,
        isLocked: newStatus,
        notes: newStatus
          ? 'Report cards locked by Headteacher / DoS'
          : 'Report cards published & released by Headteacher / DoS',
      });
      toast.success(res.data.message || (newStatus ? 'Report cards locked' : 'Report cards published'));
      await fetchLocks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update lock status');
    } finally {
      setTogglingClassId(null);
    }
  };

  const filteredLocks = useMemo(() => {
    return locks.filter((row) => {
      const isSelf = isSelfContainedClass(row.class);
      if (tierFilter === 'SELF_CONTAINED' && !isSelf) return false;
      if (tierFilter === 'SUBJECT_SPECIALIST' && isSelf) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesClass = row.class.name.toLowerCase().includes(q);
        const matchesTeacher = row.classTeacher
          ? `${row.classTeacher.firstName} ${row.classTeacher.lastName}`.toLowerCase().includes(q)
          : false;
        if (!matchesClass && !matchesTeacher) return false;
      }
      return true;
    });
  }, [locks, tierFilter, searchQuery]);

  const lockedCount = locks.filter((l) => l.isLocked).length;
  const releasedCount = locks.filter((l) => !l.isLocked).length;

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Report Card Locking & Release Oversight"
      subtitle="Validating stream submissions, moderation clearances, and release locks..."
      icon={Lock}
    >
      <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-12"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 dark:border-[#162b4d] shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
            <Lock className="w-4 h-4 text-sky-500" />
            Report Card Release & Access Controls
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Report Card Lock & Publication Control Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Headteacher final sign-off. Ensure Deputy mark approvals are complete before locking or releasing report cards to student & parent dashboards.
          </p>
        </div>

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/60 dark:bg-[#0c1f3d] border border-sky-100 dark:border-[#163660] rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-none">
              {locks.length}
            </span>
            <span className="text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-400 uppercase mt-1 block">
              Classes
            </span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200 dark:bg-sky-800" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 leading-none">
              {lockedCount} Locked
            </span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">
              {releasedCount} Released
            </span>
          </div>
        </div>
      </div>

      {/* Guidance Notice */}
      <div className="p-3.5 sm:p-4 bg-sky-50/70 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-xl sm:rounded-2xl flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
        <ShieldAlert className="w-5 h-5 shrink-0 text-sky-600 dark:text-sky-400" />
        <div>
          <strong className="font-bold text-slate-900 dark:text-slate-100">Report Card Security & CBC Workflow:</strong>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
            <strong>LOCKED (Protected):</strong> Disables further teacher score revisions and seals terminal report cards.
            <br />
            <strong>RELEASED (Published):</strong> Renders validated report cards visible to learners and parents on their respective portals.
          </p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md rounded-2xl border border-sky-100 dark:border-[#162b4d] shadow-glass">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTierFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              tierFilter === 'ALL'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-[#0c1f3d]'
            }`}
          >
            All Classes ({locks.length})
          </button>
          <button
            type="button"
            onClick={() => setTierFilter('SELF_CONTAINED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              tierFilter === 'SELF_CONTAINED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-[#121a36]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            PP1–Grade 3
          </button>
          <button
            type="button"
            onClick={() => setTierFilter('SUBJECT_SPECIALIST')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              tierFilter === 'SUBJECT_SPECIALIST'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-[#0c1f3d]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Grades 4–9
          </button>
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search class or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {/* Locks Table */}
      <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Lock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          Class Stream Report Card Status ({filteredLocks.length} Classes)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[680px]">
            <thead className="bg-sky-50/80 dark:bg-[#0c1f3d] text-sky-900 dark:text-sky-200 font-bold uppercase tracking-wider border-b border-sky-100 dark:border-[#162b4d]">
              <tr>
                <th className="py-3.5 px-4">Class Stream</th>
                <th className="py-3.5 px-4">Class Teacher</th>
                <th className="py-3.5 px-4 text-center">Deputy Mark Review</th>
                <th className="py-3.5 px-4 text-center">Publication Status</th>
                <th className="py-3.5 px-4 text-center">Control Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60 dark:divide-[#162b4d]">
              {filteredLocks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                    No classes match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLocks.map((row) => {
                  const isSelf = isSelfContainedClass(row.class);
                  return (
                    <tr key={row.class.id} className="hover:bg-sky-50/40 dark:hover:bg-[#0c1f3d]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{row.class.name}</div>
                        <span className="text-[10px] text-slate-400 block">
                          {isSelf ? 'PP1–G3 Self-Contained' : 'G4–G9 Subject Specialists'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {row.classTeacher ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {row.classTeacher.firstName} {row.classTeacher.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {row.marksApproved ? (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Fully Approved
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                            <ClipboardCheck className="w-3 h-3 text-slate-400" />
                            {row.totalMarkSubmissions > 0
                              ? `${row.approvedMarkSubmissions}/${row.totalMarkSubmissions} Approved`
                              : 'Pending Submissions'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full flex items-center justify-center gap-1 mx-auto w-32 border ${
                            row.isLocked
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-mono'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {row.isLocked ? (
                            <>
                              <Lock className="w-3 h-3 text-slate-500" /> LOCKED
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> RELEASED
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleLock(row.class.id, row.isLocked)}
                          disabled={togglingClassId === row.class.id}
                          className={`px-3.5 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 mx-auto transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                            row.isLocked
                              ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-glass'
                              : 'bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#0c1f3d] text-slate-700 dark:text-slate-300 shadow-xs'
                          }`}
                        >
                          {togglingClassId === row.class.id ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                              <span>{row.isLocked ? 'Releasing...' : 'Locking...'}</span>
                            </>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </motion.div>
    </PageLoadingWrapper>
  );
};
