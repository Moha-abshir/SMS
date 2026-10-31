import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Lock,
  AlertCircle,
  Search,
  BookOpen,
  User,
  Clock,
  ShieldCheck,
  ArrowRight,
  Filter,
  X,
  Eye,
  Phone,
  Mail,
  Award,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  GraduationCap,
  Calendar,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { SearchableSelect } from '../../components/SearchableSelect';
import { isJuniorSecondaryClass, isSelfContainedClass } from '@school/shared/types';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

interface ClassOverviewItem {
  class: {
    id: string;
    name: string;
    levelCategory: string;
    numericOrder: number;
  };
  classTeacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
  } | null;
  totalExpected: number;
  submittedCount: number;
  approvedCount: number;
  lockedCount?: number;
  underReviewCount?: number;
  correctionCount: number;
  overallStatus: 'RECEIVED' | 'AWAITING' | string;
  isSubmittedToDeputy?: boolean;
  isPermanentlyLocked?: boolean;
  papers: {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    submissionId: string | null;
    status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'CORRECTION_REQUESTED' | 'LOCKED';
    submittedBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string | null;
    } | null;
    allocatedTeacher?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string | null;
    } | null;
    submittedAt: string | null;
    reviewedAt: string | null;
    correctionReason: string | null;
  }[];
}

interface ScoreItem {
  studentId: string;
  admissionNumber?: string | null;
  assessmentNumber?: string | null;
  fullName: string;
  studentName?: string;
  score: number | null;
  marksObtained?: number | null;
  maxScore: number;
  percentage: number;
  cbcRubricLevel: 'EE' | 'ME' | 'AE' | 'BE' | null;
  juniorPoints: number | null;
  teacherRemarks?: string | null;
}

export const MarkReviewView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [classesOverview, setClassesOverview] = useState<ClassOverviewItem[]>([]);

  // Filter & Search States (Strictly 2 states: RECEIVED vs AWAITING)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RECEIVED' | 'AWAITING'>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'SELF_CONTAINED' | 'SUBJECT_SPECIALIST'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Slide-Over Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassOverviewItem | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [subjectScoresLoading, setSubjectScoresLoading] = useState(false);
  const [subjectScoresData, setSubjectScoresData] = useState<any | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // 1. Fetch Class Overview Data
  const fetchOverview = async (examId?: string) => {
    try {
      setLoading(true);
      const targetExamId = examId || selectedExamId;
      const res = await apiClient.get('/api/mark-submissions/classes-overview', {
        params: targetExamId ? { examId: targetExamId } : {},
      });
      const data: ClassOverviewItem[] = res.data.data || [];
      setClassesOverview(data);

      // If drawer is currently open, refresh the selected class data
      if (selectedClass) {
        const refreshed = data.find((c) => c.class.id === selectedClass.class.id);
        if (refreshed) {
          setSelectedClass(refreshed);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load class review overview');
    } finally {
      setLoading(false);
    }
  };

  // 2. Initial Data Loading
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/api/exams');
        const list = res.data.data || [];
        setExams(list);

        let defaultId = '';
        if (list.length > 0) {
          const active = list.find((e: any) => e.exam?.status === 'APPROVED' || e.status === 'APPROVED');
          defaultId = active ? (active.exam?.id || active.id) : (list[0].exam?.id || list[0].id);
          setSelectedExamId(defaultId);
        }

        if (defaultId) {
          const overviewRes = await apiClient.get('/api/mark-submissions/classes-overview', {
            params: { examId: defaultId },
          });
          setClassesOverview(overviewRes.data.data || []);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load examination review data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // 3. Open Slide-Over Drawer for a Class
  // 3. Open Slide-Over Drawer for a Class (only accessible when received/locked)
  const handleOpenDrawer = (item: ClassOverviewItem) => {
    const isReceived = item.overallStatus === 'RECEIVED' || item.isPermanentlyLocked || item.isSubmittedToDeputy;
    if (!isReceived) {
      toast.info('This class marksheet is awaiting compilation and submission by the Class Teacher.');
      return;
    }

    setSelectedClass(item);
    setDrawerOpen(true);
    setStudentSearchQuery('');

    // Default to first paper with a submission or first paper
    const paperWithSubmission = item.papers.find((p) => p.submissionId) || item.papers[0];
    if (paperWithSubmission) {
      setSelectedSubjectId(paperWithSubmission.subjectId);
      if (paperWithSubmission.submissionId) {
        fetchSubjectScores(paperWithSubmission.submissionId);
      } else {
        setSubjectScoresData(null);
      }
    } else {
      setSelectedSubjectId('');
      setSubjectScoresData(null);
    }
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedClass(null);
    setSelectedSubjectId('');
    setSubjectScoresData(null);
    setStudentSearchQuery('');
  };

  // 4. Fetch Scores for Selected Subject in Drawer
  const fetchSubjectScores = async (submissionId: string) => {
    setSubjectScoresLoading(true);
    try {
      const res = await apiClient.get(`/api/mark-submissions/${submissionId}/scores`);
      setSubjectScoresData(res.data.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load scores for this subject marksheet');
      setSubjectScoresData(null);
    } finally {
      setSubjectScoresLoading(false);
    }
  };

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setStudentSearchQuery('');
    if (!selectedClass) return;

    const paper = selectedClass.papers.find((p) => p.subjectId === subjectId);
    if (paper?.submissionId) {
      fetchSubjectScores(paper.submissionId);
    } else {
      setSubjectScoresData(null);
    }
  };

  // Summary Metrics strictly for 2 states: Received (locked) vs Awaiting CT
  const metrics = useMemo(() => {
    const totalClasses = classesOverview.length;
    const receivedClasses = classesOverview.filter(
      (c) => c.overallStatus === 'RECEIVED' || c.isPermanentlyLocked || c.isSubmittedToDeputy
    ).length;
    const awaitingClasses = totalClasses - receivedClasses;

    return {
      totalClasses,
      receivedClasses,
      awaitingClasses,
    };
  }, [classesOverview]);

  // Filtered Classes List based on strictly 2 states
  const filteredClasses = useMemo(() => {
    return classesOverview.filter((item) => {
      const isSelfContained = isSelfContainedClass(item.class);
      if (tierFilter === 'SELF_CONTAINED' && !isSelfContained) return false;
      if (tierFilter === 'SUBJECT_SPECIALIST' && isSelfContained) return false;

      const isReceived = item.overallStatus === 'RECEIVED' || item.isPermanentlyLocked || item.isSubmittedToDeputy;
      const isAwaiting = !isReceived;

      if (statusFilter === 'RECEIVED' && !isReceived) return false;
      if (statusFilter === 'AWAITING' && !isAwaiting) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesClass = item.class.name.toLowerCase().includes(query);
        const matchesTeacher = item.classTeacher
          ? `${item.classTeacher.firstName} ${item.classTeacher.lastName}`.toLowerCase().includes(query)
          : false;
        if (!matchesClass && !matchesTeacher) return false;
      }

      return true;
    });
  }, [classesOverview, tierFilter, statusFilter, searchQuery]);

  // Active paper in drawer
  const activePaper = useMemo(() => {
    if (!selectedClass || !selectedSubjectId) return null;
    return selectedClass.papers.find((p) => p.subjectId === selectedSubjectId) || null;
  }, [selectedClass, selectedSubjectId]);

  // Filtered scores in drawer
  const filteredStudentScores: ScoreItem[] = useMemo(() => {
    const list: ScoreItem[] = subjectScoresData?.scores || [];
    if (!studentSearchQuery.trim()) return list;
    const q = studentSearchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.studentName?.toLowerCase().includes(q) ||
        s.assessmentNumber?.toLowerCase().includes(q) ||
        s.admissionNumber?.toLowerCase().includes(q)
    );
  }, [subjectScoresData, studentSearchQuery]);

  const isSelectedJunior = selectedClass ? isJuniorSecondaryClass(selectedClass.class) : false;

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Exam Mark Review & Permanent Lock"
      subtitle="Gathering submitted class marksheets and examination records..."
      icon={ClipboardCheck}
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Top Header Card */}
        <div className="relative z-30 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-glass">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                Deputy Head Oversight • Exam Mark Review
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Exam Mark Review
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Review complete class marksheets received from Class Teachers. Once submitted by Class Teachers, marksheets are permanently locked and cannot be altered.
              </p>
            </div>

            {/* Examination Period Selector */}
            <div className="w-full lg:w-80 shrink-0 relative z-40">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Examination Period
              </label>
              <SearchableSelect
                value={selectedExamId}
                onChange={(val) => {
                  setSelectedExamId(val);
                  fetchOverview(val);
                }}
                options={exams.map((row: any) => {
                  const item = row.exam || row;
                  const term = row.term || {};
                  const title = item.title || item.name || 'Examination';
                  const yr = term.year || item.academicYear || 2026;
                  const termLabel = term.termNumber ? `Term ${term.termNumber}` : (term.name || 'Term Exam');
                  return {
                    value: item.id,
                    label: `${title} (${yr} - ${termLabel})`,
                    badge: item.status || undefined,
                  };
                })}
                placeholder={exams.length === 0 ? 'No Active Examinations' : '-- Select Examination --'}
                searchPlaceholder="Search examination..."
              />
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 dark:bg-[#091326]/85 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-sky-100 dark:border-[#162b4d] shadow-glass">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'ALL'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-[#122444] border border-sky-100 dark:border-[#162b4d]'
              }`}
            >
              All Streams ({metrics.totalClasses})
            </button>
            <button
              onClick={() => setStatusFilter('RECEIVED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'RECEIVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-[#122444] border border-sky-100 dark:border-[#162b4d]'
              }`}
            >
              Received ({metrics.receivedClasses})
            </button>
            <button
              onClick={() => setStatusFilter('AWAITING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                statusFilter === 'AWAITING'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-50 dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-[#122444] border border-sky-100 dark:border-[#162b4d]'
              }`}
            >
              Awaiting CT ({metrics.awaitingClasses})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stream or class teacher..."
              className="w-full bg-slate-50 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        {/* Minimalist Class Stream Cards Grid */}
        {filteredClasses.length === 0 ? (
          <div className="p-12 text-center bg-white/80 dark:bg-[#091326]/80 rounded-2xl border border-sky-100 dark:border-[#162b4d] space-y-2">
            <ClipboardCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              No matching class streams found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredClasses.map((item) => {
              const isReceived = item.overallStatus === 'RECEIVED' || item.isPermanentlyLocked || item.isSubmittedToDeputy;
              const isSelfContained = isSelfContainedClass(item.class);

              return (
                <div
                  key={item.class.id}
                  className="bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-sky-100 dark:border-[#162b4d] shadow-glass hover:border-sky-300 dark:hover:border-sky-600/50 transition-all flex flex-col justify-between space-y-3.5 group/card"
                >
                  <div className="space-y-3">
                    {/* Header Row: Class Name & Status Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs shrink-0 group-hover/card:scale-105 transition-transform duration-200">
                          {item.class.name.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
                            {item.class.name}
                          </h3>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5 truncate">
                            {isSelfContained ? 'Self-Contained (PP1–G3)' : 'Subject Specialists (G4–G9)'}
                          </span>
                        </div>
                      </div>

                      {/* Status Pill */}
                      {isReceived ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0 inline-flex items-center gap-1">
                          <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Received & Locked
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          Awaiting CT
                        </span>
                      )}
                    </div>

                    {/* Class Teacher Info */}
                    <div className="p-2.5 sm:p-3 bg-slate-50/70 dark:bg-[#0c1830] border border-sky-100/60 dark:border-[#162b4d] rounded-xl flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Class Teacher
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5 truncate">
                          {item.classTeacher
                            ? `${item.classTeacher.firstName} ${item.classTeacher.lastName}`
                            : 'Unassigned'}
                        </span>
                      </div>
                      {item.classTeacher?.phoneNumber && (
                        <a
                          href={`tel:${item.classTeacher.phoneNumber.replace(/\s+/g, '')}`}
                          className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white transition-colors shrink-0"
                          title={`Call Class Teacher (${item.classTeacher.phoneNumber})`}
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2 border-t border-slate-100 dark:border-[#112038]">
                    {isReceived ? (
                      <button
                        onClick={() => handleOpenDrawer(item)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0c1830] hover:bg-sky-50 dark:hover:bg-[#122444] border border-sky-200 dark:border-[#162b4d] text-sky-700 dark:text-sky-300 text-xs font-bold transition-all shadow-xs cursor-pointer hover:border-sky-300 dark:hover:border-sky-500"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-500" />
                        View Marksheets
                      </button>
                    ) : (
                      <div
                        className="w-full text-center py-2 px-3 rounded-xl bg-slate-50 dark:bg-[#0c1830] border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-400 font-medium cursor-not-allowed select-none flex items-center justify-center gap-1.5"
                        title="Marksheet will become accessible once the Class Teacher verifies and submits to the Deputy Head"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Awaiting Class Teacher Submission
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-Over Drawer for Viewing Class Subjects & Student Scores */}
      <AnimatePresence>
        {drawerOpen && selectedClass && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />

            {/* Slide-Over Panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="w-screen max-w-full sm:max-w-3xl lg:max-w-4xl bg-white dark:bg-[#081020] shadow-2xl flex flex-col border-l border-sky-100 dark:border-[#162b4d]"
              >
                {/* Drawer Header */}
                <div className="p-5 sm:p-6 border-b border-sky-100 dark:border-[#162b4d] bg-sky-50/40 dark:bg-[#0c1830] flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {selectedClass.class.name} Marksheet
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase inline-flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-500" />
                        Received • Permanently Locked
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>Class Teacher:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {selectedClass.classTeacher ? `${selectedClass.classTeacher.firstName} ${selectedClass.classTeacher.lastName}` : 'Unassigned'}
                      </strong>
                      {selectedClass.classTeacher?.phoneNumber && (
                        <a
                          href={`tel:${selectedClass.classTeacher.phoneNumber.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1 text-sky-600 hover:underline font-bold ml-1"
                        >
                          <Phone className="w-3 h-3" />
                          {selectedClass.classTeacher.phoneNumber}
                        </a>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCloseDrawer}
                      className="p-2 rounded-xl bg-white dark:bg-[#0c1830] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-sky-100 dark:border-[#162b4d] transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Permanent Lock Banner Notification in Drawer */}
                <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/60 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>This class marksheet was submitted by the Class Teacher and is under permanent lock. All learner scores are verified, final, and archived.</span>
                </div>

                {/* Subject Selector Tabs */}
                <div className="px-5 py-3 border-b border-sky-100 dark:border-[#162b4d] bg-white dark:bg-[#081020] flex items-center gap-2 overflow-x-auto">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                    Learning Areas:
                  </span>
                  {selectedClass.papers.map((p) => {
                    const isSelected = p.subjectId === selectedSubjectId;
                    return (
                      <button
                        key={p.subjectId}
                        onClick={() => handleSelectSubject(p.subjectId)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-sky-500 text-white shadow-xs'
                            : 'bg-slate-50 dark:bg-[#0c1830] text-slate-600 dark:text-slate-300 border border-sky-100 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#122444]'
                        }`}
                      >
                        {p.subjectName}
                      </button>
                    );
                  })}
                </div>

                {/* Drawer Main Body: Scores & Details */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                  {/* Selected Subject Overview Header Card */}
                  {activePaper && (
                    <div className="p-4 bg-sky-50/50 dark:bg-[#0c1830] rounded-2xl border border-sky-100 dark:border-[#162b4d] space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {activePaper.subjectName}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-[#081020] text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-slate-800">
                              {activePaper.subjectCode}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Examiner / Marker: <span className="font-semibold text-slate-800 dark:text-slate-200">{activePaper.submittedBy ? `${activePaper.submittedBy.firstName} ${activePaper.submittedBy.lastName}` : (activePaper.allocatedTeacher ? `${activePaper.allocatedTeacher.firstName} ${activePaper.allocatedTeacher.lastName}` : 'Unallocated')}</span>
                            {activePaper.submittedBy?.phoneNumber && (
                              <a
                                href={`tel:${activePaper.submittedBy.phoneNumber}`}
                                className="ml-2 text-sky-600 hover:underline font-bold"
                              >
                                {activePaper.submittedBy.phoneNumber}
                              </a>
                            )}
                          </p>
                        </div>

                        {/* Subject Quick Stats */}
                        {subjectScoresData?.stats && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#081020] border border-sky-100 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Mean: <strong className="text-sky-600 dark:text-sky-400">{Math.round(subjectScoresData.stats.meanScore || 0)}%</strong>
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#081020] border border-sky-100 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              Learners: <strong className="text-slate-900 dark:text-white">{subjectScoresData.stats.totalStudents || 0}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Rubric / Points Distribution Pill Bar */}
                      {subjectScoresData?.rubricSummary && !isSelectedJunior && (
                        <div className="pt-2 border-t border-sky-100/60 dark:border-[#112038] flex items-center gap-2 flex-wrap text-xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                            Rubrics:
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px]">
                            EE: {subjectScoresData.rubricSummary.EE || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 font-bold text-[11px]">
                            ME: {subjectScoresData.rubricSummary.ME || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px]">
                            AE: {subjectScoresData.rubricSummary.AE || 0}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px]">
                            BE: {subjectScoresData.rubricSummary.BE || 0}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Student Search Box */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Search student name or assessment number in marksheet..."
                      className="w-full bg-slate-50 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>

                  {/* Scores Table */}
                  {subjectScoresLoading ? (
                    <div className="py-16 text-center space-y-2">
                      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-slate-400">Loading student scores...</p>
                    </div>
                  ) : !activePaper?.submissionId ? (
                    <div className="py-16 text-center bg-slate-50/50 dark:bg-[#0c1830] rounded-2xl border border-sky-100 dark:border-[#162b4d] space-y-2">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Marksheet Not Submitted Yet
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        The subject teacher has not yet entered and submitted scores for this learning area.
                      </p>
                    </div>
                  ) : filteredStudentScores.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No matching students found in this marksheet.
                    </div>
                  ) : (
                    <div
                      tabIndex={0}
                      role="region"
                      aria-label="Learner assessment scores marksheet"
                      className="overflow-x-auto rounded-xl border border-sky-100 dark:border-[#162b4d] focus:outline-none focus:ring-1 focus:ring-sky-500"
                    >
                      <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0c1830] text-slate-500 dark:text-slate-400 border-b border-sky-100 dark:border-[#162b4d] uppercase text-[10px] font-bold tracking-wider">
                          <tr>
                            <th scope="col" className="py-3 px-3.5 text-center w-12 whitespace-nowrap">#</th>
                            <th scope="col" className="py-3 px-3.5 whitespace-nowrap w-36">Assessment No.</th>
                            <th scope="col" className="py-3 px-3.5 whitespace-nowrap min-w-[160px]">Learner Name</th>
                            <th scope="col" className="py-3 px-3.5 text-center whitespace-nowrap w-32">Score / Max</th>
                            <th scope="col" className="py-3 px-3.5 text-center whitespace-nowrap w-28">
                              {isSelectedJunior ? 'Points' : 'CBC Rubric'}
                            </th>
                            <th scope="col" className="py-3 px-3.5 min-w-[220px]">Teacher Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-100/60 dark:divide-[#162b4d]/60 bg-white dark:bg-[#081020]">
                          {filteredStudentScores.map((score, idx) => (
                            <tr key={score.studentId} className="hover:bg-sky-50/40 dark:hover:bg-[#0c1830]/60 transition-colors">
                              <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3.5 font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">
                                {score.assessmentNumber || score.admissionNumber || '—'}
                              </td>
                              <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {score.fullName || score.studentName}
                              </td>
                              <td className="py-2.5 px-3.5 text-center font-bold font-mono whitespace-nowrap">
                                {score.score !== null ? (
                                  <span className="text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                    {score.score} <span className="text-slate-400 font-normal">/ {score.maxScore}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Not set</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                                {isSelectedJunior ? (
                                  score.juniorPoints ? (
                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 whitespace-nowrap">
                                      {score.juniorPoints} Pts
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )
                                ) : score.cbcRubricLevel ? (
                                  <span
                                    className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase whitespace-nowrap ${
                                      score.cbcRubricLevel === 'EE'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : score.cbcRubricLevel === 'ME'
                                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                        : score.cbcRubricLevel === 'AE'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                    }`}
                                  >
                                    {score.cbcRubricLevel}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400 text-xs">
                                {score.teacherRemarks || <span className="italic text-slate-300 dark:text-slate-600">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-sky-100 dark:border-[#162b4d] bg-sky-50/30 dark:bg-[#0c1830] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Viewing {filteredStudentScores.length} learner score record(s) • Read-Only Administrative Mode
                  </span>
                  <button
                    onClick={handleCloseDrawer}
                    className="px-4 py-2 rounded-xl bg-white dark:bg-[#081020] border border-sky-200 dark:border-[#162b4d] text-slate-700 dark:text-slate-300 font-bold hover:bg-sky-50 dark:hover:bg-[#122444] transition-colors cursor-pointer"
                  >
                    Close Drawer
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </PageLoadingWrapper>
  );
};
export default MarkReviewView;
