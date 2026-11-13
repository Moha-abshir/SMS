import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  BookOpen,
  Search,
  Filter,
  AlertTriangle,
  TrendingDown,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { ClassWorkspaceRibbon } from './components/ClassWorkspaceRibbon';
import { ClassStudentBroadsheet } from './components/ClassStudentBroadsheet';
import { ClassSubjectAnalysis } from './components/ClassSubjectAnalysis';
import { Learner360Drawer } from './components/Learner360Drawer';
import { ClassWorkspaceSkeleton } from './components/ClassWorkspaceSkeleton';

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

  // Filter learners for Broadsheet view
  const filteredLearners = useMemo(() => {
    if (!workspace?.learners) return [];
    let list = workspace.learners;

    // Apply quick filters
    if (quickFilter === 'remedial') {
      list = list.filter((l: any) => {
        if (workspace.classInfo.isJuniorSecondary) {
          if (l.points <= 2) return true;
        } else {
          if (l.overallRubricOrPoints === 'BE') return true;
        }
        // Count subjects in BE
        let beSubjectCount = 0;
        for (const sub of Object.values(l.scoresBySubject as Record<string, any>)) {
          if (sub.isBelowExpectations) beSubjectCount++;
        }
        return beSubjectCount >= 2;
      });
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
      l.rank,
      l.admissionNo,
      `"${l.fullName}"`,
      l.gender || '—',
      ...subjects.map((s: any) => l.scoresBySubject[s.subjectId]?.marks ?? '—'),
      l.totalMarks,
      l.maxMarks,
      l.meanPct,
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
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          No Class Workspace Available
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You may not be currently assigned as a Class Teacher, or no examination records exist for this grade.
        </p>
      </div>
    );
  }

  const isLeadership = ['HEAD_TEACHER', 'DOS', 'DEPUTY_HEAD', 'DEPUTY_HEAD_TEACHER', 'ADMIN'].includes(currentUserRole);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 animate-in fade-in duration-200">
      
      {/* 1. Header & Minimalist Operational Ribbon */}
      <ClassWorkspaceRibbon
        classInfo={workspace.classInfo}
        academicSummary={workspace.academicSummary}
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
        deltaLoading={deltaLoading}
      />

      {/* 2. Segmented Workspace Bar & Quick Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        
        {/* Left: View Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('broadsheet')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'broadsheet'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Student Broadsheet ({workspace.learners.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Learning Area & CAT Analysis ({workspace.subjects.length})</span>
          </button>
        </div>

        {/* Right: Smart Quick-Filter Pills & Search (Visible on Broadsheet tab) */}
        {activeTab === 'broadsheet' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setQuickFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  quickFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs dark:bg-[#111827] dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                All ({workspace.learners.length})
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('remedial')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  quickFilter === 'remedial'
                    ? 'bg-rose-50 text-rose-700 shadow-2xs dark:bg-rose-950/80 dark:text-rose-300 font-extrabold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Remedial / BE ({workspace.academicSummary.beLearnerCount})
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('drops')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  quickFilter === 'drops'
                    ? 'bg-amber-50 text-amber-700 shadow-2xs dark:bg-amber-950/80 dark:text-amber-300 font-extrabold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Sharp Drops ({workspace.trajectoryCounts.droppedCount})
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('incomplete')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  quickFilter === 'incomplete'
                    ? 'bg-sky-50 text-sky-700 shadow-2xs dark:bg-sky-950/80 dark:text-sky-300 font-extrabold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Incomplete Marks
              </button>
            </div>

            {/* Compact Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search learner or Adm No..."
                className="w-48 sm:w-56 pl-7 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500 shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
          onFilterStrugglingSubject={(subjectId) => {
            setActiveTab('broadsheet');
            setQuickFilter('all');
            // We can set sort to this subject if desired
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
        onSelectStudent={(newStudentId) => setSelectedDrawerStudentId(newStudentId)}
        onRemarkSaved={(savedStudentId, remark) => {
          // Optimistically update remarks count in workspace summary
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

    </div>
  );
};
export default ClassPerformanceView;
