import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  CheckCircle2,
  RotateCcw,
  Lock,
  AlertCircle,
  Eye,
  Search,
  BookOpen,
  User,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  CheckCheck,
  Clock,
  Sparkles,
  ShieldCheck,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { SearchableSelect, SearchableSelectOption } from '../../components/SearchableSelect';
import { isJuniorSecondaryClass, isSelfContainedClass } from '@school/shared/types';

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
  } | null;
  totalExpected: number;
  submittedCount: number;
  approvedCount: number;
  correctionCount: number;
  overallStatus: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'CORRECTION_REQUESTED';
  papers: {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    submissionId: string | null;
    status: 'NOT_STARTED' | 'SUBMITTED' | 'APPROVED' | 'CORRECTION_REQUESTED' | 'LOCKED';
    submittedBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    submittedAt: string | null;
    reviewedAt: string | null;
    correctionReason: string | null;
  }[];
}

export const MarkReviewView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [classesOverview, setClassesOverview] = useState<ClassOverviewItem[]>([]);
  const [expandedClassIds, setExpandedClassIds] = useState<Set<string>>(new Set());

  // Filter & Search States
  const [tierFilter, setTierFilter] = useState<'ALL' | 'SELF_CONTAINED' | 'SUBJECT_SPECIALIST'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'CORRECTION_REQUESTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Actions Processing States
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);

  // Scores Inspection Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectData, setInspectData] = useState<any | null>(null);
  const [scoreSearch, setScoreSearch] = useState('');
  const [filterRubric, setFilterRubric] = useState<'ALL' | 'EE' | 'ME' | 'AE' | 'BE'>('ALL');
  const [filterPoints, setFilterPoints] = useState<number | 'ALL'>('ALL');
  const [inlineCorrectionMode, setInlineCorrectionMode] = useState(false);
  const [inlineReason, setInlineReason] = useState('');

  // Standalone Correction Modal
  const [correctionModalData, setCorrectionModalData] = useState<{
    submissionId: string;
    className: string;
    subjectName: string;
    teacherName: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 1. Initial Load: Fetch Exams
  const fetchExams = async () => {
    try {
      const res = await apiClient.get('/api/exams');
      const list = res.data.data || [];
      setExams(list);
      if (list.length > 0 && !selectedExamId) {
        // Find active exam or default to first
        const active = list.find((e: any) => e.exam?.status === 'APPROVED' || e.status === 'APPROVED');
        const defaultId = active ? (active.exam?.id || active.id) : (list[0].exam?.id || list[0].id);
        setSelectedExamId(defaultId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load examinations');
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // 2. Fetch Classes Review Overview when selectedExamId changes
  const fetchOverview = async (examId?: string) => {
    try {
      setLoading(true);
      const targetExamId = examId || selectedExamId;
      const res = await apiClient.get('/api/mark-submissions/classes-overview', {
        params: targetExamId ? { examId: targetExamId } : {},
      });
      const data: ClassOverviewItem[] = res.data.data || [];
      setClassesOverview(data);

      // By default, expand classes that have submissions awaiting review or correction
      const toExpand = new Set<string>();
      data.forEach((c) => {
        if (c.overallStatus === 'SUBMITTED' || c.overallStatus === 'CORRECTION_REQUESTED') {
          toExpand.add(c.class.id);
        }
      });
      // If none, expand the first class for easy inspection
      if (toExpand.size === 0 && data.length > 0) {
        toExpand.add(data[0].class.id);
      }
      setExpandedClassIds(toExpand);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load class review overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchOverview(selectedExamId);
    }
  }, [selectedExamId]);

  const toggleClassExpansion = (classId: string) => {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  // 3. Batch Approval: Approve Entire Class Submissions
  const handleApproveClass = async (classId: string, className: string) => {
    if (actionProcessing || !selectedExamId) return;
    try {
      setActionProcessing(true);
      setActionTargetId(`class-${classId}`);
      const res = await apiClient.put(`/api/mark-submissions/classes/${classId}/approve`, {
        examId: selectedExamId,
      });
      toast.success(res.data.message || `All submitted marks for ${className} approved successfully`);
      await fetchOverview(selectedExamId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to approve marks for ${className}`);
    } finally {
      setActionProcessing(false);
      setActionTargetId(null);
    }
  };

  // 4. Single Paper Approval
  const handleApprovePaper = async (submissionId: string) => {
    if (actionProcessing) return;
    try {
      setActionProcessing(true);
      setActionTargetId(`paper-${submissionId}`);
      await apiClient.put(`/api/mark-submissions/${submissionId}/approve`);
      toast.success('Paper approved successfully');
      if (inspectModalOpen && inspectData?.submission?.id === submissionId) {
        setInspectData({
          ...inspectData,
          submission: { ...inspectData.submission, status: 'APPROVED' },
        });
      }
      await fetchOverview(selectedExamId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve paper');
    } finally {
      setActionProcessing(false);
      setActionTargetId(null);
    }
  };

  // 5. Single Paper Rejection / Correction Request
  const handleConfirmCorrectionRequest = async (submissionId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error('Please specify a reason for requesting correction');
      return;
    }
    try {
      setActionProcessing(true);
      await apiClient.put(`/api/mark-submissions/${submissionId}/request-correction`, {
        reason,
      });
      toast.success('Correction request sent back to teacher');
      setCorrectionModalData(null);
      setRejectionReason('');
      if (inspectModalOpen && inspectData?.submission?.id === submissionId) {
        setInspectData({
          ...inspectData,
          submission: {
            ...inspectData.submission,
            status: 'CORRECTION_REQUESTED',
            rejectionReason: reason,
          },
        });
        setInlineCorrectionMode(false);
      }
      await fetchOverview(selectedExamId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request correction');
    } finally {
      setActionProcessing(false);
    }
  };

  // 6. Open Scores Inspection Modal
  const handleOpenInspection = async (submissionId: string) => {
    setInspectModalOpen(true);
    setInspectLoading(true);
    setScoreSearch('');
    setFilterRubric('ALL');
    setFilterPoints('ALL');
    setInlineCorrectionMode(false);
    setInlineReason('');
    try {
      const res = await apiClient.get(`/api/mark-submissions/${submissionId}/scores`);
      setInspectData(res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load marksheet scores');
      setInspectModalOpen(false);
    } finally {
      setInspectLoading(false);
    }
  };

  // 7. Lock Single Marksheet
  const handleLock = async (submissionId: string) => {
    if (actionProcessing) return;
    if (!confirm('Are you sure you want to permanently lock this marksheet? No further edits will be permitted.')) return;
    try {
      setActionProcessing(true);
      setActionTargetId(`lock-${submissionId}`);
      await apiClient.put(`/api/mark-submissions/${submissionId}/lock`);
      toast.success('Marksheet permanently locked');
      if (inspectModalOpen && inspectData?.submission?.id === submissionId) {
        setInspectData({
          ...inspectData,
          submission: { ...inspectData.submission, status: 'LOCKED' },
        });
      }
      await fetchOverview(selectedExamId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to lock marksheet');
    } finally {
      setActionProcessing(false);
      setActionTargetId(null);
    }
  };

  // Summary Metrics across all classes
  const metrics = useMemo(() => {
    const totalClasses = classesOverview.length;
    const fullyApproved = classesOverview.filter((c) => c.overallStatus === 'APPROVED').length;
    const pendingReview = classesOverview.filter((c) => c.overallStatus === 'SUBMITTED').length;
    const inProgress = classesOverview.filter((c) => c.overallStatus === 'PENDING').length;
    const correctionNeeded = classesOverview.filter((c) => c.overallStatus === 'CORRECTION_REQUESTED').length;

    let totalPapers = 0;
    let submittedPapers = 0;
    let approvedPapers = 0;
    classesOverview.forEach((c) => {
      totalPapers += c.totalExpected;
      submittedPapers += c.submittedCount;
      approvedPapers += c.approvedCount;
    });

    return {
      totalClasses,
      fullyApproved,
      pendingReview,
      inProgress,
      correctionNeeded,
      totalPapers,
      submittedPapers,
      approvedPapers,
    };
  }, [classesOverview]);

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return classesOverview.filter((item) => {
      const isSelfContained = isSelfContainedClass(item.class);
      if (tierFilter === 'SELF_CONTAINED' && !isSelfContained) return false;
      if (tierFilter === 'SUBJECT_SPECIALIST' && isSelfContained) return false;

      if (statusFilter !== 'ALL' && item.overallStatus !== statusFilter) return false;

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

  // Filtered Inspection Scores
  const isInspectionJunior = inspectData?.isJunior ?? isJuniorSecondaryClass(inspectData?.class);
  const filteredScores = useMemo(() => {
    if (!inspectData?.scores) return [];
    return inspectData.scores.filter((s: any) => {
      const sName = s.studentName || s.fullName || '';
      const sAdm = s.admissionNumber || s.assessmentNumber || '';
      const matchesSearch =
        sName.toLowerCase().includes(scoreSearch.toLowerCase()) ||
        sAdm.toLowerCase().includes(scoreSearch.toLowerCase());
      if (isInspectionJunior) {
        const pts = s.juniorPoints ?? s.points;
        const matchesPoints = filterPoints === 'ALL' || pts === filterPoints;
        return matchesSearch && matchesPoints;
      } else {
        const rub = s.cbcRubricLevel || s.rubric;
        const matchesRubric = filterRubric === 'ALL' || rub === filterRubric;
        return matchesSearch && matchesRubric;
      }
    });
  }, [inspectData, scoreSearch, filterPoints, filterRubric, isInspectionJunior]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 max-w-7xl mx-auto pb-12"
    >
      {/* 1. Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 dark:border-[#162b4d] shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
            <ClipboardCheck className="w-4 h-4 text-sky-500" />
            Deputy Examination Oversight & Quality Assurance
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Marksheet Review & Approval Workflow
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
            Review class teacher submissions for self-contained classes (PP1–Grade 3) and subject specialist papers (Grades 4–9).
            Inspect student scores, approve marks, or request corrections before final Headteacher locking.
          </p>
        </div>

        {/* Examination Selection Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-sky-50/60 dark:bg-[#0c1f3d] border border-sky-200/80 dark:border-[#163660] rounded-xl sm:rounded-2xl p-2 sm:px-3 sm:py-2 min-w-[280px]">
            <label className="block text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider mb-1">
              Examination Period
            </label>
            <SearchableSelect
              value={selectedExamId}
              onChange={(val) => setSelectedExamId(val)}
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

      {/* 2. Key Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 bg-white/80 dark:bg-[#091326]/80 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Total Classes
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{metrics.totalClasses}</span>
            <span className="text-xs text-slate-400 font-semibold">{metrics.totalPapers} Papers</span>
          </div>
        </div>

        <div className="p-4 bg-white/80 dark:bg-[#091326]/80 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Fully Approved
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.fullyApproved}</span>
            <span className="text-xs text-emerald-600/70 font-semibold">{metrics.approvedPapers} Papers</span>
          </div>
        </div>

        <div className="p-4 bg-white/80 dark:bg-[#091326]/80 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">
            Submitted / Ready
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400">{metrics.pendingReview}</span>
            <span className="text-xs text-sky-600/70 font-semibold">{metrics.submittedPapers} Papers</span>
          </div>
        </div>

        <div className="p-4 bg-white/80 dark:bg-[#091326]/80 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
            In Progress
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{metrics.inProgress}</span>
            <span className="text-xs text-amber-600/70 font-semibold">Incomplete</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-4 bg-white/80 dark:bg-[#091326]/80 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl shadow-glass">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
            Corrections
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{metrics.correctionNeeded}</span>
            <span className="text-xs text-rose-600/70 font-semibold">Needs Resubmission</span>
          </div>
        </div>
      </div>

      {/* 3. Pedagogical Tier Navigation & Search Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 sm:p-4 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md rounded-2xl border border-sky-100 dark:border-[#162b4d] shadow-glass">
        {/* Tier Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setTierFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              tierFilter === 'ALL'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-[#0c1f3d]'
            }`}
          >
            All Classes ({classesOverview.length})
          </button>

          <button
            type="button"
            onClick={() => setTierFilter('SELF_CONTAINED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              tierFilter === 'SELF_CONTAINED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-[#121a36]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            PP1–Grade 3 (Class Teacher)
          </button>

          <button
            type="button"
            onClick={() => setTierFilter('SUBJECT_SPECIALIST')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              tierFilter === 'SUBJECT_SPECIALIST'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-sky-50 dark:hover:bg-[#0c1f3d]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Grades 4–9 (Subject Teachers)
          </button>
        </div>

        {/* Status Filter & Search Input */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-52">
            <SearchableSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'SUBMITTED', label: 'Submitted / Ready' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'PENDING', label: 'In Progress / Pending' },
                { value: 'CORRECTION_REQUESTED', label: 'Correction Requested' },
              ]}
              searchPlaceholder="Filter status..."
            />
          </div>

          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
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
      </div>

      {/* 4. Classes Review Queue List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="p-12 text-center bg-white/70 dark:bg-[#091326]/70 border border-sky-100 dark:border-[#162b4d] rounded-3xl shadow-glass">
          <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No classes match the selected filter</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try switching pedagogical tiers, adjusting status filters, or selecting a different examination period.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClasses.map((item) => {
            const isSelfContained = isSelfContainedClass(item.class);
            const isExpanded = expandedClassIds.has(item.class.id);
            const canBatchApprove = item.submittedCount > 0;
            const isClassActionProcessing = actionProcessing && actionTargetId === `class-${item.class.id}`;

            return (
              <div
                key={item.class.id}
                className="bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-glass overflow-hidden transition-all"
              >
                {/* Class Row Card Header */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Class Info & Tier Badge */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div
                      onClick={() => toggleClassExpansion(item.class.id)}
                      className="cursor-pointer flex items-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-[#0c1f3d] border border-sky-100 dark:border-[#163660] text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-sm group-hover:scale-105 transition-transform shrink-0">
                        {item.class.name.substring(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {item.class.name}
                          </h3>
                          {isSelfContained ? (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-indigo-50 dark:bg-[#151c38] text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
                              Self-Contained (PP1–G3)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-sky-50 dark:bg-[#0c2448] text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900/60">
                              Subject Specialists (G4–G9)
                            </span>
                          )}
                        </div>

                        {/* Class Teacher Identification */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Class Teacher:</span>
                          {item.classTeacher ? (
                            <strong className="text-slate-800 dark:text-slate-200 font-bold">
                              {item.classTeacher.firstName} {item.classTeacher.lastName}
                            </strong>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold italic">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submission Progress & Overall Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 self-stretch lg:self-auto justify-between lg:justify-end">
                    {/* Progress Bar & Paper Counts */}
                    <div className="min-w-[160px]">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-slate-500 dark:text-slate-400">Papers Vetted</span>
                        <span
                          className={
                            item.approvedCount === item.totalExpected
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-200'
                          }
                        >
                          {item.approvedCount} / {item.totalExpected}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-[#0c1830] rounded-full overflow-hidden flex">
                        <div
                          style={{
                            width: `${item.totalExpected ? (item.approvedCount / item.totalExpected) * 100 : 0}%`,
                          }}
                          className="h-full bg-emerald-500 transition-all duration-300"
                        />
                        <div
                          style={{
                            width: `${item.totalExpected ? (item.submittedCount / item.totalExpected) * 100 : 0}%`,
                          }}
                          className="h-full bg-sky-500 transition-all duration-300"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>{item.submittedCount} awaiting review</span>
                        <span>{item.correctionCount} corrections</span>
                      </div>
                    </div>

                    {/* Overall Status Badge */}
                    <div className="shrink-0">
                      {item.overallStatus === 'APPROVED' ? (
                        <span className="px-3 py-1.5 text-xs font-extrabold rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      ) : item.overallStatus === 'SUBMITTED' ? (
                        <span className="px-3 py-1.5 text-xs font-extrabold rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Ready for Review
                        </span>
                      ) : item.overallStatus === 'CORRECTION_REQUESTED' ? (
                        <span className="px-3 py-1.5 text-xs font-extrabold rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" /> Correction Requested
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 text-xs font-extrabold rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> In Progress
                        </span>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2">
                      {canBatchApprove && (
                        <button
                          type="button"
                          onClick={() => handleApproveClass(item.class.id, item.class.name)}
                          disabled={actionProcessing}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Approve all currently submitted papers for this class"
                        >
                          {isClassActionProcessing ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5" />
                          )}
                          <span>{isClassActionProcessing ? 'Approving...' : 'Approve Entire Class'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleClassExpansion(item.class.id)}
                        className="p-2 bg-sky-50 dark:bg-[#0c1f3d] hover:bg-sky-100 dark:hover:bg-[#122b54] text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-[#163660] rounded-xl transition-all cursor-pointer"
                        title={isExpanded ? 'Collapse papers' : 'Expand papers'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Papers Breakdown Section */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-sky-100 dark:border-[#162b4d] bg-sky-50/30 dark:bg-[#081022]/60 p-4 sm:p-5"
                    >
                      {/* Explanatory Tier Guidance Note */}
                      <div className="mb-3.5 p-3 rounded-xl bg-white/70 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                        <div>
                          {isSelfContained ? (
                            <p>
                              <strong>Class Teacher Self-Contained Marking Roster (PP1–Grade 3):</strong> All{' '}
                              {item.totalExpected} learning areas are entered directly by the assigned Class Teacher (
                              {item.classTeacher ? `${item.classTeacher.firstName} ${item.classTeacher.lastName}` : 'Unassigned'}
                              ) using the 4-level descriptive rubric (EE, ME, AE, BE).
                            </p>
                          ) : (
                            <p>
                              <strong>Subject Specialist Examiner Allocation (Grades 4–9):</strong> Individual
                              learning areas are marked by qualified subject teachers allocated by the Director of Studies (DoS).
                              Upon review, the Deputy signs off before final report card locking.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Subject Papers Table */}
                      <div className="overflow-x-auto rounded-xl border border-sky-100 dark:border-[#162b4d]">
                        <table className="w-full text-left text-xs min-w-[620px] bg-white dark:bg-[#091326]">
                          <thead className="bg-sky-50/80 dark:bg-[#0c1f3d] text-sky-900 dark:text-sky-200 font-bold uppercase tracking-wider border-b border-sky-100 dark:border-[#162b4d]">
                            <tr>
                              <th className="py-2.5 px-3">Subject / Paper</th>
                              <th className="py-2.5 px-3">Examiner / Submitted By</th>
                              <th className="py-2.5 px-3 text-center">Paper Status</th>
                              <th className="py-2.5 px-3 text-right">Review Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sky-100/60 dark:divide-[#162b4d]">
                            {item.papers.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                                  No subjects assigned to this class category.
                                </td>
                              </tr>
                            ) : (
                              item.papers.map((paper) => {
                                const isPaperProcessing =
                                  actionProcessing && actionTargetId === `paper-${paper.submissionId}`;

                                return (
                                  <tr
                                    key={paper.subjectId}
                                    className="hover:bg-sky-50/40 dark:hover:bg-[#0c1f3d]/50 transition-colors"
                                  >
                                    <td className="py-3 px-3">
                                      <div className="font-bold text-slate-900 dark:text-slate-100">
                                        {paper.subjectName}
                                      </div>
                                      <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400">
                                        {paper.subjectCode}
                                      </span>
                                    </td>

                                    <td className="py-3 px-3">
                                      {paper.submittedBy ? (
                                        <div>
                                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                                            {paper.submittedBy.firstName} {paper.submittedBy.lastName}
                                          </span>
                                          <span className="text-[10px] text-slate-400 block font-mono">
                                            {paper.submittedBy.email}
                                          </span>
                                        </div>
                                      ) : isSelfContained && item.classTeacher ? (
                                        <div>
                                          <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                                            {item.classTeacher.firstName} {item.classTeacher.lastName} (Class Teacher)
                                          </span>
                                          <span className="text-[10px] text-slate-400 block italic">
                                            Awaiting entry
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic">Not submitted yet</span>
                                      )}
                                    </td>

                                    <td className="py-3 px-3 text-center">
                                      <span
                                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${
                                          paper.status === 'APPROVED'
                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                            : paper.status === 'SUBMITTED'
                                            ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                            : paper.status === 'CORRECTION_REQUESTED'
                                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                            : paper.status === 'LOCKED'
                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-mono'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                                        }`}
                                      >
                                        {paper.status === 'NOT_STARTED' ? 'NOT SUBMITTED' : paper.status}
                                      </span>

                                      {paper.correctionReason && (
                                        <div
                                          className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 max-w-[200px] truncate mx-auto"
                                          title={paper.correctionReason}
                                        >
                                          Note: {paper.correctionReason}
                                        </div>
                                      )}
                                    </td>

                                    <td className="py-3 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                        {/* Inspect Scores Button */}
                                        {paper.submissionId ? (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenInspection(paper.submissionId!)}
                                            className="px-2.5 py-1 bg-sky-50 dark:bg-[#0c1f3d] hover:bg-sky-100 dark:hover:bg-[#122b54] text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-[#163660] font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                            title="Inspect student scores and averages"
                                          >
                                            <Eye className="w-3 h-3" />
                                            <span>Inspect</span>
                                          </button>
                                        ) : (
                                          <span className="text-[11px] text-slate-400 italic pr-2">Pending</span>
                                        )}

                                        {/* Individual Approve Button */}
                                        {paper.submissionId && paper.status === 'SUBMITTED' && (
                                          <button
                                            type="button"
                                            onClick={() => handleApprovePaper(paper.submissionId!)}
                                            disabled={actionProcessing}
                                            className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-lg shadow-glass flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                            title="Approve paper"
                                          >
                                            {isPaperProcessing ? (
                                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                              <CheckCircle2 className="w-3 h-3" />
                                            )}
                                            <span>Approve</span>
                                          </button>
                                        )}

                                        {/* Request Correction Button */}
                                        {paper.submissionId && paper.status !== 'LOCKED' && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCorrectionModalData({
                                                submissionId: paper.submissionId!,
                                                className: item.class.name,
                                                subjectName: paper.subjectName,
                                                teacherName: paper.submittedBy
                                                  ? `${paper.submittedBy.firstName} ${paper.submittedBy.lastName}`
                                                  : 'Class Teacher',
                                              })
                                            }
                                            disabled={actionProcessing}
                                            className="px-2.5 py-1 bg-white dark:bg-[#091326] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                                            title="Request correction from teacher"
                                          >
                                            <RotateCcw className="w-3 h-3" />
                                            <span>Reopen</span>
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Scores Inspection Modal */}
      {inspectModalOpen && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={
            inspectData
              ? `Marksheet Scores: ${inspectData.class?.name} - ${inspectData.subject?.name}`
              : 'Marksheet Scores Inspection'
          }
          maxWidth="max-w-4xl"
        >
          {inspectLoading || !inspectData ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Details Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-sky-50/60 dark:bg-[#0c1f3d] border border-sky-100 dark:border-[#163660] rounded-2xl">
                <div>
                  <div className="flex items-center gap-2 text-xs text-sky-700 dark:text-sky-300 font-bold uppercase tracking-wider mb-1">
                    <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                    {inspectData.examination?.title || inspectData.examination?.name || 'Term Exam'} (Year {inspectData.examination?.academicYear || 2026})
                  </div>
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-100">
                    {inspectData.class?.name} — {inspectData.subject?.name}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Submitted by{' '}
                    <strong className="text-slate-900 dark:text-slate-100">
                      {inspectData.submittedBy?.firstName} {inspectData.submittedBy?.lastName}
                    </strong>{' '}
                    ({inspectData.submittedBy?.email})
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span
                    className={`px-3 py-1 text-xs font-black rounded-full border ${
                      inspectData.submission?.status === 'APPROVED'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : inspectData.submission?.status === 'CORRECTION_REQUESTED'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        : inspectData.submission?.status === 'LOCKED'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-mono'
                        : 'bg-sky-500 text-white border-transparent'
                    }`}
                  >
                    {inspectData.submission?.status}
                  </span>
                </div>
              </div>

              {/* Existing Correction Note Alert if any */}
              {inspectData.submission?.rejectionReason && (
                <div className="p-3 bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-rose-950 dark:text-rose-100 font-bold">
                      Correction Instructions Sent to Teacher:
                    </strong>
                    <span>{inspectData.submission.rejectionReason}</span>
                  </div>
                </div>
              )}

              {/* Key Aggregate Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] rounded-xl shadow-xs text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Class Average
                  </span>
                  <span className="text-xl font-black text-sky-600 dark:text-sky-400 mt-0.5 block">
                    {inspectData.summary?.classAverage}%
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] rounded-xl shadow-xs text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Learners Scored
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5 block">
                    {inspectData.summary?.scoredStudents} / {inspectData.summary?.totalStudents}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] rounded-xl shadow-xs text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Highest Mark
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {inspectData.summary?.highestScore}%
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] rounded-xl shadow-xs text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Lowest Mark
                  </span>
                  <span className="text-xl font-black text-slate-700 dark:text-slate-300 mt-0.5 block">
                    {inspectData.summary?.lowestScore}%
                  </span>
                </div>
              </div>

              {/* Assessment Performance Distribution */}
              {isInspectionJunior ? (
                <div className="p-3.5 bg-sky-50/40 dark:bg-[#0c1f3d]/60 border border-sky-100 dark:border-[#163660] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 block">
                      Junior Secondary Points Distribution (1–8 pts)
                    </span>
                    {filterPoints !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setFilterPoints('ALL')}
                        className="text-[11px] text-sky-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
                    {[
                      { pt: 8, label: '8 pts', range: '90-100%' },
                      { pt: 7, label: '7 pts', range: '75-89%' },
                      { pt: 6, label: '6 pts', range: '58-74%' },
                      { pt: 5, label: '5 pts', range: '41-57%' },
                      { pt: 4, label: '4 pts', range: '31-40%' },
                      { pt: 3, label: '3 pts', range: '21-30%' },
                      { pt: 2, label: '2 pts', range: '11-20%' },
                      { pt: 1, label: '1 pt', range: '0-10%' },
                    ].map((p) => {
                      const count =
                        inspectData.summary?.pointsBreakdown?.[p.pt] ??
                        inspectData.scores?.filter((sc: any) => (sc.juniorPoints ?? sc.points) === p.pt).length ??
                        0;
                      return (
                        <button
                          key={p.pt}
                          type="button"
                          onClick={() => setFilterPoints(filterPoints === p.pt ? 'ALL' : p.pt)}
                          className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                            filterPoints === p.pt
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 border-sky-200 dark:border-[#163660] hover:border-sky-300'
                          }`}
                        >
                          <span className="font-black block text-xs">{p.label}</span>
                          <span className="text-[11px] block font-bold opacity-90">{count} learners</span>
                          <span className="text-[9px] block text-slate-400 mt-0.5">{p.range}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-sky-50/40 dark:bg-[#0c1f3d]/60 border border-sky-100 dark:border-[#163660] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300 block">
                      CBC Rubric Level Distribution
                    </span>
                    {filterRubric !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => setFilterRubric('ALL')}
                        className="text-[11px] text-sky-600 dark:text-sky-400 font-bold hover:underline cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterRubric(filterRubric === 'EE' ? 'ALL' : 'EE')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        filterRubric === 'EE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-300'
                      }`}
                    >
                      <span className="font-extrabold block">EE (Exceeding)</span>
                      <span className="text-[11px] opacity-80 block">
                        {inspectData.summary?.rubricBreakdown?.EE ?? inspectData.summary?.cbcPerformance?.EE ?? 0} learners (75-100%)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterRubric(filterRubric === 'ME' ? 'ALL' : 'ME')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        filterRubric === 'ME'
                          ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                          : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 border-sky-200 dark:border-[#163660] hover:border-sky-300'
                      }`}
                    >
                      <span className="font-extrabold block">ME (Meeting)</span>
                      <span className="text-[11px] opacity-80 block">
                        {inspectData.summary?.rubricBreakdown?.ME ?? inspectData.summary?.cbcPerformance?.ME ?? 0} learners (50-74%)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterRubric(filterRubric === 'AE' ? 'ALL' : 'AE')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        filterRubric === 'AE'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 border-amber-200 dark:border-amber-900/60 hover:border-amber-300'
                      }`}
                    >
                      <span className="font-extrabold block">AE (Approaching)</span>
                      <span className="text-[11px] opacity-80 block">
                        {inspectData.summary?.rubricBreakdown?.AE ?? inspectData.summary?.cbcPerformance?.AE ?? 0} learners (25-49%)
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterRubric(filterRubric === 'BE' ? 'ALL' : 'BE')}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        filterRubric === 'BE'
                          ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                          : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-300 border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                      }`}
                    >
                      <span className="font-extrabold block">BE (Below)</span>
                      <span className="text-[11px] opacity-80 block">
                        {inspectData.summary?.rubricBreakdown?.BE ?? inspectData.summary?.cbcPerformance?.BE ?? 0} learners (0-24%)
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Search Learner Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search student name or admission number..."
                  value={scoreSearch}
                  onChange={(e) => setScoreSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Student Scores Roster Table */}
              <div className="max-h-80 overflow-y-auto border border-sky-100 dark:border-[#162b4d] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sky-50/90 dark:bg-[#0c1f3d] text-sky-900 dark:text-sky-200 font-bold uppercase tracking-wider border-b border-sky-100 dark:border-[#162b4d] sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Adm #</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 text-center">Score</th>
                      <th className="py-2.5 px-3 text-center">Percentage</th>
                      <th className="py-2.5 px-3 text-center">{isInspectionJunior ? 'Points (1–8)' : 'CBC Rubric'}</th>
                      <th className="py-2.5 px-3">Teacher Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-50 dark:divide-[#162b4d] bg-white dark:bg-[#091326]">
                    {filteredScores.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                          No student scores match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredScores.map((s: any) => {
                        const pts = s.juniorPoints ?? s.points;
                        const rub = s.cbcRubricLevel || s.rubric;
                        return (
                          <tr key={s.studentId} className="hover:bg-sky-50/40 dark:hover:bg-[#0c1f3d]/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                              {s.admissionNumber || s.assessmentNumber || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">
                              {s.studentName || s.fullName}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200 font-mono">
                              {s.score ?? s.marksObtained ?? '—'} / {s.maxScore ?? s.maxMarks ?? 100}
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-sky-600 dark:text-sky-400">
                              {s.percentage}%
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isInspectionJunior ? (
                                pts !== null && pts !== undefined ? (
                                  <span
                                    className={`px-2.5 py-0.5 text-xs font-black rounded-full border ${
                                      pts === 8
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                                        : pts === 7
                                        ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300'
                                        : pts === 6
                                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200'
                                        : pts === 5
                                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200'
                                        : pts === 4
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200'
                                        : pts === 3
                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200'
                                        : pts === 2
                                        ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-200'
                                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200'
                                    }`}
                                  >
                                    {pts} pts
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-xs">—</span>
                                )
                              ) : rub ? (
                                <span
                                  className={`px-2.5 py-0.5 text-[10px] font-black rounded-md border ${
                                    rub === 'EE'
                                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200'
                                      : rub === 'ME'
                                      ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200'
                                      : rub === 'AE'
                                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200'
                                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200'
                                  }`}
                                >
                                  {rub}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 italic">
                              {s.teacherRemarks || s.remarks || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Inline Return for Correction Panel */}
              {inlineCorrectionMode && (
                <div className="p-4 bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      Specify Correction Instructions for Teacher
                    </span>
                    <button
                      type="button"
                      onClick={() => setInlineCorrectionMode(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="e.g. Please verify learner admission #ADM-102 score and recalculate question 4..."
                    value={inlineReason}
                    onChange={(e) => setInlineReason(e.target.value)}
                    className="w-full bg-white dark:bg-[#091326] border border-rose-200 dark:border-rose-900/60 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-rose-500 transition-colors"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmCorrectionRequest(inspectData.submission.id, inlineReason)}
                      disabled={actionProcessing || !inlineReason.trim()}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionProcessing && (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      Send Correction Request
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Action Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-sky-100 dark:border-[#162b4d]">
                <button
                  type="button"
                  onClick={() => setInspectModalOpen(false)}
                  className="px-4 py-2 bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#0c1f3d] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Close Inspection
                </button>

                {inspectData.submission?.status !== 'LOCKED' && (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {!inlineCorrectionMode && (
                      <button
                        type="button"
                        onClick={() => setInlineCorrectionMode(true)}
                        className="px-4 py-2 bg-white dark:bg-[#091326] border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Request Correction
                      </button>
                    )}

                    {inspectData.submission?.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() => handleApprovePaper(inspectData.submission.id)}
                        disabled={actionProcessing}
                        className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionProcessing && actionTargetId === `paper-${inspectData.submission.id}` ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {actionProcessing && actionTargetId === `paper-${inspectData.submission.id}`
                            ? 'Approving...'
                            : 'Approve Marksheet'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleLock(inspectData.submission.id)}
                      disabled={actionProcessing}
                      className="px-4 py-2 bg-white dark:bg-[#091326] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionProcessing && actionTargetId === `lock-${inspectData.submission.id}` ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>Lock Permanently</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* 6. Standalone Request Correction Modal */}
      {correctionModalData && (
        <Modal
          isOpen={!!correctionModalData}
          onClose={() => setCorrectionModalData(null)}
          title={`Request Mark Correction: ${correctionModalData.className} - ${correctionModalData.subjectName}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Specify the reason for returning the marksheet to{' '}
              <strong className="text-slate-900 dark:text-slate-100">{correctionModalData.teacherName}</strong> for correction.
              The teacher will be notified and their portal will allow editing and resubmitting this paper.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correction Instructions / Reason *
              </label>
              <textarea
                required
                rows={4}
                placeholder="e.g. Please re-check student assessment numbers and recalculate learner ADM-042 marks..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:border-sky-500 outline-none transition-colors"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-sky-100 dark:border-[#162b4d]">
              <button
                type="button"
                onClick={() => setCorrectionModalData(null)}
                className="px-4 py-2 bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] hover:bg-sky-50 dark:hover:bg-[#0c1f3d] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCorrectionRequest(correctionModalData.submissionId, rejectionReason)}
                disabled={actionProcessing || !rejectionReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionProcessing && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Return for Correction
              </button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};
