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
  ChevronLeft,
  Star,
  Search,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Loader2,
  X,
  Quote,
  Copy,
  Check,
  Calculator,
  Globe,
  Palette,
  HeartHandshake,
  SlidersHorizontal,
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
  const [drawerSubjectFilter, setDrawerSubjectFilter] = useState<'ALL' | 'EE' | 'ME' | 'AE' | 'BE'>('ALL');
  const [drawerSortOrder, setDrawerSortOrder] = useState<'DEFAULT' | 'HIGHEST' | 'LOWEST'>('DEFAULT');
  const [copiedAssessment, setCopiedAssessment] = useState(false);

  const classStudents = analysis?.selectedClassDetail?.students || [];

  const currentStudentIndex = useMemo(() => {
    if (!selectedStudentForDrawer || classStudents.length === 0) return -1;
    return classStudents.findIndex((s: any) => s.studentId === selectedStudentForDrawer.studentId);
  }, [selectedStudentForDrawer, classStudents]);

  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      const prev = classStudents[currentStudentIndex - 1];
      setSelectedStudentForDrawer({
        ...prev,
        className: analysis.selectedClassDetail.className,
        isJunior: analysis.selectedClassDetail.isJunior,
      });
      setDrawerSubjectFilter('ALL');
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex >= 0 && currentStudentIndex < classStudents.length - 1) {
      const next = classStudents[currentStudentIndex + 1];
      setSelectedStudentForDrawer({
        ...next,
        className: analysis.selectedClassDetail.className,
        isJunior: analysis.selectedClassDetail.isJunior,
      });
      setDrawerSubjectFilter('ALL');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedStudentForDrawer) return;

      if (e.key === 'Escape') {
        setSelectedStudentForDrawer(null);
      } else if (e.key === 'ArrowLeft' && currentStudentIndex > 0) {
        handlePrevStudent();
      } else if (e.key === 'ArrowRight' && currentStudentIndex >= 0 && currentStudentIndex < classStudents.length - 1) {
        handleNextStudent();
      }
    };

    if (selectedStudentForDrawer) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedStudentForDrawer, currentStudentIndex, classStudents]);

  const currentClassMean = useMemo(() => {
    if (!classStudents || classStudents.length === 0) return 0;
    const sum = classStudents.reduce((acc: number, s: any) => acc + (Number(s.average) || 0), 0);
    return Math.round((sum / classStudents.length) * 10) / 10;
  }, [classStudents]);

  const varianceFromClassMean = useMemo(() => {
    if (!selectedStudentForDrawer) return 0;
    return Math.round(((Number(selectedStudentForDrawer.average) || 0) - currentClassMean) * 10) / 10;
  }, [selectedStudentForDrawer, currentClassMean]);

  const studentRubricCounts = useMemo(() => {
    if (!selectedStudentForDrawer?.subjects) return { EE: 0, ME: 0, AE: 0, BE: 0 };
    const counts = { EE: 0, ME: 0, AE: 0, BE: 0 };
    selectedStudentForDrawer.subjects.forEach((sub: any) => {
      const score = Number(sub.score) || 0;
      const maxMarks = Number(sub.maxMarks) || 100;
      const pct = (score / maxMarks) * 100;
      const rub = sub.rubric || (pct >= 75 ? 'EE' : pct >= 50 ? 'ME' : pct >= 40 ? 'AE' : 'BE');
      if (rub in counts) {
        counts[rub as keyof typeof counts]++;
      }
    });
    return counts;
  }, [selectedStudentForDrawer?.subjects]);

  const drawerFilteredSubjects = useMemo(() => {
    if (!selectedStudentForDrawer?.subjects) return [];
    let list = [...selectedStudentForDrawer.subjects];

    if (drawerSubjectFilter !== 'ALL') {
      list = list.filter((sub: any) => {
        const score = Number(sub.score) || 0;
        const maxMarks = Number(sub.maxMarks) || 100;
        const pct = (score / maxMarks) * 100;
        const rub = sub.rubric || (pct >= 75 ? 'EE' : pct >= 50 ? 'ME' : pct >= 40 ? 'AE' : 'BE');
        return rub === drawerSubjectFilter;
      });
    }

    if (drawerSortOrder === 'HIGHEST') {
      list.sort((a, b) => {
        const aPct = (Number(a.score) || 0) / (Number(a.maxMarks) || 100);
        const bPct = (Number(b.score) || 0) / (Number(b.maxMarks) || 100);
        return bPct - aPct;
      });
    } else if (drawerSortOrder === 'LOWEST') {
      list.sort((a, b) => {
        const aPct = (Number(a.score) || 0) / (Number(a.maxMarks) || 100);
        const bPct = (Number(b.score) || 0) / (Number(b.maxMarks) || 100);
        return aPct - bPct;
      });
    }

    return list;
  }, [selectedStudentForDrawer?.subjects, drawerSubjectFilter, drawerSortOrder]);

  const handleCopyAssessmentNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedAssessment(true);
    toast.success('Assessment number copied');
    setTimeout(() => setCopiedAssessment(false), 2000);
  };

  const handlePrintStudentSlip = () => {
    if (!selectedStudentForDrawer) return;
    printElement(
      'learner-performance-slip-printable',
      `Assessment Slip - ${selectedStudentForDrawer.studentName} (${selectedStudentForDrawer.className})`
    );
  };

  const getSubjectIconAndColor = (subjectName: string, subjectCode?: string) => {
    const name = subjectName.toLowerCase();
    const code = (subjectCode || '').toLowerCase();

    if (name.includes('math') || code.includes('math')) {
      return {
        icon: Calculator,
        bg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900',
      };
    }
    if (name.includes('lang') || name.includes('eng') || name.includes('kisw') || code.includes('lang') || code.includes('eng')) {
      return {
        icon: BookOpen,
        bg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900',
      };
    }
    if (name.includes('environ') || name.includes('science') || name.includes('agri') || code.includes('env') || code.includes('sci')) {
      return {
        icon: Globe,
        bg: 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900',
      };
    }
    if (name.includes('creative') || name.includes('psychomotor') || name.includes('art') || name.includes('music') || code.includes('creat')) {
      return {
        icon: Palette,
        bg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
      };
    }
    if (name.includes('relig') || name.includes('islamic') || name.includes('christian') || code.includes('ire') || code.includes('cre')) {
      return {
        icon: HeartHandshake,
        bg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
      };
    }

    return {
      icon: GraduationCap,
      bg: 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900',
    };
  };

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
            <div
              className="fixed inset-0 z-50 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="learner-drawer-name"
              aria-describedby="learner-drawer-desc"
            >
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedStudentForDrawer(null)}
                className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity cursor-pointer"
                aria-hidden="true"
              />

              <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="w-screen h-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl bg-slate-50 dark:bg-[#070e1e] border-l border-slate-200 dark:border-[#162b4d] shadow-2xl flex flex-col z-50 overflow-hidden"
                >
                  {/* Top Navigation & Sticky Header */}
                  <header className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#162b4d] bg-white/95 dark:bg-[#0a1428]/95 backdrop-blur-md shrink-0 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Learner Identity & Avatar */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Avatar with rank medal ring */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${
                              selectedStudentForDrawer.rank === 1
                                ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 ring-2 ring-amber-400/80 shadow-amber-500/20'
                                : selectedStudentForDrawer.rank === 2
                                ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-800 ring-2 ring-slate-300 shadow-slate-500/20'
                                : selectedStudentForDrawer.rank === 3
                                ? 'bg-gradient-to-tr from-amber-700 to-amber-600 text-white ring-2 ring-amber-600 shadow-amber-800/20'
                                : 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white ring-2 ring-sky-400/30'
                            }`}
                          >
                            {selectedStudentForDrawer.studentName?.slice(0, 2).toUpperCase() || 'LR'}
                          </div>
                          {selectedStudentForDrawer.rank <= 3 && (
                            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] flex items-center justify-center shadow-xs border border-white dark:border-[#0a1428]">
                              #{selectedStudentForDrawer.rank}
                            </span>
                          )}
                        </div>

                        <div className="truncate min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2
                              id="learner-drawer-name"
                              className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight truncate"
                            >
                              {selectedStudentForDrawer.studentName}
                            </h2>
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              {selectedStudentForDrawer.className}
                            </span>
                          </div>

                          <div id="learner-drawer-desc" className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                            {/* Copyable Assessment Number */}
                            <button
                              type="button"
                              onClick={() => handleCopyAssessmentNumber(selectedStudentForDrawer.assessmentNumber || selectedStudentForDrawer.admissionNumber || '')}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#122340] hover:bg-slate-200 dark:hover:bg-[#18315c] text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-[#1b345d]"
                              title="Click to copy Assessment Number"
                            >
                              <span>Assess: {selectedStudentForDrawer.assessmentNumber || selectedStudentForDrawer.admissionNumber || '—'}</span>
                              {copiedAssessment ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400" />
                              )}
                            </button>

                            <span>•</span>

                            {/* Standing Rubric Badge */}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                selectedStudentForDrawer.average >= 75
                                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                  : selectedStudentForDrawer.average >= 50
                                  ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700'
                                  : selectedStudentForDrawer.average >= 40
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                              }`}
                            >
                              {selectedStudentForDrawer.average >= 75
                                ? 'Level 4 · Exceeding Expectations'
                                : selectedStudentForDrawer.average >= 50
                                ? 'Level 3 · Meeting Expectations'
                                : selectedStudentForDrawer.average >= 40
                                ? 'Level 2 · Approaching Expectations'
                                : 'Level 1 · Below Expectations'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions: Student Navigator, Print Slip, and Close */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Student Next/Prev Navigator */}
                        {classStudents.length > 1 && (
                          <div className="flex items-center bg-slate-100 dark:bg-[#0f1d37] p-1 rounded-xl border border-slate-200 dark:border-[#162b4d]">
                            <button
                              type="button"
                              onClick={handlePrevStudent}
                              disabled={currentStudentIndex <= 0}
                              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#1a335a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              title="Previous Student in Class (ArrowLeft)"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="px-2 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {currentStudentIndex + 1} / {classStudents.length}
                            </span>
                            <button
                              type="button"
                              onClick={handleNextStudent}
                              disabled={currentStudentIndex >= classStudents.length - 1}
                              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#1a335a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              title="Next Student in Class (ArrowRight)"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Print Individual Learner Mark Slip */}
                        <button
                          type="button"
                          onClick={handlePrintStudentSlip}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0f1d37] hover:bg-slate-100 dark:hover:bg-[#1a335a] text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Print Official Learner Assessment Mark Slip"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Print Slip</span>
                        </button>

                        {/* Close Drawer Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForDrawer(null)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162b4d] transition-colors cursor-pointer inline-flex items-center gap-1"
                          title="Close Panel (Esc)"
                        >
                          <X className="w-5 h-5" />
                          <kbd className="hidden md:inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#132545] text-slate-500 dark:text-slate-400">
                            ESC
                          </kbd>
                        </button>
                      </div>
                    </div>

                    {/* Executive KPI Cockpit Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
                      {/* 1. Class Rank Card */}
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200/80 dark:border-[#162b4d] shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Standing</span>
                          <Award className={`w-4 h-4 ${
                            selectedStudentForDrawer.rank === 1
                              ? 'text-amber-500'
                              : selectedStudentForDrawer.rank === 2
                              ? 'text-slate-400'
                              : selectedStudentForDrawer.rank === 3
                              ? 'text-amber-700'
                              : 'text-sky-500'
                          }`} />
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                          #{selectedStudentForDrawer.rank}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          of {classStudents.length} learners enrolled
                        </p>
                      </div>

                      {/* 2. Mean Score & Class Comparison */}
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200/80 dark:border-[#162b4d] shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mean Average</span>
                          <TrendingUp className="w-4 h-4 text-sky-500" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
                          {selectedStudentForDrawer.average}%
                        </div>
                        <div className="text-[11px] font-semibold mt-0.5 flex items-center gap-1">
                          {varianceFromClassMean >= 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center">
                              <ArrowUpRight className="w-3 h-3" /> +{varianceFromClassMean}% vs Class Mean
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-bold inline-flex items-center">
                              <ArrowDownRight className="w-3 h-3" /> {varianceFromClassMean}% vs Class Mean
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3. Aggregate Total Marks */}
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200/80 dark:border-[#162b4d] shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aggregate Total</span>
                          <GraduationCap className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                          {selectedStudentForDrawer.totalMarks}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          across {selectedStudentForDrawer.subjects?.length ?? 0} learning areas
                        </p>
                      </div>

                      {/* 4. CBC Rubric Spectrum Filter Chips */}
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200/80 dark:border-[#162b4d] shadow-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Competency Spread</span>
                          <Sparkles className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setDrawerSubjectFilter(drawerSubjectFilter === 'EE' ? 'ALL' : 'EE')}
                            className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                              drawerSubjectFilter === 'EE'
                                ? 'ring-2 ring-emerald-500 bg-emerald-200 text-emerald-950 font-black'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            }`}
                            title="Filter Exceeding Expectations"
                          >
                            {studentRubricCounts.EE} EE
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrawerSubjectFilter(drawerSubjectFilter === 'ME' ? 'ALL' : 'ME')}
                            className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                              drawerSubjectFilter === 'ME'
                                ? 'ring-2 ring-sky-500 bg-sky-200 text-sky-950 font-black'
                                : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                            }`}
                            title="Filter Meeting Expectations"
                          >
                            {studentRubricCounts.ME} ME
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrawerSubjectFilter(drawerSubjectFilter === 'AE' ? 'ALL' : 'AE')}
                            className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                              drawerSubjectFilter === 'AE'
                                ? 'ring-2 ring-amber-500 bg-amber-200 text-amber-950 font-black'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                            title="Filter Approaching Expectations"
                          >
                            {studentRubricCounts.AE} AE
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrawerSubjectFilter(drawerSubjectFilter === 'BE' ? 'ALL' : 'BE')}
                            className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                              drawerSubjectFilter === 'BE'
                                ? 'ring-2 ring-rose-500 bg-rose-200 text-rose-950 font-black'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            }`}
                            title="Filter Below Expectations"
                          >
                            {studentRubricCounts.BE} BE
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {drawerSubjectFilter === 'ALL' ? 'Click chip to filter' : `Filtered: ${drawerSubjectFilter}`}
                        </p>
                      </div>
                    </div>
                  </header>

                  {/* Filter & Sort Bar */}
                  <div className="px-4 sm:px-6 py-2.5 bg-slate-100/90 dark:bg-[#091325]/90 border-b border-slate-200 dark:border-[#162b4d] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                    {/* Rubric Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setDrawerSubjectFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          drawerSubjectFilter === 'ALL'
                            ? 'bg-white dark:bg-[#142647] text-sky-600 dark:text-sky-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        All Learning Areas ({selectedStudentForDrawer.subjects?.length ?? 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerSubjectFilter('EE')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          drawerSubjectFilter === 'EE'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                        }`}
                      >
                        Exceeding ({studentRubricCounts.EE})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerSubjectFilter('ME')}
                        className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          drawerSubjectFilter === 'ME'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-sky-600'
                        }`}
                      >
                        Meeting ({studentRubricCounts.ME})
                      </button>
                      {(studentRubricCounts.AE > 0 || studentRubricCounts.BE > 0) && (
                        <button
                          type="button"
                          onClick={() => setDrawerSubjectFilter(studentRubricCounts.BE > 0 ? 'BE' : 'AE')}
                          className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                            drawerSubjectFilter === 'BE' || drawerSubjectFilter === 'AE'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                          }`}
                        >
                          Requires Support ({studentRubricCounts.AE + studentRubricCounts.BE})
                        </button>
                      )}
                    </div>

                    {/* Sort Order Selector */}
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={drawerSortOrder}
                        onChange={(e) => setDrawerSortOrder(e.target.value as any)}
                        className="bg-white dark:bg-[#0c1830] border border-slate-200 dark:border-[#162b4d] rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer shadow-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="DEFAULT">Curriculum Order</option>
                        <option value="HIGHEST">Highest Score First</option>
                        <option value="LOWEST">Lowest Score First</option>
                      </select>
                    </div>
                  </div>

                  {/* Body: Full Semantic <article> Subject Cards with Overscroll Containment */}
                  <main
                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-sky-200 dark:scrollbar-thumb-[#162b4d]"
                    style={{ overscrollBehavior: 'contain' }}
                  >
                    {drawerFilteredSubjects.length === 0 ? (
                      <div className="py-16 text-center text-slate-400 text-xs">
                        No learning areas found matching filter: <span className="font-bold">{drawerSubjectFilter}</span>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => setDrawerSubjectFilter('ALL')}
                            className="text-sky-600 hover:underline font-bold"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </div>
                    ) : (
                      drawerFilteredSubjects.map((sub: any, idx: number) => {
                        const score = Number(sub.score) || 0;
                        const maxMarks = Number(sub.maxMarks) || 100;
                        const percentage = Math.min(100, Math.round((score / maxMarks) * 100));

                        const isExceeding = percentage >= 75;
                        const isMeeting = percentage >= 50 && percentage < 75;
                        const isApproaching = percentage >= 40 && percentage < 50;

                        const categoryInfo = getSubjectIconAndColor(sub.subjectName, sub.subjectCode);
                        const SubjectIcon = categoryInfo.icon;

                        const rubricBadgeColor = isExceeding
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-emerald-500/10'
                          : isMeeting
                          ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700 shadow-sky-500/10'
                          : isApproaching
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-amber-500/10'
                          : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 shadow-rose-500/10';

                        const progressGradient = isExceeding
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : isMeeting
                          ? 'bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                          : isApproaching
                          ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                          : 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.3)]';

                        return (
                          <article
                            key={sub.subjectId || idx}
                            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1830] border border-slate-200/80 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-800 transition-all shadow-xs space-y-3.5"
                          >
                            {/* Card Header: Subject Info + Score & Rubric */}
                            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              {/* Subject Title & Category Icon */}
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${categoryInfo.bg}`}>
                                  <SubjectIcon className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                                      {sub.subjectName}
                                    </h3>
                                    {sub.subjectCode && (
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 dark:bg-[#122340] text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-[#1a335a]">
                                        {sub.subjectCode}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    {isExceeding
                                      ? 'Exceeding Expectations · Grade Distinction'
                                      : isMeeting
                                      ? 'Meeting Expectations · Proficient Mastery'
                                      : isApproaching
                                      ? 'Approaching Expectations · Needs Reinforcement'
                                      : 'Below Expectations · Remedial Support Required'}
                                  </p>
                                </div>
                              </div>

                              {/* Score & Rubric Pill */}
                              <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                                <div className="text-right">
                                  <div className="font-black font-mono text-base sm:text-lg text-slate-900 dark:text-slate-100">
                                    {score}
                                    <span className="text-xs text-slate-400 font-normal">/{maxMarks}</span>
                                  </div>
                                  <div className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                                    {percentage}%
                                  </div>
                                </div>

                                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border uppercase tracking-wider shadow-xs ${rubricBadgeColor}`}>
                                  {sub.rubric || (isExceeding ? 'EE' : isMeeting ? 'ME' : isApproaching ? 'AE' : 'BE')}
                                </span>

                                {sub.points != null && (
                                  <span className="px-2 py-1 rounded-xl text-xs font-mono font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                                    {sub.points} pts
                                  </span>
                                )}
                              </div>
                            </header>

                            {/* Dual-Track Visual Performance Gauge with CBC Benchmark Markers */}
                            <div className="space-y-1.5">
                              <div className="relative w-full bg-slate-100 dark:bg-[#070e1e] h-3 rounded-full overflow-hidden border border-slate-200/60 dark:border-[#162b4d]">
                                {/* Benchmark tick at 50% (ME Pass line) */}
                                <div
                                  className="absolute top-0 bottom-0 w-[1.5px] bg-sky-400/50 dark:bg-sky-500/40 z-10"
                                  style={{ left: '50%' }}
                                  title="50% National Competency Benchmark (ME)"
                                />
                                {/* Benchmark tick at 75% (EE Distinction line) */}
                                <div
                                  className="absolute top-0 bottom-0 w-[1.5px] bg-emerald-400/50 dark:bg-emerald-500/40 z-10"
                                  style={{ left: '75%' }}
                                  title="75% Distinction Benchmark (EE)"
                                />
                                {/* Animated Gradient Fill */}
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ease-out ${progressGradient}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>

                              {/* Gauge Scale Labels */}
                              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 px-0.5">
                                <span>0%</span>
                                <span className="text-sky-600 dark:text-sky-400 font-semibold">50% Pass</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">75% Distinction</span>
                                <span>100%</span>
                              </div>
                            </div>

                            {/* Teacher Observation & Remarks Speech Bubble */}
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070e1e] border border-slate-200/70 dark:border-[#162b4d] flex items-start gap-2.5">
                              <Quote className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                                  Teacher Observation & Competency Feedback
                                </span>
                                <p className="text-xs text-slate-700 dark:text-slate-200 italic font-medium leading-relaxed">
                                  "{sub.remarks || 'Consistently demonstrates proficiency across learning outcomes and core CBC competency indicators.'}"
                                </p>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </main>

                  {/* Drawer Footer Actions */}
                  <footer className="p-4 sm:p-5 border-t border-slate-200 dark:border-[#162b4d] bg-white/95 dark:bg-[#0a1428]/95 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
                      Keyboard shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#122340] border font-mono text-[10px]">←</kbd> Prev, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#122340] border font-mono text-[10px]">→</kbd> Next, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#122340] border font-mono text-[10px]">Esc</kbd> Close
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handlePrintStudentSlip}
                        className="px-4 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Assessment Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedStudentForDrawer(null)}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1830] text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#142647] cursor-pointer shadow-xs transition-colors"
                      >
                        Close Panel
                      </button>
                    </div>
                  </footer>
                </motion.div>
              </div>

              {/* Hidden Dedicated Printable Assessment Slip for this Learner */}
              <div id="learner-performance-slip-printable" className="hidden">
                <div style={{ fontFamily: 'sans-serif', padding: '24px', color: '#1e293b' }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #0284c7', paddingBottom: '16px', marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '900', margin: '0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Eldoret Muslim Academy
                    </h1>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 'bold' }}>
                      Directorate of Studies · Official Learner Competency & Assessment Slip
                    </p>
                    <p style={{ fontSize: '12px', color: '#0284c7', margin: '2px 0 0 0', fontWeight: 'bold' }}>
                      {analysis?.selectedExam?.title || 'Continuous Assessment Series'} · {analysis?.selectedExam?.termName || 'Term Evaluation'}
                    </p>
                  </div>

                  {/* Student Credentials Strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>Learner Name</span>
                      <strong style={{ fontSize: '14px' }}>{selectedStudentForDrawer.studentName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>Assessment Number</span>
                      <strong>{selectedStudentForDrawer.assessmentNumber || selectedStudentForDrawer.admissionNumber || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>Class & Stream</span>
                      <strong>{selectedStudentForDrawer.className}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>Class Rank</span>
                      <strong style={{ color: '#0284c7', fontSize: '14px' }}>#{selectedStudentForDrawer.rank} of {classStudents.length}</strong>
                    </div>
                  </div>

                  {/* Learning Areas Performance Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', border: '1px solid #0f172a' }}>Learning Area (Subject)</th>
                        <th style={{ padding: '8px 12px', border: '1px solid #0f172a', textAlign: 'center' }}>Subject Code</th>
                        <th style={{ padding: '8px 12px', border: '1px solid #0f172a', textAlign: 'center' }}>Score / Max</th>
                        <th style={{ padding: '8px 12px', border: '1px solid #0f172a', textAlign: 'center' }}>Percentage</th>
                        <th style={{ padding: '8px 12px', border: '1px solid #0f172a', textAlign: 'center' }}>CBC Rubric Level</th>
                        <th style={{ padding: '8px 12px', border: '1px solid #0f172a' }}>Teacher Remarks & Observation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStudentForDrawer.subjects?.map((sub: any, i: number) => {
                        const score = Number(sub.score) || 0;
                        const maxMarks = Number(sub.maxMarks) || 100;
                        const pct = Math.round((score / maxMarks) * 100);
                        const isExceeding = pct >= 75;
                        const isMeeting = pct >= 50 && pct < 75;
                        return (
                          <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{sub.subjectName}</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'center', fontFamily: 'monospace' }}>{sub.subjectCode || '—'}</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }}>{score} / {maxMarks}</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold', color: isExceeding ? '#047857' : isMeeting ? '#0369a1' : '#b91c1c' }}>{pct}%</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 'bold' }}>{sub.rubric || (isExceeding ? 'EE' : isMeeting ? 'ME' : 'AE')}</td>
                            <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', fontStyle: 'italic', color: '#475569' }}>{sub.remarks || 'Proficient progress observed.'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
                        <td colSpan={2} style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>OVERALL AGGREGATE TOTALS</td>
                        <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'center' }}>{selectedStudentForDrawer.totalMarks} Marks</td>
                        <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1', textAlign: 'center', color: '#0369a1', fontSize: '13px' }}>{selectedStudentForDrawer.average}% Mean</td>
                        <td colSpan={2} style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>Proficiency: {selectedStudentForDrawer.average >= 75 ? 'Level 4 · Exceeding Expectations' : selectedStudentForDrawer.average >= 50 ? 'Level 3 · Meeting Expectations' : 'Level 2 · Approaching'}</td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Sign-off & Stamp Section */}
                  <div style={{ marginTop: '36px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                    <div>
                      <div style={{ borderBottom: '1px solid #94a3b8', height: '36px', marginBottom: '6px' }} />
                      <strong>Class Teacher Signature</strong>
                    </div>
                    <div>
                      <div style={{ borderBottom: '1px solid #94a3b8', height: '36px', marginBottom: '6px' }} />
                      <strong>Director of Studies (DoS)</strong>
                    </div>
                    <div>
                      <div style={{ borderBottom: '1px solid #94a3b8', height: '36px', marginBottom: '6px' }} />
                      <strong>Official Stamp & Date</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageLoadingWrapper>
  );
};
