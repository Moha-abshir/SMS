import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  BookOpen,
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Printer,
  ChevronRight,
  Star,
  Search,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';
import { printElement } from '../../lib/printElement';

type TierFilter = 'ALL' | 'PP' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR';
type ActiveTab = 'CLASSES' | 'SUBJECTS' | 'HONOR_ROLL' | 'REMEDIAL' | 'DRILLDOWN';

export const SchoolResultsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('CLASSES');
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Exam analysis payload
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetailLoading, setClassDetailLoading] = useState(false);
  const [loadingClassId, setLoadingClassId] = useState<string | null>(null);
  const [selectedStudentForDrawer, setSelectedStudentForDrawer] = useState<any | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedStudentForDrawer(null);
      }
    };
    if (selectedStudentForDrawer) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedStudentForDrawer]);

  const fetchExamAnalysis = async (examId?: string, classId?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (examId && examId !== 'all') params.append('examId', examId);
      if (classId) params.append('classId', classId);

      const res = await apiClient.get(`/api/dos/exam-analysis?${params.toString()}`);
      const data = res.data.data;
      setAnalysis(data);

      if (data?.selectedExam && !selectedExamId) {
        setSelectedExamId(data.selectedExam.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load schoolwide results');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassDrilldown = async (classId: string) => {
    try {
      setLoadingClassId(classId);
      setClassDetailLoading(true);
      setSelectedClassId(classId);
      const examParam = selectedExamId && selectedExamId !== 'all' ? selectedExamId : undefined;
      const params = new URLSearchParams();
      if (examParam) params.append('examId', examParam);
      params.append('classId', classId);

      const res = await apiClient.get(`/api/dos/exam-analysis?${params.toString()}`);
      if (res.data?.data?.selectedClassDetail) {
        setAnalysis((prev: any) => ({
          ...prev,
          selectedClassDetail: res.data.data.selectedClassDetail,
        }));
        setActiveTab('DRILLDOWN');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load class drill-down marks');
    } finally {
      setClassDetailLoading(false);
      setLoadingClassId(null);
    }
  };

  useEffect(() => {
    fetchExamAnalysis();
  }, []);

  const handleExamChange = (newExamId: string) => {
    setSelectedExamId(newExamId);
    fetchExamAnalysis(newExamId, selectedClassId || undefined);
  };

  // Tier filtering for classes
  const filteredClasses = useMemo(() => {
    if (!analysis?.classes) return [];
    return analysis.classes.filter((c: any) => {
      const matchesSearch = c.className.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (tierFilter === 'ALL') return true;
      if (tierFilter === 'PP') return c.levelCategory === 'PP' || c.className.includes('PP') || c.className.toLowerCase().includes('playgroup');
      if (tierFilter === 'LOWER_PRIMARY') return c.levelCategory === 'LOWER_PRIMARY' || ['Grade 1', 'Grade 2', 'Grade 3'].some(g => c.className.includes(g));
      if (tierFilter === 'UPPER_PRIMARY') return c.levelCategory === 'UPPER_PRIMARY' || ['Grade 4', 'Grade 5', 'Grade 6'].some(g => c.className.includes(g));
      if (tierFilter === 'JUNIOR') return c.isJunior || c.levelCategory === 'JUNIOR' || ['Grade 7', 'Grade 8', 'Grade 9'].some(g => c.className.includes(g));
      return true;
    });
  }, [analysis?.classes, tierFilter, searchQuery]);

  // Tier filtering for subjects
  const filteredSubjects = useMemo(() => {
    if (!analysis?.subjects) return [];
    return analysis.subjects.filter((s: any) => {
      const matchesSearch = s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (tierFilter === 'ALL') return true;
      if (tierFilter === 'JUNIOR') return s.isJunior || s.levelCategory === 'JUNIOR';
      if (tierFilter === 'UPPER_PRIMARY' || tierFilter === 'LOWER_PRIMARY' || tierFilter === 'PP') return !s.isJunior;
      return true;
    });
  }, [analysis?.subjects, tierFilter, searchQuery]);

  // Filtered honor roll
  const filteredHonorRoll = useMemo(() => {
    if (!analysis?.honorRoll) return [];
    return analysis.honorRoll.filter((student: any) => {
      const matchesSearch = student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (student.assessmentNumber && student.assessmentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (student.admissionNumber && student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            student.className.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (tierFilter === 'ALL') return true;
      if (tierFilter === 'JUNIOR') return student.isJunior;
      if (tierFilter === 'UPPER_PRIMARY') return ['Grade 4', 'Grade 5', 'Grade 6'].some(g => student.className.includes(g));
      if (tierFilter === 'LOWER_PRIMARY') return ['Grade 1', 'Grade 2', 'Grade 3'].some(g => student.className.includes(g));
      return true;
    });
  }, [analysis?.honorRoll, tierFilter, searchQuery]);

  // Filtered remedial watchlist
  const filteredRemedial = useMemo(() => {
    if (!analysis?.remedialWatchlist) return [];
    return analysis.remedialWatchlist.filter((student: any) => {
      const matchesSearch = student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (student.assessmentNumber && student.assessmentNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (student.admissionNumber && student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            student.className.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (tierFilter === 'ALL') return true;
      if (tierFilter === 'JUNIOR') return ['Grade 7', 'Grade 8', 'Grade 9'].some(g => student.className.includes(g));
      if (tierFilter === 'UPPER_PRIMARY') return ['Grade 4', 'Grade 5', 'Grade 6'].some(g => student.className.includes(g));
      return true;
    });
  }, [analysis?.remedialWatchlist, tierFilter, searchQuery]);

  // CSV Master Broadsheet Export
  const handleExportBroadsheetCSV = () => {
    if (!analysis?.honorRoll || analysis.honorRoll.length === 0) {
      toast.warning('No assessment data available to export');
      return;
    }

    const headers = ['Rank', 'Assessment Number', 'Student Name', 'Class', 'Subjects Assessed', 'Average Score (%)', 'Proficiency Level', 'Top Learning Area'];
    const rows = analysis.honorRoll.map((s: any) => [
      s.rank,
      `"${s.assessmentNumber || s.admissionNumber || '—'}"`,
      `"${s.studentName}"`,
      `"${s.className}"`,
      s.subjectsCount,
      s.averageScore,
      s.proficiencyLevel,
      `"${s.topSubject || '—'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Schoolwide_Broadsheet_${analysis.selectedExam?.title?.replace(/\s+/g, '_') || 'Term'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Master broadsheet downloaded successfully');
  };

  // CSV Remedial Watchlist Export
  const handleExportRemedialCSV = () => {
    if (!analysis?.remedialWatchlist || analysis.remedialWatchlist.length === 0) {
      toast.warning('No learners currently on remedial watchlist');
      return;
    }

    const headers = ['Assessment Number', 'Student Name', 'Class', 'Class Teacher', 'Failing Subjects Count', 'Critical Subjects', 'Overall Average (%)', 'Risk Level'];
    const rows = analysis.remedialWatchlist.map((s: any) => [
      `"${s.assessmentNumber || s.admissionNumber || '—'}"`,
      `"${s.studentName}"`,
      `"${s.className}"`,
      `"${s.classTeacher}"`,
      s.failingCount,
      `"${s.failingSubjects.map((sub: any) => `${sub.subjectName} (${sub.marksObtained}%)`).join('; ')}"`,
      s.overallAverage,
      s.riskLevel,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Remedial_Intervention_Registry_${analysis.selectedExam?.title?.replace(/\s+/g, '_') || 'Term'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Remedial registry exported');
  };

  // Print Executive Summary
  const handlePrintSummary = () => {
    printElement('school-results-printable-area', `Schoolwide Academic Performance - ${analysis?.selectedExam?.title || 'Eldoret Muslim Academy'}`);
  };

  const overview = analysis?.schoolOverview || {};

  return (
    <PageLoadingWrapper isLoading={loading} subtitle="Compiling schoolwide results & league tables...">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Printable Container wrapper with id */}
        <div id="school-results-printable-area" className="space-y-6">
          {/* 1. Global Context & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] p-4 sm:p-5 rounded-2xl shadow-glass dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    Schoolwide Results & Broadsheet Center
                  </h1>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Executive academic intelligence, class rankings, subject league tables, and CBC performance analytics
                </p>
              </div>
            </div>

            {/* Scope Switcher & Action CTAs */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Exam Selector */}
              {analysis?.examsList && analysis.examsList.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedExamId}
                    onChange={(e) => handleExamChange(e.target.value)}
                    className="px-3.5 py-2 pr-9 bg-slate-50 dark:bg-[#0c1932] border border-slate-200 dark:border-[#162b4d] rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-xs appearance-none"
                  >
                    <option value="all">Cumulative (All Recorded Exams)</option>
                    {analysis.examsList.map((exam: any) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title} ({exam.termName})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Master Broadsheet Download */}
              <button
                type="button"
                onClick={handleExportBroadsheetCSV}
                className="px-3.5 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Export Master Broadsheet to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Broadsheet</span>
              </button>

              {/* Print Executive Summary */}
              <button
                type="button"
                onClick={handlePrintSummary}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1932] hover:bg-slate-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Print Executive Summary Report"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Summary</span>
              </button>
            </div>
          </div>

          {/* 2. Top-Level Executive KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {/* 1. School Mean Score */}
            <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">School Mean</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {overview.schoolAverage > 0 ? `${overview.schoolAverage}%` : '—'}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                {overview.schoolAverage >= 75 ? 'Level 4 · Exceeding' : overview.schoolAverage >= 50 ? 'Level 3 · Meeting' : 'Level 2 · Approaching'}
              </p>
            </div>

            {/* 2. Assessment Candidacy */}
            <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Candidacy Sat</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-[#0c1932] border border-sky-100 dark:border-[#162b4d] text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 font-mono">
                {overview.candidacyRate ?? 100}%
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                {overview.totalLearnersTested ?? 0} of {overview.totalEnrolled ?? 0} Sat ({overview.absentCount ?? 0} absent)
              </p>
            </div>

            {/* 3. CBC Proficiency Benchmark (EE + ME) */}
            <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Proficiency Pass</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {overview.proficiencyBenchmark ?? 0}%
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                {(overview.rubricDistribution?.EE ?? 0) + (overview.rubricDistribution?.ME ?? 0)} Scores EE / ME
              </p>
            </div>

            {/* 4. Top Performing Stream */}
            <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Top Stream</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate">
                {overview.topStream?.name || '—'}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold font-mono mt-1">
                {overview.topStream ? `${overview.topStream.average}% Class Mean` : 'No data'}
              </p>
            </div>

            {/* 5. Leading Department / Learning Area */}
            <div className="p-4 sm:p-5 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none hover:border-sky-200 dark:hover:border-sky-800 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Top Department</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate">
                {overview.topSubject?.name || '—'}
              </div>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold font-mono mt-1">
                {overview.topSubject ? `${overview.topSubject.average}% Mean` : 'No data'}
              </p>
            </div>
          </div>

          {/* CBC 4-Level Performance Pyramid Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-emerald-50/70 dark:bg-[#081a1a]/70 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm">EE (75%–100%)</span>
                <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-black rounded-full text-[10px] font-mono">
                  {overview.rubricPercentages?.EE ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                {overview.rubricDistribution?.EE ?? 0} Scores · Exceeding Expectations
              </p>
            </div>

            <div className="p-3.5 bg-sky-50/70 dark:bg-[#0c1c2e]/70 border border-sky-200 dark:border-sky-900/50 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-sky-900 dark:text-sky-300 text-xs sm:text-sm">ME (50%–74%)</span>
                <span className="px-2 py-0.5 bg-sky-200 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-black rounded-full text-[10px] font-mono">
                  {overview.rubricPercentages?.ME ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold mt-1">
                {overview.rubricDistribution?.ME ?? 0} Scores · Meeting Expectations
              </p>
            </div>

            <div className="p-3.5 bg-amber-50/70 dark:bg-[#1f1908]/70 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-900 dark:text-amber-300 text-xs sm:text-sm">AE (40%–49%)</span>
                <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-black rounded-full text-[10px] font-mono">
                  {overview.rubricPercentages?.AE ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                {overview.rubricDistribution?.AE ?? 0} Scores · Approaching Expectations
              </p>
            </div>

            <div className="p-3.5 bg-rose-50/70 dark:bg-[#1f0d11]/70 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-rose-900 dark:text-rose-300 text-xs sm:text-sm">BE (&lt;40%)</span>
                <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-black rounded-full text-[10px] font-mono">
                  {overview.rubricPercentages?.BE ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold mt-1">
                {overview.rubricDistribution?.BE ?? 0} Scores · Below Expectations (Remedial)
              </p>
            </div>
          </div>

          {/* 3. Deep-Dive View Tabs & Filter Bar */}
          <div className="space-y-3.5">
            {/* Row 1: Main Navigation Tabs with Horizontal Scrollability */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-sky-200 dark:scrollbar-thumb-[#162b4d]">
              <button
                type="button"
                onClick={() => setActiveTab('CLASSES')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                  activeTab === 'CLASSES'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#142647] border border-slate-200 dark:border-[#162b4d]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Class League Table ({filteredClasses.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SUBJECTS')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                  activeTab === 'SUBJECTS'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#142647] border border-slate-200 dark:border-[#162b4d]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Subject Department Matrix ({filteredSubjects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('HONOR_ROLL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                  activeTab === 'HONOR_ROLL'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#142647] border border-slate-200 dark:border-[#162b4d]'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Top Achievers Honor Roll ({filteredHonorRoll.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('REMEDIAL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                  activeTab === 'REMEDIAL'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#142647] border border-slate-200 dark:border-[#162b4d]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Remedial Watchlist ({filteredRemedial.length})</span>
              </button>

              {analysis?.selectedClassDetail && (
                <button
                  type="button"
                  onClick={() => setActiveTab('DRILLDOWN')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                    activeTab === 'DRILLDOWN'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#142647] border border-slate-200 dark:border-[#162b4d]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Class Marksheet: {analysis.selectedClassDetail.className}</span>
                </button>
              )}
            </div>

            {/* Row 2: Search Input & Grade Tier Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#162b4d] pb-3.5">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search learners, classes, or subjects..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0c1932] border border-slate-200 dark:border-[#162b4d] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                />
              </div>

              <div className="flex items-center overflow-x-auto bg-slate-100 dark:bg-[#0c1932] p-1 rounded-xl border border-slate-200 dark:border-[#162b4d] text-[11px] font-bold shrink-0">
                {(['ALL', 'PP', 'LOWER_PRIMARY', 'UPPER_PRIMARY', 'JUNIOR'] as TierFilter[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      tierFilter === tier
                        ? 'bg-white dark:bg-[#142647] text-sky-600 dark:text-sky-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tier === 'ALL' ? 'All Classes' : tier === 'PP' ? 'Pre-Primary' : tier === 'LOWER_PRIMARY' ? 'Lower (G1-3)' : tier === 'UPPER_PRIMARY' ? 'Upper (G4-6)' : 'Junior (G7-9)'}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT PANELS */}
            {/* 1. CLASS LEAGUE TABLE */}
            {activeTab === 'CLASSES' && (
              <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl border border-sky-100 dark:border-[#162b4d] overflow-hidden shadow-glass dark:shadow-none">
                <div className="p-4 border-b border-sky-50 dark:border-[#162b4d] flex items-center justify-between bg-sky-50/40 dark:bg-[#0c1932]/40">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Cross-Class Comparative League Table
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ranks all streams by class mean score with CBC performance distributions
                    </p>
                  </div>
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-100/70 dark:bg-sky-950/70 px-2.5 py-1 rounded-xl">
                    {filteredClasses.length} Streams Evaluated
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-sky-200 dark:scrollbar-thumb-[#162b4d] pb-2">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="bg-slate-50 dark:bg-[#0c1932] border-b border-slate-100 dark:border-[#162b4d] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                      <tr>
                        <th className="py-3 px-4 text-center">Rank</th>
                        <th className="py-3 px-4">Class & Stream</th>
                        <th className="py-3 px-4">Class Teacher</th>
                        <th className="py-3 px-4 text-center">Candidacy</th>
                        <th className="py-3 px-4 text-center">Class Mean</th>
                        <th className="py-3 px-4">CBC Spread (EE / ME / AE / BE)</th>
                        <th className="py-3 px-4">Top Learner in Class</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d] font-medium text-slate-700 dark:text-slate-300">
                      {filteredClasses.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No class performance records match your filter
                          </td>
                        </tr>
                      ) : (
                        filteredClasses.map((cls: any) => (
                          <tr key={cls.classId} className="hover:bg-sky-50/30 dark:hover:bg-[#0c1932]/60 transition-colors">
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                                cls.rank === 1
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                  : cls.rank === 2
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                                  : cls.rank === 3
                                  ? 'bg-amber-700/10 text-amber-900 dark:text-amber-400 border border-amber-600/30'
                                  : 'text-slate-500'
                              }`}>
                                {cls.rank}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-black text-slate-900 dark:text-slate-100">{cls.className}</div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                {cls.isJunior ? 'Junior Secondary' : 'Primary'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-slate-700 dark:text-slate-300 font-semibold">{cls.classTeacher}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{cls.testedCount}</span>
                              <span className="text-slate-400">/{cls.enrolledCount}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="text-sm font-black font-mono text-sky-700 dark:text-sky-300">
                                {cls.classAverage > 0 ? `${cls.classAverage}%` : '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold" title="EE count">
                                  {cls.rubric?.EE ?? 0} EE
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold" title="ME count">
                                  {cls.rubric?.ME ?? 0} ME
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold" title="AE count">
                                  {cls.rubric?.AE ?? 0} AE
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold" title="BE count">
                                  {cls.rubric?.BE ?? 0} BE
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              {cls.topStudent ? (
                                <div className="text-xs">
                                  <span className="font-bold text-slate-900 dark:text-slate-100">{cls.topStudent.name}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold ml-1.5">
                                    {cls.topStudent.average}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => fetchClassDrilldown(cls.classId)}
                                disabled={Boolean(loadingClassId)}
                                className={`px-2.5 py-1.5 rounded-lg border font-bold text-[11px] inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                  loadingClassId === cls.classId
                                    ? 'border-sky-300 dark:border-sky-700 bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 cursor-wait'
                                    : loadingClassId
                                    ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-[#162b4d] bg-slate-100 dark:bg-[#0c1932] text-slate-400'
                                    : 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300'
                                }`}
                              >
                                {loadingClassId === cls.classId ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400" />
                                    <span>Fetching...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Marksheet</span>
                                    <ChevronRight className="w-3 h-3 text-sky-500" />
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. SUBJECT DEPARTMENT MATRIX */}
            {activeTab === 'SUBJECTS' && (
              <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl border border-sky-100 dark:border-[#162b4d] overflow-hidden shadow-glass dark:shadow-none">
                <div className="p-4 border-b border-sky-50 dark:border-[#162b4d] flex items-center justify-between bg-sky-50/40 dark:bg-[#0c1932]/40">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Subject Department Performance Matrix
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Evaluates learning area averages, performance variance vs school target (70%), and CBC spread
                    </p>
                  </div>
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-100/70 dark:bg-sky-950/70 px-2.5 py-1 rounded-xl">
                    {filteredSubjects.length} Learning Areas
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-sky-200 dark:scrollbar-thumb-[#162b4d] pb-2">
                  <table className="w-full text-left text-xs min-w-[980px]">
                    <thead className="bg-slate-50 dark:bg-[#0c1932] border-b border-slate-100 dark:border-[#162b4d] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                      <tr>
                        <th className="py-3 px-4">Subject Code & Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Assessed</th>
                        <th className="py-3 px-4 text-center">Mean Score</th>
                        <th className="py-3 px-4 text-center">Target (70%)</th>
                        <th className="py-3 px-4 text-center">Highest / Lowest</th>
                        <th className="py-3 px-4">CBC Rubric Breakdown</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d] font-medium text-slate-700 dark:text-slate-300">
                      {filteredSubjects.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No subject data matches your filter
                          </td>
                        </tr>
                      ) : (
                        filteredSubjects.map((sub: any) => (
                          <tr key={sub.subjectId} className="hover:bg-sky-50/30 dark:hover:bg-[#0c1932]/60 transition-colors">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{sub.subjectName}</span>
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                                {sub.subjectCode}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                                {sub.isJunior ? 'Junior Secondary' : 'Primary'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold whitespace-nowrap">
                              {sub.testedCount}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="text-sm font-black font-mono text-sky-700 dark:text-sky-300">
                                {sub.averageScore > 0 ? `${sub.averageScore}%` : '—'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-xs whitespace-nowrap">
                              {sub.variance >= 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{sub.variance}% ▲</span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">{sub.variance}% ▼</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-xs whitespace-nowrap">
                              <span className="text-emerald-600 font-bold">{sub.highestScore}%</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-rose-600 font-bold">{sub.lowestScore}%</span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                                  {sub.rubric?.EE ?? 0} EE
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold">
                                  {sub.rubric?.ME ?? 0} ME
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                                  {sub.rubric?.AE ?? 0} AE
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold">
                                  {sub.rubric?.BE ?? 0} BE
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                sub.status === 'DISTINCTION'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                  : sub.status === 'ON_TRACK'
                                  ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                              }`}>
                                {sub.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. TOP ACHIEVERS HONOR ROLL (MERIT LIST) */}
            {activeTab === 'HONOR_ROLL' && (
              <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl border border-sky-100 dark:border-[#162b4d] overflow-hidden shadow-glass dark:shadow-none">
                <div className="p-4 border-b border-sky-50 dark:border-[#162b4d] flex items-center justify-between bg-amber-50/40 dark:bg-[#1a1506]/40">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      Schoolwide Academic Merit List (Top 25)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Top ranking learners across all classes evaluated in this exam series
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportBroadsheetCSV}
                    className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Merit List</span>
                  </button>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-sky-200 dark:scrollbar-thumb-[#162b4d] pb-2">
                  <table className="w-full text-left text-xs min-w-[850px]">
                    <thead className="bg-slate-50 dark:bg-[#0c1932] border-b border-slate-100 dark:border-[#162b4d] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                      <tr>
                        <th className="py-3 px-4 text-center">Rank</th>
                        <th className="py-3 px-4">Learner Name</th>
                        <th className="py-3 px-4">Assessment No</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4 text-center">Subjects</th>
                        <th className="py-3 px-4">Top Subject</th>
                        <th className="py-3 px-4 text-center">Mean Score</th>
                        <th className="py-3 px-4 text-center">Proficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d] font-medium text-slate-700 dark:text-slate-300">
                      {filteredHonorRoll.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No learner scores recorded for this exam
                          </td>
                        </tr>
                      ) : (
                        filteredHonorRoll.map((student: any) => (
                          <tr key={student.studentId} className="hover:bg-amber-50/20 dark:hover:bg-[#142647]/50 transition-colors">
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                                student.rank === 1
                                  ? 'bg-amber-400 text-amber-950 shadow-sm'
                                  : student.rank === 2
                                  ? 'bg-slate-300 text-slate-900 shadow-sm'
                                  : student.rank === 3
                                  ? 'bg-amber-700 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}>
                                {student.rank}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-black text-slate-900 dark:text-slate-100">{student.studentName}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                              {student.assessmentNumber || student.admissionNumber || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {student.className}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono">
                              {student.subjectsCount}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{student.topSubject || '—'}</span>
                              {student.topScore > 0 && (
                                <span className="ml-1 text-[11px] font-mono font-bold text-emerald-600">({student.topScore}%)</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300">
                                {student.averageScore}%
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                {student.proficiencyLevel}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. ACADEMIC INTERVENTION & REMEDIAL WATCHLIST */}
            {activeTab === 'REMEDIAL' && (
              <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl border border-sky-100 dark:border-[#162b4d] overflow-hidden shadow-glass dark:shadow-none">
                <div className="p-4 border-b border-sky-50 dark:border-[#162b4d] flex items-center justify-between bg-rose-50/40 dark:bg-[#1a080c]/40">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      Academic Intervention & Remedial Watchlist
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Learners scoring Below Expectations (&lt;50%) in one or more subjects requiring teacher support
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportRemedialCSV}
                    className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Remedial Registry</span>
                  </button>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-sky-200 dark:scrollbar-thumb-[#162b4d] pb-2">
                  <table className="w-full text-left text-xs min-w-[980px]">
                    <thead className="bg-slate-50 dark:bg-[#0c1932] border-b border-slate-100 dark:border-[#162b4d] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                      <tr>
                        <th className="py-3 px-4">Learner Name</th>
                        <th className="py-3 px-4">Assessment No</th>
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4">Class Teacher</th>
                        <th className="py-3 px-4 text-center">Failing Subjects</th>
                        <th className="py-3 px-4">Critical Learning Areas</th>
                        <th className="py-3 px-4 text-center">Overall Mean</th>
                        <th className="py-3 px-4 text-center">Risk Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d] font-medium text-slate-700 dark:text-slate-300">
                      {filteredRemedial.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            Outstanding performance! No learners currently flagged for remedial intervention.
                          </td>
                        </tr>
                      ) : (
                        filteredRemedial.map((student: any) => (
                          <tr key={student.studentId} className="hover:bg-rose-50/20 dark:hover:bg-[#142647]/50 transition-colors">
                            <td className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100">
                              {student.studentName}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                              {student.assessmentNumber || student.admissionNumber || '—'}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {student.className}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                              {student.classTeacher}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-600">
                              {student.failingCount}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex flex-wrap gap-1">
                                {student.failingSubjects.map((sub: any, i: number) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold">
                                    {sub.subjectName} ({sub.marksObtained}%)
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                              {student.overallAverage}%
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                student.riskLevel === 'HIGH'
                                  ? 'bg-rose-600 text-white'
                                  : student.riskLevel === 'MEDIUM'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              }`}>
                                {student.riskLevel}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. CLASS MARKSHEET DRILL-DOWN */}
            {activeTab === 'DRILLDOWN' && analysis?.selectedClassDetail && (
              <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md rounded-2xl border border-sky-100 dark:border-[#162b4d] overflow-hidden shadow-glass dark:shadow-none">
                <div className="p-4 border-b border-sky-50 dark:border-[#162b4d] flex items-center justify-between bg-indigo-50/40 dark:bg-[#0c1228]/40">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      Class Broadsheet: {analysis.selectedClassDetail.className}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Individual learner marksheet and subject scores breakdown · Click "View Subjects" or any row to open performance slide-tab
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('CLASSES')}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1932] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#142647] cursor-pointer"
                  >
                    Back to League Table
                  </button>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-sky-200 dark:scrollbar-thumb-[#162b4d] pb-2">
                  <table className="w-full text-left text-xs min-w-[850px]">
                    <thead className="bg-slate-50 dark:bg-[#0c1932] border-b border-slate-100 dark:border-[#162b4d] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                      <tr>
                        <th className="py-3 px-4 text-center">Rank</th>
                        <th className="py-3 px-4">Learner Name</th>
                        <th className="py-3 px-4">Assessment No</th>
                        <th className="py-3 px-4">Subject Performance</th>
                        <th className="py-3 px-4 text-center">Total Marks</th>
                        <th className="py-3 px-4 text-center">Average (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d] font-medium text-slate-700 dark:text-slate-300">
                      {analysis.selectedClassDetail.students?.map((student: any) => (
                        <tr
                          key={student.studentId}
                          onClick={() => setSelectedStudentForDrawer({
                            ...student,
                            className: analysis.selectedClassDetail.className,
                            isJunior: analysis.selectedClassDetail.isJunior,
                          })}
                          className="hover:bg-indigo-50/30 dark:hover:bg-[#142647]/50 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 text-center font-bold font-mono">
                            #{student.rank}
                          </td>
                          <td className="py-3.5 px-4 font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {student.studentName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                            {student.assessmentNumber || student.admissionNumber || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentForDrawer({
                                  ...student,
                                  className: analysis.selectedClassDetail.className,
                                  isJunior: analysis.selectedClassDetail.isJunior,
                                });
                              }}
                              className="px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer group/btn"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-sky-500 group-hover/btn:scale-110 transition-transform" />
                              <span>View {student.subjects?.length ?? 0} Subjects</span>
                              <ChevronRight className="w-3 h-3 text-sky-400 group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                            {student.totalMarks}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-black text-sky-700 dark:text-sky-300">
                            {student.average}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* In-Page Slide-Tab Drawer for Individual Learner Subject Performance */}
        <AnimatePresence>
          {selectedStudentForDrawer && (
            <div className="fixed inset-0 z-50 overflow-hidden">
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedStudentForDrawer(null)}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity cursor-pointer"
              />

              <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                  className="w-screen h-full sm:max-w-xl md:max-w-2xl bg-white dark:bg-[#0c1830] border-l border-sky-100 dark:border-[#1a335a] shadow-2xl flex flex-col z-50"
                >
                  {/* Top Header & Sticky Student Overview */}
                  <div className="p-4 sm:p-5 border-b border-sky-100 dark:border-[#1a335a] bg-white/95 dark:bg-[#0c1830]/95 backdrop-blur-md shrink-0 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                          {selectedStudentForDrawer.studentName?.[0] || 'L'}
                        </div>
                        <div className="truncate min-w-0">
                          <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                            {selectedStudentForDrawer.studentName}
                          </h2>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-sky-600 dark:text-sky-400">
                              {selectedStudentForDrawer.className}
                            </span>
                            <span>•</span>
                            <span className="font-mono">
                              Assessment No: {selectedStudentForDrawer.assessmentNumber || selectedStudentForDrawer.admissionNumber || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedStudentForDrawer(null)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#142647] transition-colors cursor-pointer"
                        title="Close Slide Drawer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Quick KPI Strip in Drawer */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#081226] border border-slate-100 dark:border-[#162b4d] text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class Rank</span>
                        <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                          #{selectedStudentForDrawer.rank}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#081226] border border-slate-100 dark:border-[#162b4d] text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mean Score</span>
                        <span className="text-sm font-black font-mono text-sky-600 dark:text-sky-400">
                          {selectedStudentForDrawer.average}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#081226] border border-slate-100 dark:border-[#162b4d] text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Marks</span>
                        <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                          {selectedStudentForDrawer.totalMarks}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#081226] border border-slate-100 dark:border-[#162b4d] text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subjects</span>
                        <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                          {selectedStudentForDrawer.subjects?.length ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body: Full Unabbreviated Learning Areas List */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 scrollbar-thin scrollbar-thumb-sky-200 dark:scrollbar-thumb-[#162b4d]">
                    <div className="flex items-center justify-between pb-1">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Learning Area Performance Breakdown
                      </h4>
                      <span className="text-[11px] font-bold text-slate-400">
                        {selectedStudentForDrawer.subjects?.length ?? 0} Evaluated Subjects
                      </span>
                    </div>

                    {(!selectedStudentForDrawer.subjects || selectedStudentForDrawer.subjects.length === 0) ? (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        No individual subject scores recorded for this learner in this exam.
                      </div>
                    ) : (
                      selectedStudentForDrawer.subjects.map((sub: any, idx: number) => {
                        const score = Number(sub.score) || 0;
                        const maxMarks = Number(sub.maxMarks) || 100;
                        const percentage = Math.min(100, Math.round((score / maxMarks) * 100));

                        const isExceeding = percentage >= 75;
                        const isMeeting = percentage >= 50 && percentage < 75;
                        const isApproaching = percentage >= 40 && percentage < 50;

                        const rubricBadgeColor = isExceeding
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          : isMeeting
                          ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700'
                          : isApproaching
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';

                        const progressColor = isExceeding
                          ? 'bg-emerald-500'
                          : isMeeting
                          ? 'bg-sky-500'
                          : isApproaching
                          ? 'bg-amber-500'
                          : 'bg-rose-500';

                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-[#091326]/70 border border-slate-200/80 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-800 transition-all shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                                    {sub.subjectName}
                                  </span>
                                  {sub.subjectCode && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-[#142647] text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-[#1b345d]">
                                      {sub.subjectCode}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-black font-mono text-sm sm:text-base text-slate-900 dark:text-slate-100">
                                  {score}
                                  <span className="text-xs text-slate-400 font-normal">/{maxMarks}</span>
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${rubricBadgeColor}`}>
                                  {sub.rubric || (isExceeding ? 'EE' : isMeeting ? 'ME' : isApproaching ? 'AE' : 'BE')}
                                </span>
                                {sub.points != null && (
                                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    {sub.points} pts
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Score Progress Bar */}
                            <div className="mt-2.5">
                              <div className="w-full bg-slate-200 dark:bg-[#162b4d] h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>

                            {/* Remarks or Rubric description */}
                            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>
                                {isExceeding
                                  ? 'Level 4 · Exceeding Expectations'
                                  : isMeeting
                                  ? 'Level 3 · Meeting Expectations'
                                  : isApproaching
                                  ? 'Level 2 · Approaching Expectations'
                                  : 'Level 1 · Below Expectations (Remedial Required)'}
                              </span>
                              {sub.remarks ? (
                                <span className="italic text-slate-600 dark:text-slate-300 font-medium">"{sub.remarks}"</span>
                              ) : (
                                <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{percentage}%</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Drawer Bottom Close Action */}
                  <div className="p-4 border-t border-sky-100 dark:border-[#1a335a] bg-white/95 dark:bg-[#0c1830]/95 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentForDrawer(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1932] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#142647] cursor-pointer"
                    >
                      Close Slide Tab
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageLoadingWrapper>
  );
};
