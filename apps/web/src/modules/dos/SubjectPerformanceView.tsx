import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  Award,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  Printer,
  Search,
  ChevronDown,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Calculator,
  UserCheck,
  UserX,
  Target,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';
import { printElement } from '../../lib/printElement';

type ActiveTab = 'MARKSHEET' | 'REMEDIAL' | 'CROSS_CLASS' | 'DISTRIBUTION';

export const SubjectPerformanceView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('MARKSHEET');
  const [searchQuery, setSearchQuery] = useState('');

  // Analysis payload & filter states
  const [data, setData] = useState<any | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const fetchPerformance = async (examId?: string, subjectId?: string, classId?: string) => {
    try {
      setLoading(true);
      setAccessDeniedMessage(null);
      const params = new URLSearchParams();
      if (examId && examId !== 'all') params.append('examId', examId);
      if (subjectId) params.append('subjectId', subjectId);
      if (classId) params.append('classId', classId);

      const res = await apiClient.get(`/api/dos/subject-performance?${params.toString()}`);
      const payload = res.data.data;
      setData(payload);

      if (payload?.selectedExam && !selectedExamId) {
        setSelectedExamId(payload.selectedExam.id);
      }
      if (payload?.selectedSubject) {
        setSelectedSubjectId(payload.selectedSubject.id);
      }
      if (payload?.selectedClass) {
        setSelectedClassId(payload.selectedClass.id);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setAccessDeniedMessage(
          error.response?.data?.message ||
            'Access denied: You do not have an active subject teaching allocation.'
        );
      } else {
        toast.error(error.response?.data?.message || 'Failed to load subject performance');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, []);

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    fetchPerformance(examId, selectedSubjectId || undefined, selectedClassId || undefined);
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    // Let backend pick default class for this subject
    setSelectedClassId('');
    fetchPerformance(selectedExamId || undefined, subjectId, undefined);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    fetchPerformance(selectedExamId || undefined, selectedSubjectId || undefined, classId);
  };

  const metrics = data?.subjectMetrics || {};
  const selectedSubject = data?.selectedSubject;
  const selectedClass = data?.selectedClass;
  const userScope = data?.userScope;

  // Filtered marksheet students
  const filteredMarksheet = useMemo(() => {
    if (!data?.studentsMarksheet) return [];
    if (!searchQuery.trim()) return data.studentsMarksheet;
    const q = searchQuery.toLowerCase();
    return data.studentsMarksheet.filter(
      (s: any) =>
        s.studentName.toLowerCase().includes(q) ||
        (s.assessmentNumber && s.assessmentNumber.toLowerCase().includes(q))
    );
  }, [data?.studentsMarksheet, searchQuery]);

  // Filtered remedial students
  const filteredRemedial = useMemo(() => {
    if (!data?.remedialLearners) return [];
    if (!searchQuery.trim()) return data.remedialLearners;
    const q = searchQuery.toLowerCase();
    return data.remedialLearners.filter(
      (s: any) =>
        s.studentName.toLowerCase().includes(q) ||
        (s.assessmentNumber && s.assessmentNumber.toLowerCase().includes(q))
    );
  }, [data?.remedialLearners, searchQuery]);

  // CSV Export for Subject Marksheet
  const handleExportCSV = () => {
    if (!data?.studentsMarksheet || data.studentsMarksheet.length === 0) {
      toast.warning('No student marks available to export');
      return;
    }

    const headers = ['Rank', 'Assessment Number', 'Student Name', 'Marks Obtained', 'Max Marks', 'Percentage (%)', 'Rubric / Points', 'Teacher Remarks'];
    const rows = data.studentsMarksheet.map((s: any) => [
      s.rank,
      `"${s.assessmentNumber || '—'}"`,
      `"${s.studentName}"`,
      s.marksObtained,
      s.maxMarks,
      `${Math.round((s.marksObtained / s.maxMarks) * 100)}%`,
      s.points ? `Points ${s.points}` : s.rubric,
      `"${s.remarks || '—'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${selectedSubject?.name || 'Subject'}_${selectedClass?.name || 'Class'}_Marksheet.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Subject marksheet downloaded');
  };

  // Print Subject Performance
  const handlePrint = () => {
    printElement(
      'subject-performance-printable-area',
      `${selectedSubject?.name || 'Subject'} - ${selectedClass?.name || 'Class'} Performance`
    );
  };

  if (!loading && accessDeniedMessage && !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-amber-200 dark:border-amber-900/50 p-6 sm:p-8 rounded-2xl shadow-glass dark:shadow-none text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Subject Performance Access Restricted
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
            {accessDeniedMessage}
          </p>
          <div className="pt-2">
            <a
              href="/overview"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Return to Overview
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLoadingWrapper isLoading={loading} subtitle="Analyzing subject marks & stream benchmarks...">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div id="subject-performance-printable-area" className="space-y-6">
          {/* 1. Header & Context Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] p-4 sm:p-5 rounded-2xl shadow-glass dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {selectedSubject ? `${selectedSubject.name}` : 'Subject Performance'}
                    {selectedClass ? ` · ${selectedClass.name}` : ''}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {userScope?.isLeadership ? 'Leadership Oversight' : 'Subject Teacher'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Subject-specific examination marks, cross-class stream comparisons, and remedial intervention roster
                </p>
              </div>
            </div>

            {/* Selector Controls & Export */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Exam Selector */}
              {data?.examsList && data.examsList.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedExamId}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="px-3.5 py-2 pr-9 bg-slate-50 dark:bg-[#0c1932] border border-slate-200 dark:border-[#162b4d] rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-xs appearance-none"
                  >
                    {data.examsList.map((exam: any) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title} ({exam.termName})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Subject Selector */}
              {data?.subjectsList && data.subjectsList.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="px-3.5 py-2 pr-9 bg-slate-50 dark:bg-[#0c1932] border border-slate-200 dark:border-[#162b4d] rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-xs appearance-none"
                  >
                    {data.subjectsList.map((sub: any) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} {sub.code ? `(${sub.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Export CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Export Subject Marksheet to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              {/* Print Marksheet */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1932] hover:bg-slate-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Print Subject Summary"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* 2. Interactive Class Switcher (for teachers teaching multiple classes) */}
          {data?.classesList && data.classesList.length > 1 && (
            <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] p-3 sm:p-4 rounded-2xl shadow-glass dark:shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Switch Class Stream for {selectedSubject?.name || 'this subject'}:
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {data.classesList.map((cls: any) => {
                  const isActive = cls.id === selectedClassId;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => handleClassChange(cls.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-[#0c1932] text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-[#142647]'
                      }`}
                    >
                      {cls.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Compact KPI Strip (Sleek Horizontal Banner instead of large bulky cards) */}
          <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none p-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-[#162b4d] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-0">
            {/* Metric 1: Subject Class Mean */}
            <div className="sm:px-4 py-2 sm:py-0 first:pl-0 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Subject Mean
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                  {metrics.averageScore > 0 ? `${metrics.averageScore}%` : '—'}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                {metrics.averageScore >= 75 ? 'Level 4 · Exceeding' : metrics.averageScore >= 50 ? 'Level 3 · Meeting' : 'Level 2 · Approaching'}
              </span>
            </div>

            {/* Metric 2: Candidacy Sat */}
            <div className="sm:px-4 py-2 sm:py-0 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Candidacy Sat
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                  {metrics.candidacyRate ?? 100}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {metrics.totalSat ?? 0} of {metrics.totalEnrolled ?? 0} assessed
              </span>
            </div>

            {/* Metric 3: Proficiency Pass */}
            <div className="sm:px-4 py-2 sm:py-0 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Proficiency Pass
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {metrics.proficiencyRate ?? 0}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {(metrics.rubricDistribution?.EE ?? 0) + (metrics.rubricDistribution?.ME ?? 0)} Scores EE / ME
              </span>
            </div>

            {/* Metric 4: #1 Top Learner */}
            <div className="sm:px-4 py-2 sm:py-0 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                #1 Top Learner
              </span>
              <div className="mt-1 truncate">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate block">
                  {metrics.topLearner?.studentName || '—'}
                </span>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold font-mono mt-0.5">
                {metrics.topLearner ? `${metrics.topLearner.marksObtained}% (${metrics.topLearner.rubric})` : 'No scores'}
              </span>
            </div>

            {/* Metric 5: Lowest Learner */}
            <div className="sm:px-4 py-2 sm:py-0 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lowest Learner
              </span>
              <div className="mt-1 truncate">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 truncate block">
                  {metrics.lowestLearner?.studentName || '—'}
                </span>
              </div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold font-mono mt-0.5">
                {metrics.lowestLearner ? `${metrics.lowestLearner.marksObtained}% (${metrics.lowestLearner.rubric})` : 'No scores'}
              </span>
            </div>

            {/* Metric 6: Remedial Attention Count */}
            <div className="sm:px-4 py-2 sm:py-0 last:pr-0 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Needs Attention
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black font-mono ${metrics.remedialCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {metrics.remedialCount ?? 0}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {metrics.remedialCount > 0 ? 'Learners <50% or BE' : 'All learners passing'}
              </span>
            </div>
          </div>

          {/* 4. Cross-Class Stream Quick Alert (if multiple classes exist) */}
          {data?.crossClassComparison && data.crossClassComparison.length > 1 && (
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-[#09152b] dark:to-[#0f1d38] border border-sky-200 dark:border-[#1a335c] p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                    Cross-Class Stream Performance Comparison
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    You teach {selectedSubject?.name || 'this subject'} across {data.crossClassComparison.length} classes. Click below to inspect cross-class benchmarks.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {data.crossClassComparison.map((c: any) => (
                  <div
                    key={c.classId}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${
                      c.classId === selectedClassId
                        ? 'border-sky-500 bg-white dark:bg-[#0c1932] text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#0c1932]/50 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {c.className}: {c.averageScore}% Mean ({c.proficiencyRate}% Pass)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Modern Single-Row Accessible Tab Bar (modern-web-guidance) */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 overflow-x-auto flex-nowrap">
            <div
              role="tablist"
              aria-label="Subject performance view tabs"
              className="flex items-center gap-2 shrink-0"
            >
              <button
                type="button"
                role="tab"
                id="tab-marksheet"
                aria-selected={activeTab === 'MARKSHEET'}
                aria-controls="panel-marksheet"
                onClick={() => setActiveTab('MARKSHEET')}
                className={`px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer ${
                  activeTab === 'MARKSHEET'
                    ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Subject Marksheet ({data?.studentsMarksheet?.length || 0})
              </button>

              <button
                type="button"
                role="tab"
                id="tab-remedial"
                aria-selected={activeTab === 'REMEDIAL'}
                aria-controls="panel-remedial"
                onClick={() => setActiveTab('REMEDIAL')}
                className={`px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'REMEDIAL'
                    ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>Learners Needing Attention</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  metrics.remedialCount > 0
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {metrics.remedialCount || 0}
                </span>
              </button>

              {data?.crossClassComparison && data.crossClassComparison.length > 1 && (
                <button
                  type="button"
                  role="tab"
                  id="tab-cross-class"
                  aria-selected={activeTab === 'CROSS_CLASS'}
                  aria-controls="panel-cross-class"
                  onClick={() => setActiveTab('CROSS_CLASS')}
                  className={`px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer ${
                    activeTab === 'CROSS_CLASS'
                      ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Cross-Class Stream Benchmarks ({data.crossClassComparison.length})
                </button>
              )}

              <button
                type="button"
                role="tab"
                id="tab-distribution"
                aria-selected={activeTab === 'DISTRIBUTION'}
                aria-controls="panel-distribution"
                onClick={() => setActiveTab('DISTRIBUTION')}
                className={`px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer ${
                  activeTab === 'DISTRIBUTION'
                    ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Rubric & Points Spread
              </button>
            </div>

            {/* Quick search input */}
            {(activeTab === 'MARKSHEET' || activeTab === 'REMEDIAL') && (
              <div className="relative w-48 sm:w-64 pb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search learner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-[#0c1932] border border-slate-200 dark:border-[#162b4d] rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-xs"
                />
              </div>
            )}
          </div>

          {/* 6. Tab Content Panels */}
          {/* TAB 1: SUBJECT MARKSHEET */}
          <div
            role="tabpanel"
            id="panel-marksheet"
            aria-labelledby="tab-marksheet"
            tabIndex={0}
            hidden={activeTab !== 'MARKSHEET'}
            className="space-y-4 focus:outline-none"
          >
            <div
              tabIndex={0}
              role="region"
              aria-label="Subject marksheet table"
              className="table-wrapper overflow-x-auto rounded-2xl border border-sky-100 dark:border-[#162b4d] bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md shadow-glass dark:shadow-none"
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-sky-100 dark:border-[#162b4d] bg-slate-50/95 dark:bg-[#0c1932]/95 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th scope="col" className="p-3.5 w-16 text-center">Rank</th>
                    <th scope="col" className="p-3.5 w-36">Assessment No</th>
                    <th scope="col" className="p-3.5">Learner Name</th>
                    <th scope="col" className="p-3.5 w-28 text-right">Score</th>
                    <th scope="col" className="p-3.5 w-32 text-center">Competency</th>
                    <th scope="col" className="p-3.5 w-32 text-center">Performance Level</th>
                    <th scope="col" className="p-3.5">Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d]">
                  {filteredMarksheet.length > 0 ? (
                    filteredMarksheet.map((student: any) => {
                      const isTop = student.rank === 1;
                      const isLast = student.rank === (data?.studentsMarksheet?.length || 0);
                      const isStruggling = student.marksObtained < 50 || student.rubric === 'BE';

                      return (
                        <tr
                          key={student.studentId}
                          className={`hover:bg-sky-50/50 dark:hover:bg-[#0e2040]/50 transition-colors ${
                            isTop ? 'bg-amber-50/30 dark:bg-amber-950/20' : isStruggling ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center font-mono font-bold">
                            {isTop ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-[10px]">
                                #1
                              </span>
                            ) : isLast ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px]">
                                #{student.rank}
                              </span>
                            ) : (
                              `#${student.rank}`
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                            {student.assessmentNumber || '—'}
                          </td>
                          <th scope="row" className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                            {student.studentName}
                          </th>
                          <td className="p-3.5 text-right font-mono font-bold text-sm">
                            <span className={student.marksObtained >= 75 ? 'text-emerald-600 dark:text-emerald-400' : student.marksObtained >= 50 ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}>
                              {student.marksObtained}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal ml-0.5">/{student.maxMarks}</span>
                          </td>
                          <td className="p-3.5 text-center">
                            {student.points ? (
                              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {student.points} Pts
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                                student.rubric === 'EE'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200'
                                  : student.rubric === 'ME'
                                  ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-200'
                                  : student.rubric === 'AE'
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200'
                                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200'
                              }`}>
                                {student.rubric}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              {student.rubric === 'EE'
                                ? 'Exceeding'
                                : student.rubric === 'ME'
                                ? 'Meeting'
                                : student.rubric === 'AE'
                                ? 'Approaching'
                                : 'Below'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-400 italic">
                            {student.remarks || '—'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No learner examination records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TAB 2: REMEDIAL WATCHLIST */}
          <div
            role="tabpanel"
            id="panel-remedial"
            aria-labelledby="tab-remedial"
            tabIndex={0}
            hidden={activeTab !== 'REMEDIAL'}
            className="space-y-4 focus:outline-none"
          >
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-amber-900 dark:text-amber-300">
                  Targeted Subject Remedial Intervention Roster
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-0.5">
                  The following learners scored below the 50% passing threshold or were assessed as Below Expectations (BE) in {selectedSubject?.name}. Prioritize targeted exercises, revision sessions, and parent follow-ups.
                </p>
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Learners needing attention table"
              className="table-wrapper overflow-x-auto rounded-2xl border border-rose-100 dark:border-[#2d1520] bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md shadow-glass dark:shadow-none"
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-rose-100 dark:border-[#2d1520] bg-rose-50/80 dark:bg-[#1a0e18] text-[11px] font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
                    <th scope="col" className="p-3.5 w-36">Assessment No</th>
                    <th scope="col" className="p-3.5">Learner Name</th>
                    <th scope="col" className="p-3.5 w-28 text-right">Score</th>
                    <th scope="col" className="p-3.5 w-28 text-center">Competency</th>
                    <th scope="col" className="p-3.5 w-28 text-center">Risk Level</th>
                    <th scope="col" className="p-3.5">Remedial Focus & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d]">
                  {filteredRemedial.length > 0 ? (
                    filteredRemedial.map((student: any) => (
                      <tr key={student.studentId} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors">
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400">
                          {student.assessmentNumber || '—'}
                        </td>
                        <th scope="row" className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                          {student.studentName}
                        </th>
                        <td className="p-3.5 text-right font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                          {student.marksObtained}%
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200">
                            {student.rubric || 'BE'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            student.riskLevel === 'HIGH'
                              ? 'bg-red-100 dark:bg-red-950/90 text-red-800 dark:text-red-300 border border-red-300'
                              : 'bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300'
                          }`}>
                            {student.riskLevel} Risk
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">
                          {student.remarks || 'Assign foundational topic revision and extra supervised practice.'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        No learners currently scoring below expectations in {selectedSubject?.name}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TAB 3: CROSS-CLASS STREAM BENCHMARKS */}
          {data?.crossClassComparison && data.crossClassComparison.length > 1 && (
            <div
              role="tabpanel"
              id="panel-cross-class"
              aria-labelledby="tab-cross-class"
              tabIndex={0}
              hidden={activeTab !== 'CROSS_CLASS'}
              className="space-y-4 focus:outline-none"
            >
              <div
                tabIndex={0}
                role="region"
                aria-label="Cross-class comparison table"
                className="table-wrapper overflow-x-auto rounded-2xl border border-sky-100 dark:border-[#162b4d] bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md shadow-glass dark:shadow-none"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-sky-100 dark:border-[#162b4d] bg-slate-50/95 dark:bg-[#0c1932]/95 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th scope="col" className="p-3.5">Class Stream</th>
                      <th scope="col" className="p-3.5 w-28 text-right">Class Mean</th>
                      <th scope="col" className="p-3.5 w-28 text-right">Pass Rate</th>
                      <th scope="col" className="p-3.5 w-28 text-right">Highest</th>
                      <th scope="col" className="p-3.5 w-28 text-right">Lowest</th>
                      <th scope="col" className="p-3.5 w-32 text-center">Candidacy</th>
                      <th scope="col" className="p-3.5 w-32 text-center">Remedial Count</th>
                      <th scope="col" className="p-3.5 w-28 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d]">
                    {data.crossClassComparison.map((cls: any) => {
                      const isCurrent = cls.classId === selectedClassId;
                      return (
                        <tr
                          key={cls.classId}
                          className={`hover:bg-sky-50/50 dark:hover:bg-[#0e2040]/50 transition-colors ${
                            isCurrent ? 'bg-sky-50/40 dark:bg-sky-950/20 font-bold' : ''
                          }`}
                        >
                          <th scope="row" className="p-3.5 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{cls.className}</span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                                Active
                              </span>
                            )}
                          </th>
                          <td className="p-3.5 text-right font-mono font-bold text-sm">
                            {cls.averageScore}%
                          </td>
                          <td className="p-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {cls.proficiencyRate}%
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                            {cls.highestScore}%
                          </td>
                          <td className="p-3.5 text-right font-mono text-rose-600 dark:text-rose-400">
                            {cls.lowestScore}%
                          </td>
                          <td className="p-3.5 text-center font-mono">
                            {cls.testedCount} / {cls.enrolledCount} ({cls.candidacyRate}%)
                          </td>
                          <td className="p-3.5 text-center font-mono">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cls.remedialCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {cls.remedialCount}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                handleClassChange(cls.classId);
                                setActiveTab('MARKSHEET');
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-[#142647] transition-all cursor-pointer"
                            >
                              Switch View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: COMPETENCY DISTRIBUTION */}
          <div
            role="tabpanel"
            id="panel-distribution"
            aria-labelledby="tab-distribution"
            tabIndex={0}
            hidden={activeTab !== 'DISTRIBUTION'}
            className="space-y-4 focus:outline-none"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="p-4 bg-emerald-50/70 dark:bg-[#081a1a]/70 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-900 dark:text-emerald-300 text-sm">EE (75%–100%)</span>
                  <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-black rounded-full text-[10px] font-mono">
                    {metrics.rubricPercentages?.EE ?? 0}%
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-2">
                  {metrics.rubricDistribution?.EE ?? 0}
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  Exceeding Expectations
                </p>
              </div>

              <div className="p-4 bg-sky-50/70 dark:bg-[#07172b]/70 border border-sky-200 dark:border-sky-900/50 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-black text-sky-900 dark:text-sky-300 text-sm">ME (50%–74%)</span>
                  <span className="px-2 py-0.5 bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-200 font-black rounded-full text-[10px] font-mono">
                    {metrics.rubricPercentages?.ME ?? 0}%
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-sky-700 dark:text-sky-400 mt-2">
                  {metrics.rubricDistribution?.ME ?? 0}
                </div>
                <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-1 font-medium">
                  Meeting Expectations
                </p>
              </div>

              <div className="p-4 bg-amber-50/70 dark:bg-[#20180a]/70 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-900 dark:text-amber-300 text-sm">AE (40%–49%)</span>
                  <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-black rounded-full text-[10px] font-mono">
                    {metrics.rubricPercentages?.AE ?? 0}%
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-amber-700 dark:text-amber-400 mt-2">
                  {metrics.rubricDistribution?.AE ?? 0}
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                  Approaching Expectations
                </p>
              </div>

              <div className="p-4 bg-rose-50/70 dark:bg-[#200c14]/70 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-black text-rose-900 dark:text-rose-300 text-sm">BE (&lt;40%)</span>
                  <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-black rounded-full text-[10px] font-mono">
                    {metrics.rubricPercentages?.BE ?? 0}%
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-rose-700 dark:text-rose-400 mt-2">
                  {metrics.rubricDistribution?.BE ?? 0}
                </div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                  Below Expectations (Remedial)
                </p>
              </div>
            </div>

            {/* 8-to-1 Points Breakdown if Junior Secondary */}
            {metrics.pointsDistribution && Object.values(metrics.pointsDistribution).some((v: any) => v > 0) && (
              <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] p-4 sm:p-5 rounded-2xl">
                <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 mb-3">
                  Junior Secondary 8-to-1 Points Scale Distribution
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {[8, 7, 6, 5, 4, 3, 2, 1].map((pt) => {
                    const count = metrics.pointsDistribution[pt] || 0;
                    return (
                      <div key={pt} className="p-3 bg-slate-50 dark:bg-[#0c1932] border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-500 block">Point {pt}</span>
                        <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLoadingWrapper>
  );
};
