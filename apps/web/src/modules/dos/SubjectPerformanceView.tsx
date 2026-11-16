import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  Printer,
  Search,
  ChevronDown,
  Loader2,
  ShieldAlert,
  Target,
  Lock,
  Calendar,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { printElement } from '../../lib/printElement';
import { SubjectPerformanceSkeleton } from './SubjectPerformanceSkeleton';

type QuickFilter = 'ALL' | 'NEEDS_ATTENTION' | 'TOP_PERFORMERS' | 'DROPPED';

export const SubjectPerformanceView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [loadingAllocationId, setLoadingAllocationId] = useState<string | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Analysis payload & filter states
  const [data, setData] = useState<any | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [compareExamId, setCompareExamId] = useState<string>('auto');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Target Mean Modal State
  const [showTargetModal, setShowTargetModal] = useState<boolean>(false);
  const [targetModalExamId, setTargetModalExamId] = useState<string | null>(null);
  const [targetPercentageInput, setTargetPercentageInput] = useState<string>('');
  const [targetNotesInput, setTargetNotesInput] = useState<string>('');
  const [isSavingTarget, setIsSavingTarget] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPerformance = async (
    examId?: string,
    subjectId?: string,
    classId?: string,
    compareId?: string
  ) => {
    // Abort previous in-flight request if any to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setAccessDeniedMessage(null);
      const params = new URLSearchParams();
      if (examId && examId !== 'latest') params.append('examId', examId);
      if (subjectId) params.append('subjectId', subjectId);
      if (classId) params.append('classId', classId);
      if (compareId) params.append('compareExamId', compareId);

      const res = await apiClient.get(`/api/dos/subject-performance?${params.toString()}`, {
        signal: controller.signal,
      });
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
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        return; // Ignore intentionally cancelled requests
      }
      if (error.response?.status === 403) {
        setAccessDeniedMessage(
          error.response?.data?.message ||
            'Access denied: You do not have an active subject teaching allocation.'
        );
      } else {
        toast.error(error.response?.data?.message || 'Failed to load subject performance');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setLoadingAllocationId(null);
      }
    }
  };

  useEffect(() => {
    fetchPerformance(undefined, undefined, undefined, 'auto');
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleExamChange = (examId: string) => {
    if (loading) return;
    setSelectedExamId(examId);
    fetchPerformance(examId, selectedSubjectId || undefined, selectedClassId || undefined, compareExamId);
  };

  const handleCompareChange = (compareId: string) => {
    if (loading) return;
    setCompareExamId(compareId);
    fetchPerformance(selectedExamId || undefined, selectedSubjectId || undefined, selectedClassId || undefined, compareId);
  };

  const handleAllocationSelect = (classId: string, subjectId: string) => {
    if (loading) return;
    if (classId === selectedClassId && subjectId === selectedSubjectId) return;

    setSelectedClassId(classId);
    setSelectedSubjectId(subjectId);
    setLoadingAllocationId(`${classId}:${subjectId}`);
    fetchPerformance(selectedExamId || undefined, subjectId, classId, compareExamId);
  };

  const metrics = data?.subjectMetrics || {};
  const selectedSubject = data?.selectedSubject;
  const selectedClass = data?.selectedClass;
  const userScope = data?.userScope;
  const isJunior = selectedClass?.isJunior ?? false;
  const upcomingExam = data?.nextExam || null;

  // Open Target Mean Modal
  const handleOpenTargetModal = (examId?: string) => {
    if (!data) return;
    const targetExamId = examId || data.nextExam?.id || data.selectedExam?.id;
    setTargetModalExamId(targetExamId);

    const isNext = Boolean(data.nextExam && targetExamId === data.nextExam.id);
    if (isNext) {
      if (data.nextExamTarget?.targetMeanPercentage !== null && data.nextExamTarget?.targetMeanPercentage !== undefined) {
        setTargetPercentageInput(String(data.nextExamTarget.targetMeanPercentage));
        setTargetNotesInput(data.nextExamTarget.notes || '');
      } else {
        // Smart recommendation: current subject average or 65.0
        const defaultTarget = metrics.averageScore
          ? Math.min(100, Math.round(metrics.averageScore + 2))
          : 65;
        setTargetPercentageInput(String(defaultTarget));
        setTargetNotesInput('');
      }
    } else {
      const existing = data.targetMean?.rawTargetPercentage ?? data.targetMean?.targetMeanPercentage;
      setTargetPercentageInput(existing !== null && existing !== undefined ? String(existing) : '');
      setTargetNotesInput(data.targetMean?.notes || '');
    }

    setShowTargetModal(true);
  };

  // Save Target Mean
  const handleSaveTargetMean = async () => {
    if (!selectedClassId || !selectedSubjectId || !targetModalExamId || !data) return;
    const targetVal = parseFloat(targetPercentageInput);
    if (isNaN(targetVal) || targetVal < 0 || targetVal > 100) {
      toast.error('Please enter a valid target mean percentage between 0 and 100');
      return;
    }

    setIsSavingTarget(true);
    try {
      const res = await apiClient.post(
        `/api/dos/subject-performance/${selectedClassId}/${selectedSubjectId}/target-mean`,
        {
          examId: targetModalExamId,
          targetMeanPercentage: targetVal,
          notes: targetNotesInput || undefined,
        }
      );

      if (res.data?.success) {
        const isNext = Boolean(data.nextExam && targetModalExamId === data.nextExam.id);
        toast.success(
          `Subject Target Mean for ${isNext ? data.nextExam.title : data.selectedExam.title} saved successfully!`
        );
        setShowTargetModal(false);

        // Optimistically update subject performance state
        setData((prev: any) => {
          if (!prev) return prev;
          if (isNext) {
            return {
              ...prev,
              nextExamTarget: {
                targetMeanPercentage: targetVal,
                targetMeanPoints: null,
                notes: targetNotesInput || null,
              },
            };
          } else {
            const avg = prev.subjectMetrics?.averageScore ?? 0;
            return {
              ...prev,
              targetMean: {
                ...prev.targetMean,
                targetMeanPercentage: targetVal,
                rawTargetPercentage: targetVal,
                targetMeanPoints: null,
                isMet: avg >= targetVal,
                diffFromTarget: +(avg - targetVal).toFixed(1),
                notes: targetNotesInput || null,
              },
            };
          }
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save subject target mean');
    } finally {
      setIsSavingTarget(false);
    }
  };

  // Active allocation name for header
  const activeAllocInfo = useMemo(() => {
    if (!data?.teacherAllocations) return null;
    return data.teacherAllocations.find(
      (a: any) => a.classId === selectedClassId && a.subjectId === selectedSubjectId
    );
  }, [data?.teacherAllocations, selectedClassId, selectedSubjectId]);

  // Filtered marksheet students
  const filteredMarksheet = useMemo(() => {
    if (!data?.studentsMarksheet) return [];
    let list = data.studentsMarksheet;

    if (quickFilter === 'NEEDS_ATTENTION') {
      list = list.filter((s: any) => {
        if (s.isAbsent || s.isPending) return false;
        if (isJunior) return (s.points ?? 0) <= 4 || (s.marksObtained ?? 0) < 50;
        return (s.marksObtained ?? 0) < 50 || s.rubric === 'BE';
      });
    } else if (quickFilter === 'TOP_PERFORMERS') {
      list = list.filter((s: any) => {
        if (s.isAbsent || s.isPending) return false;
        if (isJunior) return (s.points ?? 0) >= 7 || (s.marksObtained ?? 0) >= 75;
        return (s.marksObtained ?? 0) >= 75 || s.rubric === 'EE';
      });
    } else if (quickFilter === 'DROPPED') {
      list = list.filter((s: any) => !s.isAbsent && !s.isPending && s.deltaMarks !== null && s.deltaMarks <= -3);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (s: any) =>
        s.studentName.toLowerCase().includes(q) ||
        (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
        (s.assessmentNumber && s.assessmentNumber.toLowerCase().includes(q))
    );
  }, [data?.studentsMarksheet, quickFilter, searchQuery, isJunior]);

  // Counts for filter pills
  const counts = useMemo(() => {
    if (!data?.studentsMarksheet) return { all: 0, remedial: 0, top: 0, dropped: 0 };
    const list = data.studentsMarksheet;
    const remedial = list.filter((s: any) => {
      if (s.isAbsent || s.isPending) return false;
      if (isJunior) return (s.points ?? 0) <= 4 || (s.marksObtained ?? 0) < 50;
      return (s.marksObtained ?? 0) < 50 || s.rubric === 'BE';
    }).length;
    const top = list.filter((s: any) => {
      if (s.isAbsent || s.isPending) return false;
      if (isJunior) return (s.points ?? 0) >= 7 || (s.marksObtained ?? 0) >= 75;
      return (s.marksObtained ?? 0) >= 75 || s.rubric === 'EE';
    }).length;
    const dropped = list.filter((s: any) => !s.isAbsent && !s.isPending && s.deltaMarks !== null && s.deltaMarks <= -3).length;
    return { all: list.length, remedial, top, dropped };
  }, [data?.studentsMarksheet, isJunior]);

  // CSV Export for Subject Marksheet
  const handleExportCSV = () => {
    if (!data?.studentsMarksheet || data.studentsMarksheet.length === 0) {
      toast.warning('No student marks available to export');
      return;
    }

    const headers = [
      'Rank',
      'Admission No',
      'Assessment Number',
      'Student Name',
      'Exam Score (%)',
      'vs Prev Exam (%)',
      isJunior ? 'Points Scale' : 'CBC Rubric',
      'Teacher Remarks',
    ];
    const rows = data.studentsMarksheet.map((s: any) => [
      s.rank ?? '—',
      `"${s.admissionNumber || '—'}"`,
      `"${s.assessmentNumber || '—'}"`,
      `"${s.studentName}"`,
      s.marksObtained !== null ? `${s.marksObtained}%` : 'Absent',
      s.deltaMarks !== null ? `${s.deltaMarks > 0 ? '+' : ''}${s.deltaMarks}%` : '—',
      isJunior ? (s.pointsLabel || '—') : (s.rubric ? `${s.rubric} (${s.rubricLabel})` : '—'),
      `"${s.remarks || '—'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e: any[]) => e.join(','))].join('\n');
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

  if (loading && !data) {
    return <SubjectPerformanceSkeleton />;
  }

  if (!loading && accessDeniedMessage && !data) {
    return (
      <div className="w-full px-4 sm:px-5 py-8 max-w-2xl mx-auto space-y-4">
        <div className="bg-white dark:bg-[#0f172a]/80 border border-amber-200 dark:border-amber-900/50 p-6 rounded-2xl text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Subject Performance Access Restricted
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {accessDeniedMessage}
          </p>
          <div className="pt-2">
            <a
              href="/overview"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Return to Overview
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-5 py-3 space-y-3">
      <div id="subject-performance-printable-area" className="space-y-3">
        {/* Step 1: Full-Width Flat Top Header Row (Max Height: ~44px) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
          {/* Left Title, Allocation Pill & Scale Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap flex items-center gap-2">
              <span>Subject Performance</span>
              {loading && (
                <Loader2 className="w-4 h-4 animate-spin text-sky-500 inline-block shrink-0" />
              )}
            </h1>

            {/* Active Allocation Pill */}
            {(activeAllocInfo || (selectedSubject && selectedClass)) && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 whitespace-nowrap">
                <span>{activeAllocInfo?.subjectName || selectedSubject?.name}</span>
                <span className="opacity-60">·</span>
                <span>{activeAllocInfo?.className || selectedClass?.name}</span>
              </span>
            )}

            {/* Curriculum Scale Tag */}
            <span className="text-[10px] text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 whitespace-nowrap">
              {isJunior
                ? 'Junior Secondary · 8-Point Scale'
                : selectedClass?.levelCategory === 'PPE'
                ? 'Pre-Primary · 4-Tier Rubric'
                : selectedClass?.levelCategory === 'LOWER_PRIMARY'
                ? 'Lower Primary · 4-Tier Rubric'
                : 'Upper Primary · 4-Tier Rubric'}
            </span>

            {/* Locked Exam Badge */}
            {data?.selectedExam?.status === 'LOCKED' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                <Lock className="w-3 h-3" />
                <span>Exam Concluded</span>
              </span>
            )}
          </div>

          {/* Right Controls: Exam, Baseline Compare, Export, Print */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Target Mean CTA - Targets upcoming exam */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleOpenTargetModal(upcomingExam ? upcomingExam.id : data?.selectedExam?.id)}
              className={`h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                upcomingExam && data?.nextExamTarget?.targetMeanPercentage !== null && data?.nextExamTarget?.targetMeanPercentage !== undefined
                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20'
                  : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:border-sky-500 hover:text-sky-500 dark:hover:text-sky-400'
              }`}
              title={upcomingExam ? `Set target mean expectation for next exam: ${upcomingExam.title}` : 'Set subject target mean'}
            >
              <Target className="w-3.5 h-3.5 shrink-0" />
              {upcomingExam ? (
                data?.nextExamTarget?.targetMeanPercentage !== null && data?.nextExamTarget?.targetMeanPercentage !== undefined ? (
                  <span>
                    Target Next: <strong>{data.nextExamTarget.targetMeanPercentage}%</strong>
                  </span>
                ) : (
                  <span>+ Set Target (Next Exam)</span>
                )
              ) : data?.targetMean?.targetMeanPercentage !== null && data?.targetMean?.targetMeanPercentage !== undefined && data?.targetMean?.wasSetBeforeExamStarted ? (
                <span>
                  Target: <strong>{data.targetMean.targetMeanPercentage}%</strong>
                </span>
              ) : (
                <span>+ Set Target Mean</span>
              )}
            </button>

            {/* Exam Selector */}
            {data?.examsList && data.examsList.length > 0 && (
              <div className="relative">
                <select
                  disabled={loading}
                  value={selectedExamId}
                  onChange={(e) => handleExamChange(e.target.value)}
                  className={`h-8 text-xs font-medium pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none ${
                    loading ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                  }`}
                >
                  {data.examsList.map((exam: any) => (
                    <option key={exam.id} value={exam.id}>
                      Exam: {exam.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Baseline Compare Selector */}
            {data?.examsList && (
              <div className="relative">
                <select
                  disabled={loading}
                  value={compareExamId}
                  onChange={(e) => handleCompareChange(e.target.value)}
                  className={`h-8 text-xs font-medium pl-2.5 pr-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none ${
                    loading ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                  }`}
                >
                  <option value="auto">
                    vs Baseline: Auto (Preceding Exam)
                  </option>
                  <option value="none">No Baseline</option>
                  {data.examsList
                    .filter((e: any) => e.id !== selectedExamId)
                    .map((exam: any) => (
                      <option key={exam.id} value={exam.id}>
                        vs: {exam.title}
                      </option>
                    ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export Marksheet to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-[#142647] text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print Marksheet"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Step 2: Unified Interactive Grade Switcher & Benchmark Strip (Max Height: ~52px) */}
        {data?.teacherAllocations && data.teacherAllocations.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
            {data.teacherAllocations.map((alloc: any) => {
              const isActive =
                alloc.classId === selectedClassId && alloc.subjectId === selectedSubjectId;
              const isPillLoading =
                loading && (loadingAllocationId === alloc.allocationId || (isActive && loadingAllocationId === null));

              return (
                <button
                  key={alloc.allocationId}
                  type="button"
                  disabled={loading}
                  onClick={() => handleAllocationSelect(alloc.classId, alloc.subjectId)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-all shadow-xs ${
                    loading ? 'cursor-wait' : 'cursor-pointer'
                  } ${
                    isActive
                      ? 'border-sky-500 bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30 font-semibold'
                      : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 font-medium'
                  }`}
                >
                  {isPillLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400 shrink-0" />
                  ) : null}

                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {alloc.className} · {alloc.subjectCode}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span>{alloc.rubricOrPointsLabel}</span>

                  {alloc.deltaScore !== null && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span
                        className={`text-[11px] font-bold inline-flex items-center gap-0.5 ${
                          alloc.deltaScore >= 0
                            ? 'text-emerald-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {alloc.deltaScore >= 0 ? '+' : ''}
                        {alloc.deltaScore}%
                      </span>
                    </>
                  )}

                  {alloc.totalSat > 0 && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="text-[11px] text-slate-400">
                        {alloc.proficiencyRate}% Pass
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 3: Sleek Single-Line Summary & Spread Ribbon (Max Height: ~44px) */}
        {loading ? (
          /* Lazy Loading Skeleton for the Ribbon */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 text-xs shadow-xs animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between px-3">
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800/80 rounded" />
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800/80 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 text-xs shadow-xs">
            {/* Slot 1: Target Mean (Conditions: set before exam started; Met/Missed when marks entered) */}
            <div className="flex items-center justify-between px-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Target Mean
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                {data?.targetMean?.targetMeanPercentage !== null &&
                data?.targetMean?.targetMeanPercentage !== undefined &&
                data?.targetMean?.wasSetBeforeExamStarted ? (
                  <>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono whitespace-nowrap">
                      {isJunior
                        ? `${data.targetMean.targetMeanPoints || '—'} pts`
                        : `${data.targetMean.targetMeanPercentage}%`}
                    </span>
                    {(metrics.totalSat ?? 0) > 0 && data.targetMean.isMet !== null && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          data.targetMean.isMet
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                        }`}
                      >
                        {data.targetMean.isMet ? 'Met' : 'Missed'}
                      </span>
                    )}
                    {(metrics.totalSat ?? 0) > 0 && data.targetMean.diffFromTarget !== null && (
                      <span
                        className={`text-[10px] font-bold ${
                          data.targetMean.diffFromTarget >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {data.targetMean.diffFromTarget >= 0
                          ? `+${data.targetMean.diffFromTarget}%`
                          : `${data.targetMean.diffFromTarget}%`}
                      </span>
                    )}
                  </>
                ) : (
                  <span
                    className="text-slate-400 text-[11px] italic"
                    title="Target was not recorded prior to examination start date"
                  >
                    Not set
                  </span>
                )}
              </div>
            </div>

            {/* Slot 2: Subject Mean & Delta */}
            <div className="flex items-center justify-between px-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Subject Mean
              </span>
              <div className="flex items-center gap-1.5">
                {metrics.averageScore !== null && (metrics.totalSat ?? 0) > 0 ? (
                  <>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {isJunior
                        ? `${metrics.juniorPointsAvg ?? 0} pts`
                        : `${metrics.averageScore}%`}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {isJunior
                        ? metrics.juniorPointsAvg >= 7
                          ? 'EE'
                          : metrics.juniorPointsAvg >= 5
                          ? 'ME'
                          : metrics.juniorPointsAvg >= 3
                          ? 'AE'
                          : 'BE'
                        : metrics.averageScore >= 75
                        ? 'EE'
                        : metrics.averageScore >= 50
                        ? 'ME'
                        : metrics.averageScore >= 40
                        ? 'AE'
                        : 'BE'}
                    </span>
                    {metrics.deltaScore !== null && (
                      <span
                        className={`text-[11px] font-bold ${
                          metrics.deltaScore >= 0 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {metrics.deltaScore >= 0 ? '+' : ''}
                        {metrics.deltaScore}%
                      </span>
                    )}
                  </>
                ) : (
                  <span
                    className="text-slate-400 text-[11px] italic"
                    title="No marks submitted yet for this examination"
                  >
                    Awaiting marks
                  </span>
                )}
              </div>
            </div>

            {/* Slot 3: Candidacy & Submission Status */}
            <div className="flex items-center justify-between px-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Candidacy
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {metrics.totalSat ?? 0}/{metrics.totalEnrolled ?? 0} Sat
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    (metrics.totalSat ?? 0) === 0
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : metrics.submissionStatus === 'SUBMITTED' || metrics.submissionStatus === 'LOCKED'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : metrics.submissionStatus === 'DRAFT'
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  }`}
                >
                  {(metrics.totalSat ?? 0) === 0 ? 'PENDING' : metrics.submissionStatus || 'PENDING'}
                </span>
              </div>
            </div>

            {/* Slot 4: Proficiency Mastery */}
            <div className="flex items-center justify-between px-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Proficiency
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                {(metrics.totalSat ?? 0) > 0 ? (
                  <>
                    <span className="font-bold text-emerald-500">
                      {metrics.proficiencyRate ?? 0}% {isJunior ? '5+ pts' : 'EE/ME'}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-[11px] text-amber-500">
                      {metrics.remedialCount ?? 0} &lt;50%
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400 text-[11px] italic">Awaiting marks</span>
                )}
              </div>
            </div>

            {/* Slot 5: Spread Micro-Bar / CAT Gap */}
            <div className="flex items-center justify-between px-3">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Spread
              </span>
              {(metrics.totalSat ?? 0) > 0 ? (
                <div className="flex items-center gap-2 flex-1 max-w-[130px] ml-2">
                  <div
                    className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden border border-slate-200/60 dark:border-slate-700/60"
                    title={
                      isJunior
                        ? Object.entries(metrics.pointsDistribution || {})
                            .map(([p, c]) => `${p}pts: ${c}`)
                            .join(' | ')
                        : `EE: ${metrics.rubricDistribution?.EE || 0} | ME: ${metrics.rubricDistribution?.ME || 0} | AE: ${metrics.rubricDistribution?.AE || 0} | BE: ${metrics.rubricDistribution?.BE || 0}`
                    }
                  >
                    {isJunior ? (
                      <>
                        <div style={{ width: `${((metrics.pointsDistribution?.[8] || 0) / (metrics.totalSat || 1)) * 100}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${((metrics.pointsDistribution?.[7] || 0) / (metrics.totalSat || 1)) * 100}%` }} className="bg-emerald-400" />
                        <div style={{ width: `${((metrics.pointsDistribution?.[6] || 0) / (metrics.totalSat || 1)) * 100}%` }} className="bg-sky-500" />
                        <div style={{ width: `${((metrics.pointsDistribution?.[5] || 0) / (metrics.totalSat || 1)) * 100}%` }} className="bg-sky-400" />
                        <div style={{ width: `${((metrics.pointsDistribution?.[4] || 0) / (metrics.totalSat || 1)) * 100}%` }} className="bg-amber-400" />
                        <div style={{ width: `${((metrics.pointsDistribution?.[3] || 0) / (metrics.totalSat || 1)) * 100}%` }} className="bg-amber-500" />
                        <div style={{ width: `${((metrics.pointsDistribution?.[2] || 0) / (metrics.totalSat || 1)) * 100}%` }} className="bg-rose-400" />
                        <div style={{ width: `${((metrics.pointsDistribution?.[1] || 0) / (metrics.totalSat || 1)) * 100}%` }} className="bg-rose-500" />
                      </>
                    ) : (
                      <>
                        <div style={{ width: `${metrics.rubricPercentages?.EE || 0}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${metrics.rubricPercentages?.ME || 0}%` }} className="bg-sky-500" />
                        <div style={{ width: `${metrics.rubricPercentages?.AE || 0}%` }} className="bg-amber-500" />
                        <div style={{ width: `${metrics.rubricPercentages?.BE || 0}%` }} className="bg-rose-500" />
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {metrics.totalSat}
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 text-[11px] italic">Awaiting marks</span>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Single-Row Controls Bar (Max Height: ~36px) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setQuickFilter('ALL')}
              className={`h-7 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                quickFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Learners ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('NEEDS_ATTENTION')}
              className={`h-7 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                quickFilter === 'NEEDS_ATTENTION'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Needs Attention ({counts.remedial})
            </button>
            <button
              type="button"
              onClick={() => setQuickFilter('TOP_PERFORMERS')}
              className={`h-7 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                quickFilter === 'TOP_PERFORMERS'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Top Performers ({counts.top})
            </button>
            {counts.dropped > 0 && (
              <button
                type="button"
                onClick={() => setQuickFilter('DROPPED')}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  quickFilter === 'DROPPED'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Dropped vs Prev ({counts.dropped})
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search learner or Adm No..."
              className="h-8 w-56 pl-8 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a]/70 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Step 5: High-Density Subject Marksheet Table */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3 w-16 text-center">Rank</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Learner</th>
                  <th className="py-2.5 px-3 text-center">Exam Score</th>
                  <th className="py-2.5 px-3 text-center">vs Prev</th>
                  <th className="py-2.5 px-3">CBC Rating</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Teacher Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  /* Lazy Loading Skeleton Rows for the Table */
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-2.5 px-3 text-center">
                        <div className="h-4 w-6 mx-auto bg-slate-200 dark:bg-slate-800/80 rounded" />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800/80 rounded" />
                          <div className="h-2.5 w-20 bg-slate-200 dark:bg-slate-800/80 rounded" />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="h-4 w-12 mx-auto bg-slate-200 dark:bg-slate-800/80 rounded" />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="h-3.5 w-10 mx-auto bg-slate-200 dark:bg-slate-800/80 rounded" />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800/80 rounded" />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="h-3.5 w-40 bg-slate-200 dark:bg-slate-800/80 rounded" />
                      </td>
                    </tr>
                  ))
                ) : filteredMarksheet.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-slate-400 text-xs italic"
                    >
                      No learners match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMarksheet.map((student: any) => {
                    const isRemedial =
                      !student.isAbsent &&
                      (isJunior
                        ? (student.points ?? 0) <= 4 || (student.marksObtained ?? 0) < 50
                        : (student.marksObtained ?? 0) < 50 || student.rubric === 'BE');

                    return (
                      <tr
                        key={student.studentId}
                        className={`hover:bg-slate-50/60 dark:hover:bg-[#14223d]/40 transition-colors ${
                          isRemedial ? 'bg-amber-500/[0.02]' : ''
                        }`}
                      >
                        {/* 1. Rank & Movement */}
                        <td className="py-2 px-3 text-center font-mono whitespace-nowrap">
                          {student.isPending || student.isAbsent ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="inline-flex items-center justify-center gap-1 font-bold text-slate-900 dark:text-slate-100">
                              <span>#{student.rank}</span>
                              {student.deltaRank !== null && student.deltaRank !== 0 && (
                                <span
                                  className={`text-[10px] inline-flex items-center ${
                                    student.deltaRank > 0
                                      ? 'text-emerald-500'
                                      : 'text-rose-500'
                                  }`}
                                  title={`Rank movement: ${student.deltaRank > 0 ? '+' : ''}${student.deltaRank} places`}
                                >
                                  {student.deltaRank > 0 ? (
                                    <>▲{student.deltaRank}</>
                                  ) : (
                                    <>▼{Math.abs(student.deltaRank)}</>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 2. Learner Name & Adm No */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {student.studentName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Adm: {student.admissionNumber || '—'}
                          </div>
                        </td>

                        {/* 3. Exam Score */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {student.isPending ? (
                            <span
                              className="border border-dashed border-slate-300 dark:border-slate-700 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono"
                              title="Awaiting marks entry"
                            >
                              —
                            </span>
                          ) : student.isAbsent ? (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium">
                              Absent
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {student.marksObtained}%
                            </span>
                          )}
                        </td>

                        {/* 5. vs Previous Exam Delta */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {!student.isPending && !student.isAbsent && student.deltaMarks !== null ? (
                            <span
                              className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                student.deltaMarks > 0
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : student.deltaMarks < 0
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : 'text-slate-400'
                              }`}
                            >
                              {student.deltaMarks > 0 ? '+' : ''}
                              {student.deltaMarks}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 6. CBC Rating (Merged Column) */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {student.isPending || student.isAbsent ? (
                            <span className="text-slate-400">—</span>
                          ) : isJunior ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                {student.points} pts
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {student.pointsLabel?.split('·')[1]?.trim() || ''}
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  student.rubric === 'EE'
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                    : student.rubric === 'ME'
                                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                    : student.rubric === 'AE'
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                }`}
                              >
                                {student.rubric}
                              </span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {student.rubricLabel}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 6. Teacher Remarks */}
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                          {student.isPending ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div
                              className="max-w-xs truncate"
                              title={student.remarks || 'No remarks recorded'}
                            >
                              {student.remarks || '—'}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Step 6: Subject Target Mean Modal */}
      {showTargetModal && (() => {
        const isNext = Boolean(data?.nextExam && targetModalExamId === data.nextExam.id);
        const modalExam = isNext ? data.nextExam! : data?.selectedExam;
        const isExamStarted = Boolean(modalExam?.hasStarted);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-sky-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Subject Target Mean Expectation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Exam Switcher Tab if both nextExam and selectedExam exist */}
              {data?.nextExam && (
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => handleOpenTargetModal(data.nextExam!.id)}
                    className={`flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer ${
                      isNext
                        ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Next ({data.nextExam.title.replace(' Examination', '')})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenTargetModal(data.selectedExam.id)}
                    className={`flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer ${
                      !isNext
                        ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Current ({data.selectedExam.title.replace(' Examination', '')})
                  </button>
                </div>
              )}

              {/* Status Banner */}
              {isExamStarted ? (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-bold">Examination Has Started (Locked)</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      This examination ({modalExam?.title}) started on {modalExam?.startDate || 'an earlier date'}. Target mean expectations can only be set or modified before an examination commences.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs">
                  <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    Setting target for upcoming: <strong>{modalExam?.title}</strong>{' '}
                    {modalExam?.startDate ? `(Starts ${modalExam.startDate})` : ''}
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target benchmark percentage for <strong className="text-slate-800 dark:text-slate-200">{data?.selectedSubject?.name}</strong> in <strong className="text-slate-800 dark:text-slate-200">{data?.selectedClass?.name}</strong> to gauge whether your learners meet CBC academic milestones.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Target Mean Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    disabled={isExamStarted}
                    value={targetPercentageInput}
                    onChange={(e) => setTargetPercentageInput(e.target.value)}
                    placeholder="e.g. 68.0"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b1120] text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Quick Preset Chips (only when editable) */}
                {!isExamStarted && (
                  <div className="flex flex-wrap gap-1.5">
                    {[60, 65, 70, 75].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTargetPercentageInput(String(preset))}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/60 dark:hover:text-sky-400 transition-colors cursor-pointer"
                      >
                        {preset}% ({preset >= 75 ? 'EE' : 'ME'})
                      </button>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Target Notes / Strategy (Optional)
                  </label>
                  <textarea
                    rows={2}
                    disabled={isExamStarted}
                    value={targetNotesInput}
                    onChange={(e) => setTargetNotesInput(e.target.value)}
                    placeholder="e.g. Focus on improving learner performance in composition and reading fluency..."
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b1120] text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-hidden resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {isExamStarted ? 'Close' : 'Cancel'}
                </button>
                {!isExamStarted && (
                  <button
                    type="button"
                    onClick={handleSaveTargetMean}
                    disabled={isSavingTarget}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingTarget ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Save Target</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
