import React, { useState, useEffect } from 'react';
import {
  Award,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { SchoolwideSummaryRibbon, SummaryRibbonData } from './components/SchoolwideSummaryRibbon';
import { GradePerformanceMatrix, GradeRowData } from './components/GradePerformanceMatrix';
import { GradeDrilldownDrawer } from './components/GradeDrilldownDrawer';

export const SchoolResultsView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [deltaLoading, setDeltaLoading] = useState<boolean>(false);

  // Exam Selection & Baseline Selection
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [compareExamId, setCompareExamId] = useState<string>('auto');

  // Level Filter Pills: ALL | PRIMARY | JUNIOR
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'PRIMARY' | 'JUNIOR'>('ALL');

  // Drawer state
  const [selectedDrawerClassId, setSelectedDrawerClassId] = useState<string | null>(null);

  // Data state
  const [availableExams, setAvailableExams] = useState<
    Array<{ id: string; title: string; termNumber: number; year: number; label: string }>
  >([]);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [compareExam, setCompareExam] = useState<any | null>(null);
  const [summaryRibbon, setSummaryRibbon] = useState<SummaryRibbonData | null>(null);
  const [primaryClasses, setPrimaryClasses] = useState<GradeRowData[]>([]);
  const [juniorClasses, setJuniorClasses] = useState<GradeRowData[]>([]);
  const [allGradeRows, setAllGradeRows] = useState<GradeRowData[]>([]);

  // Current logged in user info (to highlight assigned class)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [assignedClassId, setAssignedClassId] = useState<string | null>(null);

  // Fetch logged in user & workstation info once
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setCurrentUserId(u.id || null);
      }
      const storedWs = localStorage.getItem('teacher_workstation');
      if (storedWs) {
        const ws = JSON.parse(storedWs);
        if (ws?.classTeacher?.classId) {
          setAssignedClassId(ws.classTeacher.classId);
        }
      }
    } catch (e) {
      // fallback
    }

    apiClient
      .get('/api/teacher/workstation')
      .then((res) => {
        const ws = res.data?.data || res.data;
        if (ws?.classTeacher?.classId) {
          setAssignedClassId(ws.classTeacher.classId);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Schoolwide Overview
  const fetchOverview = async (isDeltaOnly: boolean = false) => {
    try {
      if (isDeltaOnly) {
        setDeltaLoading(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (selectedExamId) params.append('examId', selectedExamId);
      if (compareExamId) params.append('compareExamId', compareExamId);

      const res = await apiClient.get(`/api/examinations/schoolwide-overview?${params.toString()}`);
      const payload = res.data?.data;

      if (payload) {
        setAvailableExams(payload.availableExams || []);
        setSelectedExam(payload.selectedExam || null);
        setCompareExam(payload.compareExam || null);
        setSummaryRibbon(payload.summaryRibbon || null);
        setPrimaryClasses(payload.primaryClasses || []);
        setJuniorClasses(payload.juniorClasses || []);
        setAllGradeRows(payload.allGradeRows || []);

        if (payload.selectedExam && !selectedExamId) {
          setSelectedExamId(payload.selectedExam.id);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch schoolwide overview:', error);
      toast.error(error.response?.data?.message || 'Failed to load schoolwide performance');
    } finally {
      setLoading(false);
      setDeltaLoading(false);
    }
  };

  // Initial fetch and exam change
  useEffect(() => {
    fetchOverview(false);
  }, [selectedExamId]);

  // Handle comparison change
  const handleCompareChange = (newCompareId: string) => {
    setCompareExamId(newCompareId);
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchOverview(true);
    }
  }, [compareExamId]);

  const allGradesList = allGradeRows.map((g) => ({ id: g.classId, name: g.gradeName }));

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* 1. Compact Header & Controls Bar (No extra CTAs) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Award className="w-6 h-6 text-sky-500" />
              Schoolwide Performance
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Curriculum-aware CBC analytics: Pre-Primary & Primary 4-tier rubric and Junior Secondary 8-point scale
          </p>
        </div>

        {/* Right: Selectors & Level Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Primary Exam Selector */}
          <div className="relative">
            <label className="sr-only">Select Examination</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="appearance-none text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 cursor-pointer shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              {availableExams.length === 0 ? (
                <option value="">No examinations available</option>
              ) : (
                availableExams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    Exam: {exam.label}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Comparison Baseline Selector */}
          <div className="relative">
            <label className="sr-only">Comparison Baseline</label>
            <select
              value={compareExamId}
              onChange={(e) => handleCompareChange(e.target.value)}
              className="appearance-none text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-8 py-2 cursor-pointer shadow-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="auto">
                vs Baseline: Auto (Preceding Exam)
                {compareExam ? ` [${compareExam.title}]` : ''}
              </option>
              <option value="none">No Comparison (Hide Deltas)</option>
              {availableExams
                .filter((e) => e.id !== selectedExamId)
                .map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    vs: {exam.label}
                  </option>
                ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Level Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
            <button
              type="button"
              onClick={() => setLevelFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                levelFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              All Levels
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('PRIMARY')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                levelFilter === 'PRIMARY'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Primary (Rubric)
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('JUNIOR')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                levelFilter === 'JUNIOR'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#111827] dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Junior School (8-Point)
            </button>
          </div>
        </div>
      </div>

      {/* 2. Minimalist Summary Ribbon (~52px height) */}
      <SchoolwideSummaryRibbon
        data={summaryRibbon}
        loading={loading}
        onFilterRemedial={() => {
          const classWithBe = allGradeRows.find(
            (c) => (c.rubricCounts && c.rubricCounts.BE > 0) || (c.pointCounts && (c.pointCounts[1] + c.pointCounts[2] > 0))
          );
          if (classWithBe) {
            setSelectedDrawerClassId(classWithBe.classId);
          } else {
            toast.info('No learners currently in Below Expectations (Remedial).');
          }
        }}
      />

      {/* 3. Unified Grade Performance Table (Section A: Primary, Section B: Junior Secondary) */}
      <GradePerformanceMatrix
        primaryClasses={primaryClasses}
        juniorClasses={juniorClasses}
        selectedLevelFilter={levelFilter}
        assignedClassId={assignedClassId}
        currentUserId={currentUserId}
        onInspectGrade={(classId) => setSelectedDrawerClassId(classId)}
        loading={loading}
        deltaLoading={deltaLoading}
      />

      {/* 4. Slide-Over Deep-Dive Drawer */}
      <GradeDrilldownDrawer
        isOpen={selectedDrawerClassId !== null}
        onClose={() => setSelectedDrawerClassId(null)}
        classId={selectedDrawerClassId}
        examId={selectedExamId}
        compareExamId={compareExamId}
        allGrades={allGradesList}
        onSelectGrade={(newClassId) => setSelectedDrawerClassId(newClassId)}
      />
    </div>
  );
};
