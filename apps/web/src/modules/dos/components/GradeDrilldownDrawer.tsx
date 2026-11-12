import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  BookOpen,
  Award,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  Download,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import { DistributionMicroBar, PrimaryDistribution, JuniorDistribution } from './DistributionMicroBar';

interface GradeHeaderData {
  classId: string;
  gradeName: string;
  levelCategory: string;
  numericOrder: number;
  isJunior: boolean;
  classTeacherId: string | null;
  classTeacherName: string;
  enrolledCount: number;
  satCount: number;
  hasMarks: boolean;
  meanPercentage: number;
  meanPoints: number | null;
  deltaPercentage: number | null;
  deltaPoints: number | null;
  overallScaleOrRubric: string;
}

interface SubjectBreakdownItem {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
  satCount: number;
  meanPct: number;
  deltaPct: number | null;
  meanPointsOrRubric: string;
  distribution: PrimaryDistribution | JuniorDistribution;
  beCount: number;
}

interface StudentBroadsheetItem {
  rank: number;
  studentId: string;
  admissionNo: string;
  assessmentNumber: string;
  fullName: string;
  gender: string;
  hasMarks: boolean;
  totalMarks: number;
  maxPossibleMarks: number;
  meanPct: number;
  deltaPct: number | null;
  overallRubric: string;
  overallPoints: number;
  overallRubricOrPoints: string;
  subjects: Record<string, { marks: number; rubricOrPoints: string; rubric: string; points: number }>;
}

interface GradeDrilldownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string | null;
  examId?: string;
  compareExamId?: string;
  allGrades: Array<{ id: string; name: string }>;
  onSelectGrade: (newClassId: string) => void;
}

export const GradeDrilldownDrawer: React.FC<GradeDrilldownDrawerProps> = ({
  isOpen,
  onClose,
  classId,
  examId,
  compareExamId,
  allGrades,
  onSelectGrade,
}) => {
  const [activeTab, setActiveTab] = useState<'SUBJECTS' | 'BROADSHEET'>('SUBJECTS');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    gradeHeader: GradeHeaderData;
    subjectBreakdown: SubjectBreakdownItem[];
    broadsheet: StudentBroadsheetItem[];
    subjects: Array<{ id: string; name: string; code: string }>;
  } | null>(null);

  // Search & Filter state for broadsheet
  const [searchQuery, setSearchQuery] = useState('');
  const [broadsheetFilter, setBroadsheetFilter] = useState<'ALL' | 'TOP_MOVERS' | 'REMEDIAL'>('ALL');
  const [highlightSubjectId, setHighlightSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !classId) return;

    let isMounted = true;
    setLoading(true);

    const params = new URLSearchParams();
    if (examId) params.append('examId', examId);
    if (compareExamId) params.append('compareExamId', compareExamId);

    apiClient
      .get(`/api/examinations/schoolwide-overview/classes/${classId}?${params.toString()}`)
      .then((res) => {
        if (isMounted) {
          setData(res.data.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load grade overview', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, classId, examId, compareExamId]);

  if (!isOpen) return null;

  const header = data?.gradeHeader;
  const isJunior = header?.isJunior ?? false;

  // Filtered broadsheet
  const filteredBroadsheet = (data?.broadsheet || []).filter((learner) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = learner.fullName.toLowerCase().includes(q);
      const matchAdm = learner.admissionNo.toLowerCase().includes(q);
      if (!matchName && !matchAdm) return false;
    }

    // Filter pill
    if (broadsheetFilter === 'TOP_MOVERS') {
      return learner.deltaPct !== null && learner.deltaPct > 0;
    }
    if (broadsheetFilter === 'REMEDIAL') {
      return isJunior ? learner.overallPoints <= 2 : learner.overallRubric === 'BE';
    }

    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="w-screen max-w-4xl bg-white dark:bg-[#0b1120] shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
          >
            {/* 1. Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#111827] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {/* Grade Switcher Dropdown */}
                <div className="relative">
                  <select
                    value={classId || ''}
                    onChange={(e) => onSelectGrade(e.target.value)}
                    className="appearance-none text-base font-black text-slate-900 dark:text-slate-100 bg-white dark:bg-[#1a2333] border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-1.5 cursor-pointer shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  >
                    {allGrades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {header && (
                  <div className="hidden sm:flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {header.levelCategory.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      Class Teacher: <strong className="text-slate-700 dark:text-slate-200">{header.classTeacherName}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Header Right Stats & Close */}
              <div className="flex items-center gap-3">
                {header && header.hasMarks && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white dark:bg-[#1a2333] rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">Mean:</span>
                    <span className="font-black text-slate-900 dark:text-slate-100">
                      {isJunior ? `${header.meanPoints} pts` : `${header.meanPercentage}%`}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                      {header.overallScaleOrRubric}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2. Compact Segmented Control Tabs */}
            <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('SUBJECTS')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'SUBJECTS'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Learning Area Breakdown ({data?.subjectBreakdown?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('BROADSHEET')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeTab === 'BROADSHEET'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Student Broadsheet & Merit ({data?.broadsheet?.length || 0})
                </button>
              </div>

              {/* Sub-header indicators */}
              {header && (
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Candidacy:{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-bold">
                    {header.satCount} / {header.enrolledCount} Sat
                  </strong>
                </div>
              )}
            </div>

            {/* 3. Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : activeTab === 'SUBJECTS' ? (
                /* TAB 1: Learning Area Breakdown */
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                        <th className="px-4 py-3">Learning Area</th>
                        <th className="px-3 py-3">Subject Teacher</th>
                        <th className="px-3 py-3 text-center">Sat</th>
                        <th className="px-3 py-3">Mean %</th>
                        <th className="px-3 py-3">Scale / Rubric</th>
                        <th className="px-3 py-3">vs Baseline</th>
                        <th className="px-3 py-3">Spread (Micro-bar)</th>
                        <th className="px-3 py-3 text-center">BE Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {data?.subjectBreakdown.map((sub) => (
                        <tr
                          key={sub.subjectId}
                          onClick={() => {
                            setHighlightSubjectId(sub.subjectId);
                            setActiveTab('BROADSHEET');
                          }}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                            <div>{sub.subjectName}</div>
                            <span className="text-[10px] font-mono text-slate-400">{sub.subjectCode}</span>
                          </td>
                          <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-medium">
                            {sub.teacherName}
                          </td>
                          <td className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                            {sub.satCount}
                          </td>
                          <td className="px-3 py-3 font-black text-slate-900 dark:text-slate-100">
                            {sub.meanPct}%
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {sub.meanPointsOrRubric}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            {sub.deltaPct !== null ? (
                              <span
                                className={`inline-flex items-center gap-0.5 text-[10px] font-black ${
                                  sub.deltaPct >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {sub.deltaPct >= 0 ? '+' : ''}
                                {sub.deltaPct}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Baseline</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <DistributionMicroBar
                              isJunior={isJunior}
                              distribution={sub.distribution}
                            />
                          </td>
                          <td className="px-3 py-3 text-center">
                            {sub.beCount > 0 ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                {sub.beCount}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* TAB 2: Student Broadsheet & Merit List */
                <div className="space-y-3">
                  {/* Search and Filter Pills */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search learner name or admission no..."
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setBroadsheetFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          broadsheetFilter === 'ALL'
                            ? 'bg-sky-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        All ({data?.broadsheet?.length || 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBroadsheetFilter('TOP_MOVERS')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          broadsheetFilter === 'TOP_MOVERS'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        Top Movers (+Delta)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBroadsheetFilter('REMEDIAL')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          broadsheetFilter === 'REMEDIAL'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        Remedial Watchlist (BE)
                      </button>
                    </div>
                  </div>

                  {/* Broadsheet Table with Sticky First Columns */}
                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                            Rank
                          </th>
                          <th className="px-3 py-2.5 min-w-[160px] sticky left-12 z-20 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                            Learner Name & Adm
                          </th>
                          <th className="px-3 py-2.5 text-center">Mean %</th>
                          <th className="px-3 py-2.5 text-center">Scale / Rubric</th>
                          <th className="px-3 py-2.5 text-center">Delta</th>
                          {/* Dynamic Subject Columns */}
                          {data?.subjects?.map((sub) => (
                            <th
                              key={sub.id}
                              className={`px-3 py-2.5 text-center whitespace-nowrap min-w-[70px] ${
                                highlightSubjectId === sub.id
                                  ? 'bg-sky-100/70 text-sky-900 dark:bg-sky-950 dark:text-sky-300'
                                  : ''
                              }`}
                              title={sub.name}
                            >
                              {sub.code || sub.name.slice(0, 4)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredBroadsheet.map((learner) => (
                          <tr key={learner.studentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            {/* Sticky Rank */}
                            <td className="px-3 py-2.5 text-center font-black text-slate-700 dark:text-slate-300 sticky left-0 z-10 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800">
                              #{learner.rank}
                            </td>

                            {/* Sticky Name & Adm */}
                            <td className="px-3 py-2.5 sticky left-12 z-10 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800">
                              <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {learner.fullName}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">
                                {learner.admissionNo}
                              </span>
                            </td>

                            {/* Mean % */}
                            <td className="px-3 py-2.5 text-center font-black text-slate-900 dark:text-slate-100">
                              {learner.hasMarks ? `${learner.meanPct}%` : '—'}
                            </td>

                            {/* Scale / Rubric */}
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              {learner.hasMarks ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {learner.overallRubricOrPoints}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>

                            {/* Delta */}
                            <td className="px-3 py-2.5 text-center whitespace-nowrap">
                              {learner.deltaPct !== null ? (
                                <span
                                  className={`text-[10px] font-black ${
                                    learner.deltaPct >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {learner.deltaPct >= 0 ? '+' : ''}
                                  {learner.deltaPct}%
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">—</span>
                              )}
                            </td>

                            {/* Dynamic Subject Cells */}
                            {data?.subjects?.map((sub) => {
                              const score = learner.subjects[sub.id];
                              return (
                                <td
                                  key={sub.id}
                                  className={`px-3 py-2.5 text-center font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap ${
                                    highlightSubjectId === sub.id
                                      ? 'bg-sky-50/50 dark:bg-sky-950/20 font-bold'
                                      : ''
                                  }`}
                                >
                                  {score ? (
                                    <div>
                                      <span>{score.marks}</span>
                                      <span className="text-[9px] font-mono text-slate-400 block">
                                        {score.rubricOrPoints}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
