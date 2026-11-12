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
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('DRILLDOWN');
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
      setAccessDeniedMessage(null);
      const params = new URLSearchParams();
      if (examId && examId !== 'all') params.append('examId', examId);
      if (classId) params.append('classId', classId);

      const res = await apiClient.get(`/api/dos/exam-analysis?${params.toString()}`);
      const data = res.data.data;
      setAnalysis(data);

      if (data?.selectedExam && !selectedExamId) {
        setSelectedExamId(data.selectedExam.id);
      }
      if (data?.selectedClassDetail) {
        if (!selectedClassId) {
          setSelectedClassId(data.selectedClassDetail.classId);
        }
      }

      // Default active tab based on role:
      // If Class Teacher (non-leadership), always default to Class Broadsheet (DRILLDOWN)
      if (data?.userScope && !data.userScope.isLeadership) {
        setActiveTab('DRILLDOWN');
      } else if (data?.userScope?.isLeadership && !classId) {
        setActiveTab('CLASSES');
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setAccessDeniedMessage(
          error.response?.data?.message ||
            'Access denied: You do not have an active class assignment.'
        );
      } else {
        toast.error(error.response?.data?.message || 'Failed to load results');
      }
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
      if (res.data?.data) {
        setAnalysis(res.data.data);
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

  // Tier filtering for classes (leadership only)
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

  // Subject filtering
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

  // Filtered class drilldown students
  const filteredClassStudents = useMemo(() => {
    if (!analysis?.selectedClassDetail?.students) return [];
    if (!searchQuery.trim()) return analysis.selectedClassDetail.students;
    const q = searchQuery.toLowerCase();
    return analysis.selectedClassDetail.students.filter(
      (s: any) =>
        s.studentName.toLowerCase().includes(q) ||
        (s.assessmentNumber && s.assessmentNumber.toLowerCase().includes(q)) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q))
    );
  }, [analysis?.selectedClassDetail?.students, searchQuery]);

  // Extract unique subjects for multi-subject broadsheet table
  const broadsheetSubjects = useMemo(() => {
    if (!analysis?.selectedClassDetail?.students) return [];
    const map = new Map<string, { id: string; name: string; code: string }>();
    analysis.selectedClassDetail.students.forEach((s: any) => {
      s.subjects?.forEach((sub: any) => {
        if (!map.has(sub.subjectId)) {
          map.set(sub.subjectId, {
            id: sub.subjectId,
            name: sub.subjectName,
            code: sub.subjectCode || sub.subjectName.slice(0, 4).toUpperCase(),
          });
        }
      });
    });
    return Array.from(map.values());
  }, [analysis?.selectedClassDetail?.students]);

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
    link.setAttribute('download', `Broadsheet_${analysis.selectedExam?.title?.replace(/\s+/g, '_') || 'Term'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Broadsheet downloaded successfully');
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
    link.setAttribute('download', `Remedial_Registry_${analysis.selectedExam?.title?.replace(/\s+/g, '_') || 'Term'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Remedial registry exported');
  };

  // Print Summary
  const handlePrintSummary = () => {
    printElement('school-results-printable-area', `Academic Performance - ${analysis?.selectedExam?.title || 'Eldoret Muslim Academy'}`);
  };

  const overview = analysis?.schoolOverview || {};
  const userScope = analysis?.userScope;
  const currentClassName = overview?.className || analysis?.selectedClassDetail?.className;

  const headerTitle = useMemo(() => {
    if (!userScope || userScope.isLeadership) return 'Schoolwide Results & Broadsheet Center';
    if (currentClassName) {
      return `${currentClassName} — Class Broadsheet & Results`;
    }
    return 'Class Broadsheet & Academic Results';
  }, [userScope, currentClassName]);

  const headerSubtitle = useMemo(() => {
    if (!userScope || userScope.isLeadership) {
      return 'Executive academic intelligence, class rankings, subject league tables, and CBC performance analytics';
    }
    return 'Multi-subject examination broadsheet, student rankings, subject averages, and remedial watchlists';
  }, [userScope]);

  if (!loading && accessDeniedMessage && !analysis) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-amber-200 dark:border-amber-900/50 p-6 sm:p-8 rounded-2xl shadow-glass dark:shadow-none text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Academic Results Access Restricted
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
    <PageLoadingWrapper isLoading={loading} subtitle="Compiling academic results & broadsheet...">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div id="school-results-printable-area" className="space-y-6">
          {/* 1. Global Context & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] p-4 sm:p-5 rounded-2xl shadow-glass dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-[#0c1932] border border-sky-200 dark:border-[#162b4d] flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {headerTitle}
                  </h1>
                  {userScope && !userScope.isLeadership && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      Class Teacher · {currentClassName || 'Assigned Stream'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {headerSubtitle}
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

              {/* Class Scope Selector: Show ONLY for Leadership or if teacher manages >1 classes */}
              {analysis?.classes && analysis.classes.length > 1 && userScope?.isLeadership && (
                <div className="relative">
                  <select
                    value={selectedClassId || ''}
                    onChange={(e) => {
                      const newClassId = e.target.value;
                      if (newClassId) {
                        fetchClassDrilldown(newClassId);
                      } else {
                        setSelectedClassId(null);
                        fetchExamAnalysis(selectedExamId || undefined, undefined);
                        setActiveTab('CLASSES');
                      }
                    }}
                    className="px-3.5 py-2 pr-9 bg-slate-50 dark:bg-[#0c1932] border border-slate-200 dark:border-[#162b4d] rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-xs appearance-none"
                  >
                    <option value="">All Classes (Schoolwide)</option>
                    {analysis.classes.map((cls: any) => (
                      <option key={cls.classId} value={cls.classId}>
                        Class: {cls.className}
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
                title="Export Broadsheet to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Broadsheet</span>
              </button>

              {/* Print Summary */}
              <button
                type="button"
                onClick={handlePrintSummary}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0c1932] hover:bg-slate-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Print Summary Report"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* 2. Top-Level Compact Executive KPI Strip (No large bulky cards) */}
          <div className="bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass dark:shadow-none p-3.5 sm:p-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-[#162b4d] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-0">
            {/* 1. Mean Score (Class / School Mean) */}
            <div className="sm:px-3 py-1 first:pl-0 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {overview.isClassScoped ? 'Class Mean' : 'School Mean'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                  {overview.schoolAverage > 0 ? `${overview.schoolAverage}%` : '—'}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                {overview.schoolAverage >= 75 ? 'Level 4 · Exceeding' : overview.schoolAverage >= 50 ? 'Level 3 · Meeting' : 'Level 2 · Approaching'}
              </span>
            </div>

            {/* 2. Assessment Candidacy */}
            <div className="sm:px-3 py-1 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {overview.isClassScoped ? 'Class Candidacy' : 'Candidacy Sat'}
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                  {overview.candidacyRate ?? 100}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {overview.totalLearnersTested ?? 0} of {overview.totalEnrolled ?? 0} Sat ({overview.absentCount ?? 0} absent)
              </span>
            </div>

            {/* 3. CBC Proficiency Benchmark */}
            <div className="sm:px-3 py-1 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Proficiency Pass
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {overview.proficiencyBenchmark ?? 0}%
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {(overview.rubricDistribution?.EE ?? 0) + (overview.rubricDistribution?.ME ?? 0)} Scores EE / ME
              </span>
            </div>

            {/* 4. Top Learner (#1) */}
            <div className="sm:px-3 py-1 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                #1 Top Learner
              </span>
              <div className="mt-0.5 truncate">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate block">
                  {overview.topStudent?.name || overview.topStream?.name || '—'}
                </span>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold font-mono">
                {overview.topStudent ? `${overview.topStudent.average}% Average` : '—'}
              </span>
            </div>

            {/* 5. Lowest Learner (Last) */}
            <div className="sm:px-3 py-1 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Lowest Learner
              </span>
              <div className="mt-0.5 truncate">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate block">
                  {overview.lowestStudent?.name || '—'}
                </span>
              </div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold font-mono">
                {overview.lowestStudent ? `${overview.lowestStudent.average}% (#${overview.lowestStudent.rank})` : '—'}
              </span>
            </div>

            {/* 6. Top Learning Area */}
            <div className="sm:px-3 py-1 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Top Subject
              </span>
              <div className="mt-0.5 truncate">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate block">
                  {overview.topSubject?.name || '—'}
                </span>
              </div>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                {overview.topSubject ? `${overview.topSubject.average}% Mean` : '—'}
              </span>
            </div>

            {/* 7. Lowest Performing Subject (Needs Attention) */}
            <div className="sm:px-3 py-1 last:pr-0 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Needs Attention
              </span>
              <div className="mt-0.5 truncate">
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate block">
                  {overview.lowestSubject?.name || '—'}
                </span>
              </div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold font-mono">
                {overview.lowestSubject ? `${overview.lowestSubject.average}% Mean` : '—'}
              </span>
            </div>
          </div>

          {/* CBC 4-Level Performance Pyramid Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50/70 dark:bg-[#081a1a]/70 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 dark:text-emerald-300 text-xs">EE (75%–100%)</span>
                <span className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-black rounded-full text-[10px] font-mono">
                  {overview.rubricPercentages?.EE ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                {overview.rubricDistribution?.EE ?? 0} Scores · Exceeding Expectations
              </p>
            </div>

            <div className="p-3 bg-sky-50/70 dark:bg-[#0c1c2e]/70 border border-sky-200 dark:border-sky-900/50 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-sky-900 dark:text-sky-300 text-xs">ME (50%–74%)</span>
                <span className="px-2 py-0.5 bg-sky-200 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 font-black rounded-full text-[10px] font-mono">
                  {overview.rubricPercentages?.ME ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-sky-700 dark:text-sky-400 font-semibold mt-1">
                {overview.rubricDistribution?.ME ?? 0} Scores · Meeting Expectations
              </p>
            </div>

            <div className="p-3 bg-amber-50/70 dark:bg-[#1f1908]/70 border border-amber-200 dark:border-amber-900/50 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-900 dark:text-amber-300 text-xs">AE (40%–49%)</span>
                <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-black rounded-full text-[10px] font-mono">
                  {overview.rubricPercentages?.AE ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                {overview.rubricDistribution?.AE ?? 0} Scores · Approaching Expectations
              </p>
            </div>

            <div className="p-3 bg-rose-50/70 dark:bg-[#1f0d11]/70 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-black text-rose-900 dark:text-rose-300 text-xs">BE (&lt;40%)</span>
                <span className="px-2 py-0.5 bg-rose-200 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 font-black rounded-full text-[10px] font-mono">
                  {overview.rubricPercentages?.BE ?? 0}%
                </span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold mt-1">
                {overview.rubricDistribution?.BE ?? 0} Scores · Below Expectations (Remedial)
              </p>
            </div>
          </div>

          {/* 3. Deep-Dive View Tabs & Filter Bar (Single Row, modern-web-guidance) */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 overflow-x-auto flex-nowrap">
            <div
              role="tablist"
              aria-label="Academic results navigation tabs"
              className="flex items-center gap-2 shrink-0"
            >
              {/* Leadership only: Class League Table */}
              {(!userScope || userScope.isLeadership) && (
                <button
                  type="button"
                  role="tab"
                  id="tab-classes"
                  aria-selected={activeTab === 'CLASSES'}
                  aria-controls="panel-classes"
                  onClick={() => setActiveTab('CLASSES')}
                  className={`px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer ${
                    activeTab === 'CLASSES'
                      ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Class League Table ({filteredClasses.length})
                </button>
              )}

              {/* Class Broadsheet (Primary for Class Teachers) */}
              {analysis?.selectedClassDetail && (
                <button
                  type="button"
                  role="tab"
                  id="tab-drilldown"
                  aria-selected={activeTab === 'DRILLDOWN'}
                  aria-controls="panel-drilldown"
                  onClick={() => setActiveTab('DRILLDOWN')}
                  className={`px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer ${
                    activeTab === 'DRILLDOWN'
                      ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Class Broadsheet: {analysis.selectedClassDetail.className} ({analysis.selectedClassDetail.students?.length || 0})
                </button>
              )}

              {/* Subject Breakdown in Class */}
              <button
                type="button"
                role="tab"
                id="tab-subjects"
                aria-selected={activeTab === 'SUBJECTS'}
                aria-controls="panel-subjects"
                onClick={() => setActiveTab('SUBJECTS')}
                className={`px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer ${
                  activeTab === 'SUBJECTS'
                    ? 'text-sky-600 dark:text-sky-400 border-b-2 border-sky-600 dark:border-sky-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Subject Performance ({filteredSubjects.length})
              </button>

              {/* Class Merit List */}
              <button
                type="button"
                role="tab"
                id="tab-honor-roll"
                aria-selected={activeTab === 'HONOR_ROLL'}
                aria-controls="panel-honor-roll"
                onClick={() => setActiveTab('HONOR_ROLL')}
                className={`px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer ${
                  activeTab === 'HONOR_ROLL'
                    ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-600 dark:border-amber-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Merit List ({filteredHonorRoll.length})
              </button>

              {/* Remedial Watchlist */}
              <button
                type="button"
                role="tab"
                id="tab-remedial"
                aria-selected={activeTab === 'REMEDIAL'}
                aria-controls="panel-remedial"
                onClick={() => setActiveTab('REMEDIAL')}
                className={`px-4 py-3 text-xs font-bold transition-all relative shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'REMEDIAL'
                    ? 'text-rose-600 dark:text-rose-400 border-b-2 border-rose-600 dark:border-rose-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>Remedial Watchlist</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  filteredRemedial.length > 0
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {filteredRemedial.length}
                </span>
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative w-48 sm:w-64 pb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  !userScope || userScope.isLeadership
                    ? "Search learners or subjects..."
                    : `Search ${currentClassName || 'class'} learners...`
                }
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0c1932] border border-slate-200 dark:border-[#162b4d] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
              />
            </div>
          </div>

          {/* 4. Tab Panels */}
          {/* TAB 1: CLASS LEAGUE TABLE (Leadership Only) */}
          {(!userScope || userScope.isLeadership) && (
            <div
              role="tabpanel"
              id="panel-classes"
              aria-labelledby="tab-classes"
              tabIndex={0}
              hidden={activeTab !== 'CLASSES'}
              className="space-y-4 focus:outline-none"
            >
              <div
                tabIndex={0}
                role="region"
                aria-label="Class league table"
                className="table-wrapper overflow-x-auto rounded-2xl border border-sky-100 dark:border-[#162b4d] bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md shadow-glass dark:shadow-none"
              >
                <table className="w-full text-left text-xs min-w-[950px] border-collapse">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-sky-100 dark:border-[#162b4d] bg-slate-50/95 dark:bg-[#0c1932]/95 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th scope="col" className="p-3.5 text-center">Rank</th>
                      <th scope="col" className="p-3.5">Class & Stream</th>
                      <th scope="col" className="p-3.5">Class Teacher</th>
                      <th scope="col" className="p-3.5 text-center">Candidacy</th>
                      <th scope="col" className="p-3.5 text-center">Class Mean</th>
                      <th scope="col" className="p-3.5">CBC Spread (EE / ME / AE / BE)</th>
                      <th scope="col" className="p-3.5">Top Learner in Class</th>
                      <th scope="col" className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d] font-medium text-slate-700 dark:text-slate-300">
                    {filteredClasses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No class performance records match your filter
                        </td>
                      </tr>
                    ) : (
                      filteredClasses.map((cls: any) => (
                        <tr key={cls.classId} className="hover:bg-sky-50/30 dark:hover:bg-[#0c1932]/60 transition-colors">
                          <td className="p-3.5 text-center font-mono font-bold">
                            #{cls.rank}
                          </td>
                          <th scope="row" className="p-3.5 font-bold text-slate-900 dark:text-slate-100">
                            <div>{cls.className}</div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {cls.isJunior ? 'Junior Secondary' : 'Primary'}
                            </span>
                          </th>
                          <td className="p-3.5 text-slate-700 dark:text-slate-300">
                            {cls.classTeacher}
                          </td>
                          <td className="p-3.5 text-center font-mono">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{cls.testedCount}</span>
                            <span className="text-slate-400">/{cls.enrolledCount}</span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="text-sm font-black font-mono text-sky-700 dark:text-sky-300">
                              {cls.classAverage > 0 ? `${cls.classAverage}%` : '—'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                                {cls.rubric?.EE ?? 0} EE
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold">
                                {cls.rubric?.ME ?? 0} ME
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                                {cls.rubric?.AE ?? 0} AE
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold">
                                {cls.rubric?.BE ?? 0} BE
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5">
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
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => fetchClassDrilldown(cls.classId)}
                              disabled={Boolean(loadingClassId)}
                              className="px-2.5 py-1.5 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-700 dark:text-sky-300 font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <span>Broadsheet</span>
                              <ChevronRight className="w-3 h-3 text-sky-500" />
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

          {/* TAB 2: CLASS BROADSHEET (Full Multi-Subject Matrix) */}
          {analysis?.selectedClassDetail && (
            <div
              role="tabpanel"
              id="panel-drilldown"
              aria-labelledby="tab-drilldown"
              tabIndex={0}
              hidden={activeTab !== 'DRILLDOWN'}
              className="space-y-4 focus:outline-none"
            >
              <div
                tabIndex={0}
                role="region"
                aria-label="Class broadsheet table"
                className="table-wrapper overflow-x-auto rounded-2xl border border-sky-100 dark:border-[#162b4d] bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md shadow-glass dark:shadow-none"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-sky-100 dark:border-[#162b4d] bg-slate-50/95 dark:bg-[#0c1932]/95 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th scope="col" className="p-3.5 w-16 text-center">Rank</th>
                      <th scope="col" className="p-3.5 w-36">Assessment No</th>
                      <th scope="col" className="p-3.5 sticky left-0 z-20 bg-slate-50 dark:bg-[#0c1932]">Learner Name</th>
                      {broadsheetSubjects.map((sub: any) => (
                        <th key={sub.id} scope="col" className="p-3.5 text-center min-w-[70px]">
                          {sub.code}
                        </th>
                      ))}
                      <th scope="col" className="p-3.5 text-right w-24">Total</th>
                      <th scope="col" className="p-3.5 text-right w-24">Average</th>
                      <th scope="col" className="p-3.5 text-center w-28">Proficiency</th>
                      <th scope="col" className="p-3.5 text-center w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d]">
                    {filteredClassStudents.map((student: any) => {
                      const isTop = student.rank === 1;
                      const isLast = student.rank === filteredClassStudents.length;

                      return (
                        <tr
                          key={student.studentId}
                          onClick={() => setSelectedStudentForDrawer({
                            ...student,
                            className: analysis.selectedClassDetail.className,
                            isJunior: analysis.selectedClassDetail.isJunior,
                          })}
                          className={`hover:bg-sky-50/50 dark:hover:bg-[#0e2040]/50 transition-colors cursor-pointer group ${
                            isTop ? 'bg-amber-50/30 dark:bg-amber-950/20' : isLast ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
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
                            {student.assessmentNumber || student.admissionNumber || '—'}
                          </td>
                          <th scope="row" className="p-3.5 font-bold text-slate-900 dark:text-slate-100 sticky left-0 z-10 bg-white/95 dark:bg-[#091326]/95 group-hover:bg-sky-50/95 dark:group-hover:bg-[#0e2040]/95 transition-colors whitespace-nowrap">
                            {student.studentName}
                          </th>
                          {broadsheetSubjects.map((sub: any) => {
                            const subScore = student.subjects?.find((s: any) => s.subjectId === sub.id);
                            if (!subScore) return <td key={sub.id} className="p-3.5 text-center text-slate-400 font-mono">—</td>;
                            const scoreVal = subScore.score;
                            const rub = subScore.rubric;
                            const isFailing = scoreVal < 50 || rub === 'BE';
                            return (
                              <td key={sub.id} className="p-3.5 text-center font-mono">
                                <span className={`font-bold ${isFailing ? 'text-rose-600 dark:text-rose-400' : scoreVal >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {scoreVal}
                                </span>
                                <span className={`ml-1 text-[9px] px-1 py-0.2 rounded font-mono ${
                                  rub === 'EE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                  rub === 'ME' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                                  rub === 'AE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {rub}
                                </span>
                              </td>
                            );
                          })}
                          <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {student.totalMarks}
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-sm text-sky-700 dark:text-sky-300">
                            {student.average}%
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              student.average >= 75
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : student.average >= 50
                                ? 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                : student.average >= 40
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}>
                              {student.average >= 75 ? 'EE' : student.average >= 50 ? 'ME' : student.average >= 40 ? 'AE' : 'BE'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
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
                              className="px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 text-sky-700 dark:text-sky-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              Slide View
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

          {/* TAB 3: SUBJECT BREAKDOWN IN CLASS */}
          <div
            role="tabpanel"
            id="panel-subjects"
            aria-labelledby="tab-subjects"
            tabIndex={0}
            hidden={activeTab !== 'SUBJECTS'}
            className="space-y-4 focus:outline-none"
          >
            <div
              tabIndex={0}
              role="region"
              aria-label="Subject performance matrix table"
              className="table-wrapper overflow-x-auto rounded-2xl border border-sky-100 dark:border-[#162b4d] bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md shadow-glass dark:shadow-none"
            >
              <table className="w-full text-left text-xs min-w-[980px] border-collapse">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-sky-100 dark:border-[#162b4d] bg-slate-50/95 dark:bg-[#0c1932]/95 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th scope="col" className="p-3.5">Subject Code & Name</th>
                    <th scope="col" className="p-3.5 text-center">Assessed</th>
                    <th scope="col" className="p-3.5 text-center">Mean Score</th>
                    <th scope="col" className="p-3.5 text-center">Target (70%)</th>
                    <th scope="col" className="p-3.5 text-center">Highest / Lowest</th>
                    <th scope="col" className="p-3.5">CBC Rubric Breakdown</th>
                    <th scope="col" className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d] font-medium text-slate-700 dark:text-slate-300">
                  {filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No subject data matches your filter
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((sub: any) => (
                      <tr key={sub.subjectId} className="hover:bg-sky-50/30 dark:hover:bg-[#0c1932]/60 transition-colors">
                        <th scope="row" className="p-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                          <span>{sub.subjectName}</span>
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                            {sub.subjectCode}
                          </span>
                        </th>
                        <td className="p-3.5 text-center font-mono font-bold whitespace-nowrap">
                          {sub.testedCount}
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className="text-sm font-black font-mono text-sky-700 dark:text-sky-300">
                            {sub.averageScore > 0 ? `${sub.averageScore}%` : '—'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-mono text-xs whitespace-nowrap">
                          {sub.variance >= 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">+{sub.variance}% ▲</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">{sub.variance}% ▼</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono text-xs whitespace-nowrap">
                          <span className="text-emerald-600 font-bold">{sub.highestScore}%</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-rose-600 font-bold">{sub.lowestScore}%</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
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
                        <td className="p-3.5 text-center whitespace-nowrap">
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

          {/* TAB 4: MERIT LIST (Honor Roll) */}
          <div
            role="tabpanel"
            id="panel-honor-roll"
            aria-labelledby="tab-honor-roll"
            tabIndex={0}
            hidden={activeTab !== 'HONOR_ROLL'}
            className="space-y-4 focus:outline-none"
          >
            <div
              tabIndex={0}
              role="region"
              aria-label="Merit list table"
              className="table-wrapper overflow-x-auto rounded-2xl border border-amber-100 dark:border-[#2d2208] bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md shadow-glass dark:shadow-none"
            >
              <table className="w-full text-left text-xs min-w-[850px] border-collapse">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-amber-100 dark:border-[#2d2208] bg-amber-50/90 dark:bg-[#1a1306] text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    <th scope="col" className="p-3.5 text-center">Rank</th>
                    <th scope="col" className="p-3.5">Learner Name</th>
                    <th scope="col" className="p-3.5">Assessment No</th>
                    <th scope="col" className="p-3.5">Class</th>
                    <th scope="col" className="p-3.5 text-center">Subjects</th>
                    <th scope="col" className="p-3.5">Top Subject</th>
                    <th scope="col" className="p-3.5 text-center">Mean Score</th>
                    <th scope="col" className="p-3.5 text-center">Proficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d] font-medium text-slate-700 dark:text-slate-300">
                  {filteredHonorRoll.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No learner scores recorded for this exam
                      </td>
                    </tr>
                  ) : (
                    filteredHonorRoll.map((student: any) => (
                      <tr key={student.studentId} className="hover:bg-amber-50/20 dark:hover:bg-[#142647]/50 transition-colors">
                        <td className="p-3.5 text-center font-mono font-bold">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                            student.rank === 1
                              ? 'bg-amber-400 text-amber-950 shadow-xs'
                              : student.rank === 2
                              ? 'bg-slate-300 text-slate-900 shadow-xs'
                              : student.rank === 3
                              ? 'bg-amber-700 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {student.rank}
                          </span>
                        </td>
                        <th scope="row" className="p-3.5 font-black text-slate-900 dark:text-slate-100">
                          {student.studentName}
                        </th>
                        <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">
                          {student.assessmentNumber || student.admissionNumber || '—'}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {student.className}
                        </td>
                        <td className="p-3.5 text-center font-mono">
                          {student.subjectsCount}
                        </td>
                        <td className="p-3.5">
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{student.topSubject || '—'}</span>
                          {student.topScore > 0 && (
                            <span className="ml-1 text-[11px] font-mono font-bold text-emerald-600">({student.topScore}%)</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-300">
                            {student.averageScore}%
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
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

          {/* TAB 5: REMEDIAL WATCHLIST */}
          <div
            role="tabpanel"
            id="panel-remedial"
            aria-labelledby="tab-remedial"
            tabIndex={0}
            hidden={activeTab !== 'REMEDIAL'}
            className="space-y-4 focus:outline-none"
          >
            <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 p-4 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-rose-900 dark:text-rose-300">
                  Targeted Academic Remedial Intervention Registry
                </h4>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-400/80 mt-0.5">
                  The following learners scored below 50% or were assessed as Below Expectations in specific subjects. Coordinate with respective subject teachers to deliver targeted remedial homework and support sessions.
                </p>
              </div>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-label="Remedial intervention table"
              className="table-wrapper overflow-x-auto rounded-2xl border border-rose-100 dark:border-[#2d1217] bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md shadow-glass dark:shadow-none"
            >
              <table className="w-full text-left text-xs min-w-[980px] border-collapse">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-rose-100 dark:border-[#2d1217] bg-rose-50/90 dark:bg-[#1a0a0f] text-[11px] font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
                    <th scope="col" className="p-3.5">Learner Name</th>
                    <th scope="col" className="p-3.5">Assessment No</th>
                    <th scope="col" className="p-3.5">Class</th>
                    <th scope="col" className="p-3.5 text-center">Failing Subjects</th>
                    <th scope="col" className="p-3.5">Critical Learning Areas & Scores</th>
                    <th scope="col" className="p-3.5 text-center">Overall Mean</th>
                    <th scope="col" className="p-3.5 text-center">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#162b4d] font-medium text-slate-700 dark:text-slate-300">
                  {filteredRemedial.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        Outstanding! No learners in this stream currently scoring below expectations.
                      </td>
                    </tr>
                  ) : (
                    filteredRemedial.map((student: any) => (
                      <tr key={student.studentId} className="hover:bg-rose-50/20 dark:hover:bg-[#142647]/50 transition-colors">
                        <th scope="row" className="p-3.5 font-black text-slate-900 dark:text-slate-100">
                          {student.studentName}
                        </th>
                        <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">
                          {student.assessmentNumber || student.admissionNumber || '—'}
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          {student.className}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-rose-600">
                          {student.failingCount}
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {student.failingSubjects.map((sub: any, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-900">
                                {sub.subjectName} ({sub.marksObtained}%)
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {student.overallAverage}%
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            student.riskLevel === 'HIGH'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
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

                      {/* Header Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {classStudents.length > 1 && (
                          <div className="flex items-center bg-slate-100 dark:bg-[#0f1d37] p-1 rounded-xl border border-slate-200 dark:border-[#162b4d]">
                            <button
                              type="button"
                              onClick={handlePrevStudent}
                              disabled={currentStudentIndex <= 0}
                              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-[#1a335a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              title="Previous Student (ArrowLeft)"
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
                              title="Next Student (ArrowRight)"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handlePrintStudentSlip}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#0f1d37] hover:bg-slate-100 dark:hover:bg-[#1a335a] text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          title="Print Assessment Mark Slip"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden sm:inline">Print Slip</span>
                        </button>

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

                    {/* Compact Metric Summary Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-[#162b4d] border-t border-slate-200 dark:border-[#162b4d] pt-3 mt-1">
                      <div className="sm:pr-4 py-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class Standing</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100">
                            #{selectedStudentForDrawer.rank}
                          </span>
                          <span className="text-slate-400 text-xs font-medium">/ {classStudents.length} learners</span>
                        </div>
                      </div>

                      <div className="sm:px-4 py-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mean Average</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-base sm:text-lg font-black font-mono text-sky-600 dark:text-sky-400">
                            {selectedStudentForDrawer.average}%
                          </span>
                          <span className={`text-[11px] font-bold ${varianceFromClassMean >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            ({varianceFromClassMean >= 0 ? `+${varianceFromClassMean}%` : `${varianceFromClassMean}%`})
                          </span>
                        </div>
                      </div>

                      <div className="sm:px-4 py-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aggregate Total</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100">
                            {selectedStudentForDrawer.totalMarks}
                          </span>
                          <span className="text-slate-400 text-xs font-medium">/ {selectedStudentForDrawer.subjects?.length ?? 0} subjects</span>
                        </div>
                      </div>

                      <div className="sm:pl-4 py-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Competency Spread</span>
                        <div className="flex items-center gap-1.5 mt-1 font-mono text-xs font-bold">
                          <span className="text-emerald-600 dark:text-emerald-400" title="EE count">{studentRubricCounts.EE} EE</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-sky-600 dark:text-sky-400" title="ME count">{studentRubricCounts.ME} ME</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-amber-600 dark:text-amber-400" title="AE count">{studentRubricCounts.AE} AE</span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-rose-600 dark:text-rose-400" title="BE count">{studentRubricCounts.BE} BE</span>
                        </div>
                      </div>
                    </div>
                  </header>

                  {/* Drawer Body */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Controls Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#091326] p-3 rounded-2xl border border-slate-200 dark:border-[#162b4d] shadow-xs">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Filter:</span>
                        {(['ALL', 'EE', 'ME', 'AE', 'BE'] as const).map((filter) => (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setDrawerSubjectFilter(filter)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              drawerSubjectFilter === filter
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-[#0f1d37] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#162b4d]'
                            }`}
                          >
                            {filter === 'ALL' ? 'All Subjects' : filter}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Sort:</span>
                        <select
                          value={drawerSortOrder}
                          onChange={(e: any) => setDrawerSortOrder(e.target.value)}
                          className="px-2.5 py-1 bg-slate-50 dark:bg-[#0f1d37] border border-slate-200 dark:border-[#162b4d] rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <option value="DEFAULT">Default Order</option>
                          <option value="HIGHEST">Highest Score First</option>
                          <option value="LOWEST">Lowest Score First</option>
                        </select>
                      </div>
                    </div>

                    {/* Subject Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {drawerFilteredSubjects.map((sub: any, idx: number) => {
                        const score = Number(sub.score) || 0;
                        const maxMarks = Number(sub.maxMarks) || 100;
                        const pct = Math.round((score / maxMarks) * 100);
                        const rubric = sub.rubric || (pct >= 75 ? 'EE' : pct >= 50 ? 'ME' : pct >= 40 ? 'AE' : 'BE');
                        const iconData = getSubjectIconAndColor(sub.subjectName, sub.subjectCode);
                        const Icon = iconData.icon;

                        return (
                          <div
                            key={sub.subjectId || idx}
                            className="p-4 rounded-2xl bg-white dark:bg-[#0a1428] border border-slate-200 dark:border-[#162b4d] shadow-xs flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-800 transition-colors"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${iconData.bg}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                      {sub.subjectName}
                                    </h4>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {sub.subjectCode || 'CBC AREA'}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border shrink-0 ${
                                    rubric === 'EE'
                                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200'
                                      : rubric === 'ME'
                                      ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-200'
                                      : rubric === 'AE'
                                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200'
                                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200'
                                  }`}
                                >
                                  {rubric}
                                </span>
                              </div>

                              <div className="flex items-baseline justify-between mt-3">
                                <div>
                                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                                    {score}
                                  </span>
                                  <span className="text-xs text-slate-400 font-mono ml-1">/ {maxMarks}</span>
                                </div>
                                <span className={`text-xs font-bold font-mono ${pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-sky-600' : 'text-rose-600'}`}>
                                  {pct}%
                                </span>
                              </div>
                            </div>

                            {sub.remarks && (
                              <p className="mt-2.5 pt-2 border-t border-slate-100 dark:border-[#142647] text-[11px] text-slate-500 dark:text-slate-400 italic">
                                "{sub.remarks}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
