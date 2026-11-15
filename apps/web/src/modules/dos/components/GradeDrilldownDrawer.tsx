import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';
import { PrimaryDistribution, JuniorDistribution } from './DistributionMicroBar';

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

  // Single-Subject Focused View state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | 'EE' | 'ME' | 'AE' | 'BE'>('ALL');

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

  // When class changes, reset selected subject
  useEffect(() => {
    setSelectedSubjectId(null);
    setSubjectFilter('ALL');
    setSearchQuery('');
  }, [classId]);

  const header = data?.gradeHeader;
  const isJunior = header?.isJunior ?? false;

  // Active selected subject for focused marksheet drilldown
  const activeSubject = selectedSubjectId && data?.subjectBreakdown
    ? data.subjectBreakdown.find((s) => s.subjectId === selectedSubjectId) || null
    : null;

  // Helper: compute competency mastery breakdown for a subject
  const getSubjectMastery = (dist: PrimaryDistribution | JuniorDistribution, isJuniorGrade: boolean, satCount: number) => {
    if (isJuniorGrade) {
      const d = (dist || {}) as JuniorDistribution;
      const c8 = d[8] || 0;
      const c7 = d[7] || 0;
      const c6 = d[6] || 0;
      const c5 = d[5] || 0;
      const c4 = d[4] || 0;
      const c3 = d[3] || 0;
      const c2 = d[2] || 0;
      const c1 = d[1] || 0;
      const total = satCount || (c8 + c7 + c6 + c5 + c4 + c3 + c2 + c1);
      const masteryCount = c8 + c7 + c6 + c5;
      const aeCount = c4 + c3;
      const beCount = c2 + c1;
      const masteryPct = total > 0 ? Math.round((masteryCount / total) * 100) : 0;
      return { masteryCount, aeCount, beCount, total, masteryPct, label: '5+ pts' };
    } else {
      const d = (dist || {}) as PrimaryDistribution;
      const ee = d.EE || 0;
      const me = d.ME || 0;
      const ae = d.AE || 0;
      const be = d.BE || 0;
      const total = satCount || (ee + me + ae + be);
      const masteryCount = ee + me;
      const aeCount = ae;
      const beCount = be;
      const masteryPct = total > 0 ? Math.round((masteryCount / total) * 100) : 0;
      return { masteryCount, aeCount, beCount, total, masteryPct, label: 'EE/ME' };
    }
  };

  // Build focused subject learner rows sorted by subject marks descending
  const subjectLearners = useMemo(() => {
    if (!activeSubject || !data?.broadsheet) return [];

    const list = data.broadsheet.map((l) => {
      const subScore = l.subjects[activeSubject.subjectId];
      const marks = subScore ? subScore.marks : null;
      const rubric = subScore ? subScore.rubric : '—';
      const rubricOrPoints = subScore ? subScore.rubricOrPoints : '—';
      const points = subScore ? subScore.points : null;
      const diffFromSubjectMean = (marks !== null && activeSubject.meanPct !== null)
        ? +(marks - activeSubject.meanPct).toFixed(1)
        : null;
      const isBe = isJunior
        ? (points !== null && points <= 2)
        : (rubric === 'BE' || (marks !== null && marks < 40));
      const isEe = isJunior ? (points !== null && points >= 7) : rubric === 'EE';
      const isMe = isJunior ? (points !== null && (points === 5 || points === 6)) : rubric === 'ME';
      const isAe = isJunior ? (points !== null && (points === 3 || points === 4)) : rubric === 'AE';

      return {
        studentId: l.studentId,
        admissionNo: l.admissionNo,
        fullName: l.fullName,
        marks,
        rubric,
        rubricOrPoints,
        points,
        diffFromSubjectMean,
        overallMeanPct: l.hasMarks ? l.meanPct : null,
        overallRank: l.rank,
        overallRubricOrPoints: l.overallRubricOrPoints,
        isBe,
        isEe,
        isMe,
        isAe,
      };
    });

    // Sort by marks in this subject descending (null marks last)
    list.sort((a, b) => {
      if (a.marks !== null && b.marks !== null) return b.marks - a.marks;
      if (a.marks !== null) return -1;
      if (b.marks !== null) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    // Assign sequential subject rank
    return list.map((item, idx) => ({
      ...item,
      subjectRank: item.marks !== null ? idx + 1 : null,
    }));
  }, [activeSubject, data?.broadsheet, isJunior]);

  // Filtered subject learners by quick-filter and search
  const filteredSubjectLearners = useMemo(() => {
    let list = subjectLearners;

    if (subjectFilter === 'EE') {
      list = list.filter((l) => l.isEe);
    } else if (subjectFilter === 'ME') {
      list = list.filter((l) => l.isMe);
    } else if (subjectFilter === 'AE') {
      list = list.filter((l) => l.isAe);
    } else if (subjectFilter === 'BE') {
      list = list.filter((l) => l.isBe);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.fullName.toLowerCase().includes(q) ||
          l.admissionNo.toLowerCase().includes(q)
      );
    }

    return list;
  }, [subjectLearners, subjectFilter, searchQuery]);

  // Quick filter counts for the focused subject
  const subjectCounts = useMemo(() => {
    const all = subjectLearners.length;
    const sat = subjectLearners.filter((l) => l.marks !== null).length;
    const ee = subjectLearners.filter((l) => l.isEe).length;
    const me = subjectLearners.filter((l) => l.isMe).length;
    const ae = subjectLearners.filter((l) => l.isAe).length;
    const be = subjectLearners.filter((l) => l.isBe).length;
    return { all, sat, ee, me, ae, be };
  }, [subjectLearners]);

  // Filtered broadsheet (when viewing all subjects)
  const filteredBroadsheet = useMemo(() => {
    if (!data?.broadsheet) return [];
    let list = data.broadsheet;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (learner) =>
          learner.fullName.toLowerCase().includes(q) ||
          learner.admissionNo.toLowerCase().includes(q)
      );
    }

    if (broadsheetFilter === 'TOP_MOVERS') {
      list = list.filter((learner) => learner.deltaPct !== null && learner.deltaPct > 0);
    } else if (broadsheetFilter === 'REMEDIAL') {
      list = list.filter((learner) =>
        isJunior ? learner.overallPoints <= 2 : learner.overallRubric === 'BE'
      );
    }

    return list;
  }, [data?.broadsheet, searchQuery, broadsheetFilter, isJunior]);

  // Export CSV for focused subject
  const handleExportSubjectCSV = (sub: SubjectBreakdownItem) => {
    if (!filteredSubjectLearners.length) return;
    const headers = [
      'Subject Rank',
      'Admission No',
      'Learner Name',
      `${sub.subjectName} (%)`,
      isJunior ? 'Points Scale' : 'CBC Rubric',
      'vs Subject Mean (%)',
      'Overall Class Mean (%)',
      'Diagnostic Status',
    ];
    const rows = filteredSubjectLearners.map((l) => [
      l.subjectRank ?? '—',
      `"${l.admissionNo}"`,
      `"${l.fullName}"`,
      l.marks !== null ? `${l.marks}%` : 'Pending',
      `"${l.rubricOrPoints}"`,
      l.diffFromSubjectMean !== null ? `${l.diffFromSubjectMean > 0 ? '+' : ''}${l.diffFromSubjectMean}%` : '—',
      l.overallMeanPct !== null ? `${l.overallMeanPct}%` : '—',
      `"${l.isBe ? 'Remedial (BE)' : l.isAe ? 'Approaching (AE)' : l.isEe ? 'Exceeding (EE)' : 'Meeting (ME)'}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${header?.gradeName || 'Class'}_${sub.subjectCode || sub.subjectName}_Marksheet.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV for all subjects broadsheet
  const handleExportBroadsheetCSV = () => {
    if (!data?.broadsheet?.length || !data.subjects) return;
    const headers = [
      'Rank',
      'Admission No',
      'Learner Name',
      ...data.subjects.map((s) => `${s.code || s.name} (%)`),
      'Overall Mean (%)',
      isJunior ? 'Points Scale' : 'CBC Rubric',
      'vs Prev Exam (%)',
    ];
    const rows = data.broadsheet.map((l) => [
      l.rank ?? '—',
      `"${l.admissionNo}"`,
      `"${l.fullName}"`,
      ...data.subjects.map((s) => l.subjects[s.id]?.marks ?? '—'),
      l.hasMarks ? `${l.meanPct}%` : '—',
      `"${l.overallRubricOrPoints}"`,
      l.deltaPct !== null ? `${l.deltaPct > 0 ? '+' : ''}${l.deltaPct}%` : '—',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${header?.gradeName || 'Class'}_Full_Broadsheet.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
                  {activeSubject ? (
                    <span className="flex items-center gap-1.5">
                      <span>{activeSubject.subjectName} ({activeSubject.satCount})</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSubjectId(null);
                        }}
                        className="hover:text-slate-900 dark:hover:text-white"
                        title="Show All Subjects"
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    `Student Broadsheet & Merit (${data?.broadsheet?.length || 0})`
                  )}
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
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                          <th className="px-4 py-3">Learning Area</th>
                          <th className="px-3 py-3">Subject Teacher</th>
                          <th className="px-3 py-3 text-center">Sat</th>
                          <th className="px-3 py-3">Mean %</th>
                          <th className="px-3 py-3">Scale / Rubric</th>
                          <th className="px-3 py-3">vs Prev Exam</th>
                          <th className="px-3 py-3 min-w-[160px]">Competency Mastery</th>
                          <th className="px-3 py-3 text-center">Remedial (BE)</th>
                          <th className="px-3 py-3 text-right">Drilldown</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {data?.subjectBreakdown.map((sub) => {
                          const mastery = getSubjectMastery(sub.distribution, isJunior, sub.satCount);

                          return (
                            <tr
                              key={sub.subjectId}
                              onClick={() => {
                                setSelectedSubjectId(sub.subjectId);
                                setSubjectFilter('ALL');
                                setSearchQuery('');
                                setActiveTab('BROADSHEET');
                              }}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                            >
                              {/* Learning Area */}
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                                <div className="group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                  {sub.subjectName}
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">{sub.subjectCode}</span>
                              </td>

                              {/* Teacher */}
                              <td className="px-3 py-3 text-slate-600 dark:text-slate-300 font-medium">
                                {sub.teacherName}
                              </td>

                              {/* Sat Count */}
                              <td className="px-3 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">
                                {sub.satCount}
                              </td>

                              {/* Mean % */}
                              <td className="px-3 py-3 font-black text-slate-900 dark:text-slate-100 font-mono">
                                {sub.meanPct}%
                              </td>

                              {/* Scale / Rubric */}
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  {sub.meanPointsOrRubric}
                                </span>
                              </td>

                              {/* Delta */}
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
                                  <span className="text-[10px] text-slate-400">— (First Exam)</span>
                                )}
                              </td>

                              {/* Replaced Score Spread: Clear Competency Mastery Rate */}
                              <td className="px-3 py-3">
                                <div className="space-y-1 min-w-[140px]">
                                  <div className="flex items-center justify-between text-xs">
                                    <span
                                      className={`font-black ${
                                        mastery.masteryPct >= 80
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : mastery.masteryPct >= 60
                                          ? 'text-sky-600 dark:text-sky-400'
                                          : mastery.masteryPct >= 50
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}
                                    >
                                      {mastery.masteryPct}% {mastery.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {mastery.masteryCount}/{mastery.total}
                                    </span>
                                  </div>

                                  {/* High-Contrast Progress Bar: Green (Mastery), Amber (Approaching), Rose (Below) */}
                                  <div
                                    className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden border border-slate-200/60 dark:border-slate-700/60"
                                    title={`Mastery (${mastery.label}): ${mastery.masteryCount} (${mastery.masteryPct}%) | Approaching: ${mastery.aeCount} | Below: ${mastery.beCount}`}
                                  >
                                    <div
                                      style={{ width: `${(mastery.masteryCount / (mastery.total || 1)) * 100}%` }}
                                      className="bg-emerald-500 h-full"
                                    />
                                    <div
                                      style={{ width: `${(mastery.aeCount / (mastery.total || 1)) * 100}%` }}
                                      className="bg-amber-400 h-full"
                                    />
                                    <div
                                      style={{ width: `${(mastery.beCount / (mastery.total || 1)) * 100}%` }}
                                      className="bg-rose-500 h-full"
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Remedial BE Count */}
                              <td className="px-3 py-3 text-center">
                                {sub.beCount > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                                    {sub.beCount} BE
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono">0</span>
                                )}
                              </td>

                              {/* Drilldown Arrow Action */}
                              <td className="px-3 py-3 text-right">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 group-hover:underline">
                                  <span>View</span>
                                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    💡 Click any learning area to view that subject's learner performance marksheet alone.
                  </p>
                </div>
              ) : (
                /* TAB 2: Student Performance View (Focused Subject vs Full Broadsheet) */
                <div className="space-y-4">
                  {activeSubject ? (
                    /* FOCUSED SUBJECT MARKSHEET (The User's Request: show performance in this subject alone) */
                    <div className="space-y-3">
                      {/* 1. Context Banner for the Selected Subject */}
                      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-950/20 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {activeSubject.subjectName}
                              </h3>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                                {activeSubject.subjectCode}
                              </span>
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                Teacher: <strong className="text-slate-800 dark:text-slate-100">{activeSubject.teacherName}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                Subject Mean: <strong className="text-sky-600 dark:text-sky-400 font-mono">{activeSubject.meanPct}%</strong>
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {activeSubject.meanPointsOrRubric}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="text-slate-600 dark:text-slate-400">
                                Sat: <strong>{activeSubject.satCount}</strong>
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {subjectCounts.ee + subjectCounts.me}/{activeSubject.satCount} Mastered
                              </span>
                              {activeSubject.beCount > 0 && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700">·</span>
                                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                                    {activeSubject.beCount} Remedial (BE)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Switcher & Full Broadsheet Toggle */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative">
                            <select
                              value={activeSubject.subjectId}
                              onChange={(e) => {
                                if (e.target.value === 'ALL') {
                                  setSelectedSubjectId(null);
                                } else {
                                  setSelectedSubjectId(e.target.value);
                                  setSubjectFilter('ALL');
                                }
                              }}
                              className="h-8 text-xs font-semibold pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-1 focus:ring-sky-500 appearance-none cursor-pointer"
                              title="Switch to another learning area"
                            >
                              <option value="ALL">← View All Subjects (Full Broadsheet)</option>
                              {data?.subjectBreakdown.map((s) => (
                                <option key={s.subjectId} value={s.subjectId}>
                                  {s.subjectName} ({s.meanPct}%)
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedSubjectId(null)}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            title="View all subjects side-by-side"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>All Subjects</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportSubjectCSV(activeSubject)}
                            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            title="Export this subject's marksheet to CSV"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                            <span>Export CSV</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Controls: Search & Subject-Specific Rubric Filter Pills */}
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

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSubjectFilter('ALL')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              subjectFilter === 'ALL'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            All ({subjectCounts.all})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubjectFilter('EE')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              subjectFilter === 'EE'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {isJunior ? '8-7 pts' : 'Exceeding / EE'} ({subjectCounts.ee})
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubjectFilter('ME')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              subjectFilter === 'ME'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            {isJunior ? '6-5 pts' : 'Meeting / ME'} ({subjectCounts.me})
                          </button>
                          {subjectCounts.ae > 0 && (
                            <button
                              type="button"
                              onClick={() => setSubjectFilter('AE')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                                subjectFilter === 'AE'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              {isJunior ? '4-3 pts' : 'Approaching / AE'} ({subjectCounts.ae})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSubjectFilter('BE')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              subjectFilter === 'BE'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            Remedial / BE ({subjectCounts.be})
                          </button>
                        </div>
                      </div>

                      {/* 3. Focused Subject Marksheet Table */}
                      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 select-none">
                              <th className="px-3 py-2.5 text-center w-14">Rank</th>
                              <th className="px-3 py-2.5 min-w-[180px]">Learner Name & Adm</th>
                              <th className="px-3 py-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                                {activeSubject.subjectCode} Score
                              </th>
                              <th className="px-3 py-2.5 text-center">CBC Rating</th>
                              <th className="px-3 py-2.5 text-center">vs Subject Mean ({activeSubject.meanPct}%)</th>
                              <th className="px-3 py-2.5 text-center">Overall Class Mean</th>
                              <th className="px-3 py-2.5 text-center">Diagnostic Level</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {filteredSubjectLearners.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic text-xs">
                                  No learners match the selected filter criteria for this learning area.
                                </td>
                              </tr>
                            ) : (
                              filteredSubjectLearners.map((learner) => (
                                <tr
                                  key={learner.studentId}
                                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                                    learner.isBe ? 'bg-rose-500/[0.03]' : ''
                                  }`}
                                >
                                  {/* 1. Subject Rank */}
                                  <td className="px-3 py-2.5 text-center font-mono font-bold whitespace-nowrap">
                                    {learner.subjectRank !== null ? (
                                      <span
                                        className={`text-xs ${
                                          learner.subjectRank <= 3
                                            ? 'text-sky-600 dark:text-sky-400 font-black'
                                            : 'text-slate-700 dark:text-slate-300'
                                        }`}
                                      >
                                        #{learner.subjectRank}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>

                                  {/* 2. Learner Details */}
                                  <td className="px-3 py-2.5">
                                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                      {learner.fullName}
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400">
                                      Adm: {learner.admissionNo}
                                    </span>
                                  </td>

                                  {/* 3. Subject Score */}
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    {learner.marks !== null ? (
                                      <span
                                        className={`font-mono font-black text-sm ${
                                          learner.marks >= 75
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : learner.marks >= 50
                                            ? 'text-sky-600 dark:text-sky-400'
                                            : learner.marks >= 40
                                            ? 'text-amber-600 dark:text-amber-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                        }`}
                                      >
                                        {learner.marks}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-mono">—</span>
                                    )}
                                  </td>

                                  {/* 4. CBC Rating */}
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    {learner.marks !== null ? (
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                          learner.rubric === 'EE' || (isJunior && (learner.points ?? 0) >= 7)
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                            : learner.rubric === 'ME' || (isJunior && (learner.points ?? 0) >= 5)
                                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                                            : learner.rubric === 'AE' || (isJunior && (learner.points ?? 0) >= 3)
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                        }`}
                                      >
                                        {learner.rubricOrPoints}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>

                                  {/* 5. vs Subject Mean */}
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap font-mono">
                                    {learner.diffFromSubjectMean !== null ? (
                                      <span
                                        className={`text-[11px] font-bold ${
                                          learner.diffFromSubjectMean >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                        }`}
                                      >
                                        {learner.diffFromSubjectMean >= 0 ? '+' : ''}
                                        {learner.diffFromSubjectMean}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>

                                  {/* 6. Overall Class Mean */}
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    {learner.overallMeanPct !== null ? (
                                      <div className="flex items-center justify-center gap-1 text-[11px]">
                                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                          {learner.overallMeanPct}%
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          (Class #{learner.overallRank})
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>

                                  {/* 7. Diagnostic Status */}
                                  <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                    {learner.isBe ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                        Remedial (BE)
                                      </span>
                                    ) : learner.isAe ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                        Approaching (AE)
                                      </span>
                                    ) : learner.isEe ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Exceeding (EE)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                        Meeting (ME)
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* FULL BROADSHEET WITH ALL SUBJECTS (When no single subject is focused) */
                    <div className="space-y-3">
                      {/* Search, Subject Picker, and Filter Pills */}
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

                        {/* Quick Subject Focus Dropdown */}
                        <div className="relative">
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setSelectedSubjectId(e.target.value);
                                setSubjectFilter('ALL');
                              }
                            }}
                            className="h-8 text-xs font-semibold pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-200 shadow-2xs focus:ring-1 focus:ring-sky-500 appearance-none cursor-pointer"
                          >
                            <option value="">Focus Specific Subject...</option>
                            {data?.subjectBreakdown.map((s) => (
                              <option key={s.subjectId} value={s.subjectId}>
                                {s.subjectName} ({s.meanPct}%)
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setBroadsheetFilter('ALL')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
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
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
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
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              broadsheetFilter === 'REMEDIAL'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                            }`}
                          >
                            Remedial Watchlist (BE)
                          </button>

                          <button
                            type="button"
                            onClick={handleExportBroadsheetCSV}
                            className="h-7 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="Export Full Broadsheet CSV"
                          >
                            <Download className="w-3 h-3 text-slate-400" />
                            <span>CSV</span>
                          </button>
                        </div>
                      </div>

                      {/* Broadsheet Table with Sticky First Columns */}
                      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800/80 dark:bg-[#111827] shadow-xs overflow-x-auto max-h-[60vh]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
                            <tr>
                              <th className="px-3 py-2.5 text-center w-12 sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                                Rank
                              </th>
                              <th className="px-3 py-2.5 min-w-[160px] sticky left-12 z-20 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                                Learner Name & Adm
                              </th>
                              <th className="px-3 py-2.5 text-center">Mean %</th>
                              <th className="px-3 py-2.5 text-center">Scale / Rubric</th>
                              <th className="px-3 py-2.5 text-center">vs Prev Exam</th>
                              {/* Dynamic Subject Columns */}
                              {data?.subjects?.map((sub) => (
                                <th
                                  key={sub.id}
                                  onClick={() => {
                                    setSelectedSubjectId(sub.id);
                                    setSubjectFilter('ALL');
                                  }}
                                  className="px-3 py-2.5 text-center whitespace-nowrap min-w-[70px] cursor-pointer hover:bg-sky-100/60 dark:hover:bg-sky-950/60 transition-colors"
                                  title={`${sub.name} - Click to focus on this subject alone`}
                                >
                                  <div className="flex flex-col items-center">
                                    <span>{sub.code || sub.name.slice(0, 4)}</span>
                                    <span className="text-[9px] text-sky-500 font-normal">Focus →</span>
                                  </div>
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
                                      onClick={() => {
                                        setSelectedSubjectId(sub.id);
                                        setSubjectFilter('ALL');
                                      }}
                                      className="px-3 py-2.5 text-center font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                                      title="Click to view this subject alone"
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
              )}
            </div>
          </motion.div>
        </div>
      </div>
      )}
    </AnimatePresence>
  );
};