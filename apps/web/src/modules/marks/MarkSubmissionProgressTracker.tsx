import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, CheckCircle2, AlertCircle, Clock, FileText, ChevronDown,
  RefreshCw, CheckCheck, Users, BookOpen, AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

interface MarkSubmissionProgressTrackerProps {
  exams: any[];
  defaultExamId?: string;
}

export const MarkSubmissionProgressTracker: React.FC<MarkSubmissionProgressTrackerProps> = ({
  exams,
  defaultExamId,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(defaultExamId || (exams[0]?.exam?.id || exams[0]?.id || ''));
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  const fetchProgress = async (examId: string) => {
    if (!examId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/exams/${examId}/progress`);
      setProgressData(res.data.data);

      // Auto-expand first 2 classes
      if (res.data.data?.classesProgress) {
        const initial: Record<string, boolean> = {};
        res.data.data.classesProgress.slice(0, 2).forEach((c: any) => {
          initial[c.classId] = true;
        });
        setExpandedClasses(initial);
      }
    } catch (err: any) {
      toast.error('Failed to load examination mark submission progress');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchProgress(selectedExamId);
    }
  }, [selectedExamId]);

  const toggleClass = (classId: string) => {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCheck className="w-3 h-3 text-emerald-600" />
            Approved
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Clock className="w-3 h-3 text-sky-600" />
            Under Review
          </span>
        );
      case 'CORRECTION_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Correction Req.
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <FileText className="w-3 h-3 text-amber-600" />
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Not Started
          </span>
        );
    }
  };

  const summary = progressData?.summary || {
    totalExpected: 0,
    approved: 0,
    submitted: 0,
    correctionRequested: 0,
    draft: 0,
    notStarted: 0,
    completionPercentage: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header & Exam Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
            Examination Mark Submission Tracker
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time audit of subject marksheet submissions and review progress across all grades.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1830] text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            {exams.map((ex) => {
              const id = ex.exam?.id || ex.id;
              const title = ex.exam?.title || ex.title;
              return (
                <option key={id} value={id}>
                  {title}
                </option>
              );
            })}
          </select>

          <button
            onClick={() => fetchProgress(selectedExamId)}
            className="p-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-slate-50 dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading submission audit data...</p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Expected</span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {summary.totalExpected}
              </div>
              <span className="text-[10px] text-slate-400">Total papers</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-emerald-600">Approved</span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {summary.approved}
              </div>
              <span className="text-[10px] text-emerald-500">Fully vetted</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-sky-600">Under Review</span>
              <div className="text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5">
                {summary.submitted}
              </div>
              <span className="text-[10px] text-sky-500">Awaiting Deputy</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-rose-600">Correction</span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {summary.correctionRequested}
              </div>
              <span className="text-[10px] text-rose-500">Flagged errors</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-amber-600">Draft</span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {summary.draft}
              </div>
              <span className="text-[10px] text-amber-500">In scoring</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-[#091326] border border-slate-200 dark:border-[#162b4d] rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Completion</span>
              <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                {summary.completionPercentage}%
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${summary.completionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Classes Matrices */}
          <div className="space-y-3">
            {progressData?.classesProgress?.map((c: any) => {
              const isExpanded = !!expandedClasses[c.classId];
              return (
                <div
                  key={c.classId}
                  className="rounded-2xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#091326] shadow-xs overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleClass(c.classId)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-[#0c1830] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center font-bold text-sky-700 dark:text-sky-300 text-xs">
                        {c.className.replace('Grade ', 'G')}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100">{c.className}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.approvedSubjects} of {c.totalSubjects} papers approved
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-32 hidden sm:block">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span>Progress</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{c.completionPercentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-500 h-full rounded-full"
                            style={{ width: `${c.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0c1830]/30"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {c.subjects.map((sub: any) => (
                            <div
                              key={sub.subjectId}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#091326] shadow-xs text-xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {sub.subjectName}
                                </span>
                                {getStatusBadge(sub.status)}
                              </div>

                              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span>Teacher: {sub.allocatedTeacherName || 'Unallocated'}</span>
                                {sub.status !== 'NOT_STARTED' && (
                                  <span className="font-mono">Avg: {sub.averageMark}%</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
