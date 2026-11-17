import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  BookOpen,
  Search,
  AlertTriangle,
  Target,
  Loader2,
  X,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { ClassWorkspaceRibbon } from './components/ClassWorkspaceRibbon';
import { ClassStudentBroadsheet } from './components/ClassStudentBroadsheet';
import { ClassSubjectAnalysis } from './components/ClassSubjectAnalysis';
import { Learner360Drawer } from './components/Learner360Drawer';
import { ClassWorkspaceSkeleton } from './components/ClassWorkspaceSkeleton';
import { isNationalExamClass } from '@school/shared/types';

export const ClassPerformanceView: React.FC = () => {
  const { classId: routeClassId } = useParams<{ classId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState<boolean>(true);
  const [deltaLoading, setDeltaLoading] = useState<boolean>(false);
  const [workspace, setWorkspace] = useState<any>(null);

  const [selectedClassId, setSelectedClassId] = useState<string>(routeClassId || '');
  const [selectedExamId, setSelectedExamId] = useState<string>(searchParams.get('examId') || '');
  const [compareExamId, setCompareExamId] = useState<string>(searchParams.get('compareExamId') || 'auto');

  const [activeTab, setActiveTab] = useState<'broadsheet' | 'subjects'>('broadsheet');
  const [quickFilter, setQuickFilter] = useState<'all' | 'remedial' | 'drops' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedDrawerStudentId, setSelectedDrawerStudentId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  // Target Mean Modal State
  const [showTargetModal, setShowTargetModal] = useState<boolean>(false);
  const [targetModalExamId, setTargetModalExamId] = useState<string | null>(null);
  const [targetPercentageInput, setTargetPercentageInput] = useState<string>('');
  const [targetNotesInput, setTargetNotesInput] = useState<string>('');
  const [isSavingTarget, setIsSavingTarget] = useState<boolean>(false);

  // 1. Initial resolution of user's role and class assignment
  useEffect(() => {
    const resolveInitialClass = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          setCurrentUserRole(u.roleName || u.role || 'TEACHER');
        }

        if (routeClassId) {
          setSelectedClassId(routeClassId);
          return;
        }

        // Try getting assigned class from teacher workstation
        const res = await apiClient.get('/api/teacher/workstation');
        const ws = res.data?.data || res.data;
        if (ws?.classTeacher?.classId) {
          setSelectedClassId(ws.classTeacher.classId);
        } else {
          // If no assigned class (e.g. Leadership), fetch classes to pick first
          const classesRes = await apiClient.get('/api/admissions/classes');
          const clsList = classesRes.data?.data || classesRes.data || [];
          if (clsList.length > 0) {
            setSelectedClassId(clsList[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not resolve initial class assignment:', err);
      }
    };

    resolveInitialClass();
  }, [routeClassId]);

  // 2. Fetch workspace data
  const fetchWorkspace = useCallback(async (isDeltaOnly: boolean = false) => {
    if (!selectedClassId) return;

    if (isDeltaOnly) {
      setDeltaLoading(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await apiClient.get(`/api/examinations/class-workspace/${selectedClassId}`, {
        params: {
          examId: selectedExamId || undefined,
          compareExamId: compareExamId || undefined,
        },
      });

      if (res.data?.success && res.data?.data) {
        setWorkspace(res.data.data);
        if (!selectedExamId && res.data.data.selectedExam?.id) {
          setSelectedExamId(res.data.data.selectedExam.id);
        }
        if (res.data.data.targetMean?.targetMeanPercentage !== null && res.data.data.targetMean?.targetMeanPercentage !== undefined) {
          setTargetPercentageInput(String(res.data.data.targetMean.targetMeanPercentage));
          setTargetNotesInput(res.data.data.targetMean.notes || '');
        } else {
          setTargetPercentageInput('');
          setTargetNotesInput('');
        }
      }
    } catch (err: any) {
      console.error('Failed to load class workspace:', err);
      toast.error(err.response?.data?.message || 'Failed to load class performance workspace');
    } finally {
      setLoading(false);
      setDeltaLoading(false);
    }
  }, [selectedClassId, selectedExamId, compareExamId]);

  useEffect(() => {
    if (selectedClassId) {
      fetchWorkspace();
    }
  }, [selectedClassId, selectedExamId, fetchWorkspace]);

  // Handle baseline comparison switch
  const handleSelectCompareExam = (newCompareId: string) => {
    setCompareExamId(newCompareId);
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      n.set('compareExamId', newCompareId);
      return n;
    });
    // Trigger lightweight fetch
    setTimeout(() => {
      fetchWorkspace(true);
    }, 10);
  };

  const handleSelectExam = (newExamId: string) => {
    setSelectedExamId(newExamId);
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      n.set('examId', newExamId);
      return n;
    });
  };

  const handleSelectClass = (newClassId: string) => {
    setSelectedClassId(newClassId);
  };

  // Open Target Mean Modal
  const handleOpenTargetModal = (examId?: string) => {
    if (!workspace) return;
    const targetExamId = examId || workspace.nextExam?.id || workspace.selectedExam.id;
    setTargetModalExamId(targetExamId);

    const isNext = Boolean(workspace.nextExam && targetExamId === workspace.nextExam.id);
    if (isNext) {
      if (workspace.nextExamTarget?.targetMeanPercentage !== null && workspace.nextExamTarget?.targetMeanPercentage !== undefined) {
        setTargetPercentageInput(String(workspace.nextExamTarget.targetMeanPercentage));
        setTargetNotesInput(workspace.nextExamTarget.notes || '');
      } else {
        // Smart recommendation: current class mean rounded or 65.0, never blank!
        const defaultTarget = workspace.academicSummary?.meanPct
          ? Math.min(100, Math.round(workspace.academicSummary.meanPct + 2))
          : 65;
        setTargetPercentageInput(String(defaultTarget));
        setTargetNotesInput('');
      }
    } else {
      const existing = workspace.targetMean?.rawTargetPercentage ?? workspace.targetMean?.targetMeanPercentage;
      setTargetPercentageInput(existing !== null && existing !== undefined ? String(existing) : '');
      setTargetNotesInput(workspace.targetMean?.notes || '');
    }

    setShowTargetModal(true);
  };

  // Save Target Mean
  const handleSaveTargetMean = async () => {
    if (!selectedClassId || !targetModalExamId || !workspace) return;
    const targetVal = parseFloat(targetPercentageInput);
    if (isNaN(targetVal) || targetVal < 0 || targetVal > 100) {
      toast.error('Please enter a valid target mean percentage between 0 and 100');
      return;
    }

    setIsSavingTarget(true);
    try {
      const res = await apiClient.post(`/api/examinations/class-workspace/${selectedClassId}/target-mean`, {
        examId: targetModalExamId,
        targetMeanPercentage: targetVal,
        notes: targetNotesInput || undefined,
      });

      if (res.data?.success) {
        const isNext = Boolean(workspace.nextExam && targetModalExamId === workspace.nextExam.id);
        toast.success(`Class Target Mean for ${isNext ? workspace.nextExam.title : workspace.selectedExam.title} saved successfully!`);
        setShowTargetModal(false);

        // Optimistically update workspace state
        setWorkspace((prev: any) => {
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
            const classMean = prev.academicSummary?.meanPct ?? 0;
            return {
              ...prev,
              targetMean: {
                ...prev.targetMean,
                targetMeanPercentage: targetVal,
                rawTargetPercentage: targetVal,
                targetMeanPoints: null,
                isMet: classMean >= targetVal,
                diffFromTarget: +(classMean - targetVal).toFixed(1),
                notes: targetNotesInput || null,
              },
            };
          }
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save class target mean');
    } finally {
      setIsSavingTarget(false);
    }
  };

  // Helper to determine if a learner needs remedial support
  const isRemedialLearner = (l: any, isJunior: boolean) => {
    if (l.meanPct === null || l.totalMarks === 0) return false;
    if (isJunior) {
      if (l.points <= 2) return true;
    } else {
      if (l.overallRubricOrPoints === 'BE') return true;
    }
    let beSubjectCount = 0;
    for (const sub of Object.values((l.scoresBySubject as Record<string, any>) || {})) {
      if (sub?.isBelowExpectations) beSubjectCount++;
    }
    return beSubjectCount >= 2;
  };

  const remedialCount = useMemo(() => {
    if (!workspace?.learners) return 0;
    return workspace.learners.filter((l: any) =>
      isRemedialLearner(l, Boolean(workspace.classInfo?.isJuniorSecondary))
    ).length;
  }, [workspace?.learners, workspace?.classInfo?.isJuniorSecondary]);

  const incompleteCount = useMemo(() => {
    if (!workspace?.learners) return 0;
    return workspace.learners.filter((l: any) => l.missingSubjectsCount > 0).length;
  }, [workspace?.learners]);

  const hasPriorExam = Boolean(
    compareExamId !== 'none' &&
    workspace?.academicSummary?.deltaPct !== null &&
    (workspace?.trajectoryCounts?.improvedCount > 0 ||
      workspace?.trajectoryCounts?.stableCount > 0 ||
      workspace?.trajectoryCounts?.droppedCount > 0)
  );

  const showDropsPill = hasPriorExam && (workspace?.trajectoryCounts?.droppedCount ?? 0) > 0;
  const showIncompletePill = incompleteCount > 0;

  // Filter learners for Broadsheet view
  const filteredLearners = useMemo(() => {
    if (!workspace?.learners) return [];
    let list = workspace.learners;

    // Apply quick filters
    if (quickFilter === 'remedial') {
      list = list.filter((l: any) =>
        isRemedialLearner(l, Boolean(workspace.classInfo?.isJuniorSecondary))
      );
    } else if (quickFilter === 'drops') {
      list = list.filter((l: any) => {
        if (workspace.classInfo.isJuniorSecondary) {
          return l.deltaPoints !== null && l.deltaPoints <= -1.0;
        }
        return l.deltaPct !== null && l.deltaPct <= -5.0;
      });
    } else if (quickFilter === 'incomplete') {
      list = list.filter((l: any) => l.missingSubjectsCount > 0);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (l: any) =>
          l.fullName.toLowerCase().includes(q) ||
          l.admissionNo.toLowerCase().includes(q)
      );
    }

    return list;
  }, [workspace?.learners, workspace?.classInfo?.isJuniorSecondary, quickFilter, searchQuery]);

  // Export Broadsheet CSV
  const handleExportCsv = () => {
    if (!workspace) return;
    const { classInfo, selectedExam, subjects, learners } = workspace;

    const headers = [
      'Rank',
      'Admission No',
      'Learner Name',
      'Gender',
      ...subjects.map((s: any) => `${s.subjectCode || s.subjectName} (%)`),
      'Total Marks',
      'Max Marks',
      'Mean (%)',
      classInfo.isJuniorSecondary ? 'Points Scale' : 'CBC Rubric',
      'vs Prev Exam (%)',
      'Weakest Subject',
    ];

    const rows = learners.map((l: any) => [
      l.rank !== null ? l.rank : '—',
      l.admissionNo,
      `"${l.fullName}"`,
      l.gender || '—',
      ...subjects.map((s: any) => l.scoresBySubject[s.subjectId]?.marks ?? '—'),
      l.totalMarks,
      l.maxMarks,
      l.meanPct !== null ? l.meanPct : '—',
      `"${l.overallRubricOrPoints}"`,
      l.deltaPct !== null ? `${l.deltaPct}%` : '—',
      `"${l.personalBottleneckSubject ? l.personalBottleneckSubject.name : '—'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${classInfo.name}_Broadsheet_${selectedExam.title.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Broadsheet CSV exported successfully!');
  };

  // Print Broadsheet
  const handlePrint = () => {
    window.print();
  };

  if (loading && !workspace) {
    return <ClassWorkspaceSkeleton />;
  }

  if (!workspace) {
    return (
      <div className="w-full px-5 py-8 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
          No Class Workspace Available
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          You may not be currently assigned as a Class Teacher, or no examination records exist for this grade.
        </p>
      </div>
    );
  }

  const isLeadership = ['HEAD_TEACHER', 'DOS', 'DEPUTY_HEAD', 'DEPUTY_HEAD_TEACHER', 'ADMIN'].includes(currentUserRole);

  return (
    <div className="w-full px-4 sm:px-5 py-3 space-y-3 animate-in fade-in duration-150">
      
      {/* 1. Flat Header Bar & Minimalist 5-Slot Ticker Ribbon */}
      <ClassWorkspaceRibbon
        classInfo={workspace.classInfo}
        academicSummary={workspace.academicSummary}
        targetMean={workspace.targetMean}
        selectedExam={workspace.selectedExam}
        nextExam={workspace.nextExam}
        nextExamTarget={workspace.nextExamTarget}
        submissionStatus={workspace.submissionStatus}
        trajectoryCounts={workspace.trajectoryCounts}
        reportLockStatus={workspace.reportLockStatus}
        availableExams={workspace.availableExams}
        selectedExamId={selectedExamId}
        onSelectExam={handleSelectExam}
        availableClasses={workspace.availableClasses}
        selectedClassId={selectedClassId}
        onSelectClass={handleSelectClass}
        isLeadership={isLeadership}
        compareExamId={compareExamId}
        onSelectCompareExam={handleSelectCompareExam}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        onFilterRemedial={() => {
          setActiveTab('broadsheet');
          setQuickFilter('remedial');
        }}
        onOpenTargetModal={handleOpenTargetModal}
        deltaLoading={deltaLoading}
      />

      {/* 2. Sleek Single-Row Control Bar (Max Height: 36px) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: View Switcher */}
        <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shrink-0 h-8">
          <button
            type="button"
            onClick={() => setActiveTab('broadsheet')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'broadsheet'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-[#111827] dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Broadsheet ({workspace.learners.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-[#111827] dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              {isNationalExamClass(workspace?.classInfo)
                ? `Subject & CAT Analysis (${workspace?.subjects?.length || 0})`
                : `Subject Analysis (${workspace?.subjects?.length || 0})`}
            </span>
          </button>
        </div>

        {/* Right: Smart Quick-Filter Pills & Search on ONE Row */}
        {activeTab === 'broadsheet' && (
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] font-semibold h-7">
              <button
                type="button"
                onClick={() => setQuickFilter('all')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  quickFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-[#111827] dark:text-slate-100 font-bold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                All ({workspace.learners.length})
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('remedial')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  quickFilter === 'remedial'
                    ? 'bg-rose-50 text-rose-700 shadow-2xs dark:bg-rose-950/80 dark:text-rose-300 font-bold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Remedial ({remedialCount})
              </button>

              {showDropsPill && (
                <button
                  type="button"
                  onClick={() => setQuickFilter('drops')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    quickFilter === 'drops'
                      ? 'bg-amber-50 text-amber-700 shadow-2xs dark:bg-amber-950/80 dark:text-amber-300 font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Drops ({workspace.trajectoryCounts.droppedCount})
                </button>
              )}

              {showIncompletePill && (
                <button
                  type="button"
                  onClick={() => setQuickFilter('incomplete')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    quickFilter === 'incomplete'
                      ? 'bg-sky-50 text-sky-700 shadow-2xs dark:bg-sky-950/80 dark:text-sky-300 font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Incomplete ({incompleteCount})
                </button>
              )}
            </div>

            {/* Compact Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search learner or Adm No..."
                className="h-8 w-44 sm:w-48 pl-7 pr-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

      </div>

      {/* 3. Main Workspace View */}
      {activeTab === 'broadsheet' ? (
        <ClassStudentBroadsheet
          learners={filteredLearners}
          subjects={workspace.subjects}
          isJuniorSecondary={workspace.classInfo.isJuniorSecondary}
          onInspectLearner={(studentId) => setSelectedDrawerStudentId(studentId)}
          deltaLoading={deltaLoading}
        />
      ) : (
        <ClassSubjectAnalysis
          subjects={workspace.subjects}
          isJuniorSecondary={workspace.classInfo.isJuniorSecondary}
          classId={selectedClassId}
          className={workspace.classInfo.name}
          levelCategory={workspace.classInfo.levelCategory}
          numericOrder={workspace.classInfo.numericOrder}
          onFilterStrugglingSubject={(subjectId) => {
            setActiveTab('broadsheet');
            setQuickFilter('all');
          }}
          deltaLoading={deltaLoading}
        />
      )}

      {/* 4. Slide-Over Learner 360° Drawer */}
      <Learner360Drawer
        isOpen={selectedDrawerStudentId !== null}
        onClose={() => setSelectedDrawerStudentId(null)}
        classId={selectedClassId}
        studentId={selectedDrawerStudentId}
        examId={selectedExamId}
        allLearners={filteredLearners}
        classInfo={workspace.classInfo}
        onSelectStudent={(newStudentId) => setSelectedDrawerStudentId(newStudentId)}
        onRemarkSaved={(savedStudentId, remark) => {
          setWorkspace((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              reportLockStatus: {
                ...prev.reportLockStatus,
                remarksCompletedCount: Math.min(
                  prev.reportLockStatus.totalLearnersCount,
                  prev.reportLockStatus.remarksCompletedCount + 1
                ),
              },
            };
          });
        }}
      />

      {/* 5. Target Mean Expectation Modal */}
      {showTargetModal && (() => {
        const isNext = Boolean(workspace.nextExam && targetModalExamId === workspace.nextExam.id);
        const modalExam = isNext ? workspace.nextExam! : workspace.selectedExam;
        const isExamStarted = Boolean(modalExam?.hasStarted);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-sky-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Class Target Mean Expectation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTargetModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Exam Switcher Tab if both nextExam and selectedExam exist */}
              {workspace.nextExam && (
                <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => handleOpenTargetModal(workspace.nextExam!.id)}
                    className={`flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer ${
                      isNext
                        ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Next ({workspace.nextExam.title.replace(' Examination', '')})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenTargetModal(workspace.selectedExam.id)}
                    className={`flex-1 py-1 px-2 rounded-md transition-all text-center cursor-pointer ${
                      !isNext
                        ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Current ({workspace.selectedExam.title.replace(' Examination', '')})
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
                      This examination ({modalExam.title}) started on {modalExam.startDate || 'an earlier date'}. Target mean expectations can only be set or modified before an examination commences.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs">
                  <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    Setting target for upcoming: <strong>{modalExam.title}</strong>{' '}
                    {modalExam.startDate ? `(Starts ${modalExam.startDate})` : ''}
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Target benchmark percentage for <strong className="text-slate-800 dark:text-slate-200">{workspace.classInfo.name}</strong> to gauge whether your class meets CBC academic milestones.
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
                    placeholder="e.g. Focus on improving remedial support in Mathematics and Arabic..."
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
                    {isSavingTarget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
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
export default ClassPerformanceView;
