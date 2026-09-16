import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';
import { printElement } from '../../lib/printElement';

export const SubjectPerformanceView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SUBJECTS' | 'DRILLDOWN' | 'BRIEFING'>('SUBJECTS');

  // Exam & Analysis data
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [insightsData, setInsightsData] = useState<any | null>(null);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetailLoading, setClassDetailLoading] = useState(false);

  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchExamAnalysis = async (examId?: string, classId?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (examId) params.append('examId', examId);
      if (classId) params.append('classId', classId);

      const [anRes, insRes] = await Promise.all([
        apiClient.get(`/api/dos/exam-analysis?${params.toString()}`),
        apiClient.get(`/api/dos/insights?${examId ? `examId=${examId}` : ''}`),
      ]);

      const data = anRes.data.data;
      setAnalysis(data);
      setInsightsData(insRes.data.data || null);

      if (data?.selectedExam && !selectedExamId) {
        setSelectedExamId(data.selectedExam.id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load academic analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassDrilldown = async (classId: string) => {
    try {
      setClassDetailLoading(true);
      setSelectedClassId(classId);
      const res = await apiClient.get(`/api/dos/exam-analysis?examId=${selectedExamId}&classId=${classId}`);
      if (res.data?.data?.selectedClassDetail) {
        setAnalysis((prev: any) => ({
          ...prev,
          selectedClassDetail: res.data.data.selectedClassDetail,
        }));
      }
    } catch (error: any) {
      toast.error('Failed to load class learner drill-down');
    } finally {
      setClassDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchExamAnalysis();
  }, []);

  const handleExamChange = (newExamId: string) => {
    setSelectedExamId(newExamId);
    setSelectedClassId(null);
    fetchExamAnalysis(newExamId);
  };

  if (loading && !analysis) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const school = analysis?.schoolOverview || {
    schoolAverage: 0,
    totalLearnersTested: 0,
    totalScoresEntered: 0,
    topSubject: null,
    lowestSubject: null,
    rubricDistribution: { EE: 0, ME: 0, AE: 0, BE: 0 },
    strugglingTotal: 0,
  };

  const subjectsList = analysis?.subjects || [];
  const classesList = analysis?.classes || [];
  const interventionLearners = analysis?.interventionLearners || [];
  const selectedClassDetail = analysis?.selectedClassDetail;
  const examsList = analysis?.examsList || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            Director of Studies · Academic Intelligence Hub
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Academic Performance, Multi-Tier Drill-Down & Staff Briefing
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            In-depth analysis from whole-school averages to specific learner scorecards, bottleneck learning areas, and meeting briefing materials.
          </p>
        </div>

        {/* Exam Selector and Print Trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedExamId}
            onChange={(e) => handleExamChange(e.target.value)}
            className="bg-white border border-sky-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-sky-500 outline-none transition-colors shadow-xs"
          >
            {examsList.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.termName})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowPrintModal(true)}
            className="justify-center min-h-[38px] px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Printer className="w-4 h-4 text-sky-600" />
            Print Meeting Briefing
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">School Average</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{school.schoolAverage}%</div>
          <p className="text-[11px] text-sky-600 font-semibold mt-0.5">{school.totalScoresEntered} Total Test Scores</p>
        </div>

        <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">Tested Candidates</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{school.totalLearnersTested}</div>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Across All Streams</p>
        </div>

        <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-600" /> Top Subject
          </span>
          <div className="text-sm font-black text-slate-900 mt-1 truncate">
            {school.topSubject ? school.topSubject.name : '—'}
          </div>
          <p className="text-[11px] text-emerald-600 font-bold font-mono mt-0.5">
            {school.topSubject ? `${school.topSubject.average}% Mean` : 'No data'}
          </p>
        </div>

        <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-amber-600" /> Lowest Subject
          </span>
          <div className="text-sm font-black text-slate-900 mt-1 truncate">
            {school.lowestSubject ? school.lowestSubject.name : '—'}
          </div>
          <p className="text-[11px] text-amber-600 font-bold font-mono mt-0.5">
            {school.lowestSubject ? `${school.lowestSubject.average}% Mean` : 'No data'}
          </p>
        </div>

        <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass col-span-2 lg:col-span-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" /> Remedial Alerts
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1 font-mono">{school.strugglingTotal}</div>
          <p className="text-[11px] text-rose-700 font-semibold mt-0.5">Scores Below 50% Threshold</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass overflow-x-auto">
        <button
          onClick={() => setActiveTab('SUBJECTS')}
          className={`flex-1 min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'SUBJECTS'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:bg-sky-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Subject Performance & Rubrics
        </button>

        <button
          onClick={() => setActiveTab('DRILLDOWN')}
          className={`flex-1 min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'DRILLDOWN'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:bg-sky-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Class & Learner Drill-Down
        </button>

        <button
          onClick={() => setActiveTab('BRIEFING')}
          className={`flex-1 min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'BRIEFING'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:bg-sky-50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Staff Meeting Briefing & Insights
        </button>
      </div>

      {/* TAB 1: SUBJECT PERFORMANCE & RUBRICS */}
      {activeTab === 'SUBJECTS' && (
        <div className="space-y-4">
          {/* CBC & JSS Scale Reference */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs">
              <span className="font-black text-sky-900 block">EE (80% - 100%)</span>
              <span className="text-[11px] text-sky-700">Exceeding Expectations · Level 4</span>
            </div>
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs">
              <span className="font-black text-sky-800 block">ME (65% - 79%)</span>
              <span className="text-[11px] text-sky-600">Meeting Expectations · Level 3</span>
            </div>
            <div className="p-3 bg-white border border-sky-100 rounded-xl text-xs">
              <span className="font-black text-slate-800 block">AE (50% - 64%)</span>
              <span className="text-[11px] text-slate-500">Approaching Expectations · Level 2</span>
            </div>
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs">
              <span className="font-black text-rose-800 block">BE (0% - 49%)</span>
              <span className="text-[11px] text-rose-600">Below Expectations · Remedial</span>
            </div>
          </div>

          {/* Subjects Table */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600" />
                Learning Area Performance ({subjectsList.length} Subjects Evaluated)
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                  <tr>
                    <th className="py-3.5 px-4">Subject Name</th>
                    <th className="py-3.5 px-4">Level Tier</th>
                    <th className="py-3.5 px-4 text-center">Learners</th>
                    <th className="py-3.5 px-4 text-center">Average</th>
                    <th className="py-3.5 px-4 text-center">Lowest / Highest</th>
                    <th className="py-3.5 px-4 text-center">Rubric Distribution</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-100/60">
                  {subjectsList.map((sub: any) => (
                    <tr key={sub.subjectId} className="hover:bg-sky-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {sub.subjectName}
                        <span className="text-[10px] text-slate-400 font-mono block">Code: {sub.subjectCode}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-100">
                          {sub.levelCategory}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700 font-mono">
                        {sub.testedCount}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-extrabold text-sm text-sky-700">
                        {sub.testedCount > 0 ? `${sub.averageScore}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-600">
                        {sub.testedCount > 0 ? `${sub.lowestScore}% / ${sub.highestScore}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 font-mono text-[10px] font-bold">
                          <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded">EE:{sub.rubric.EE}</span>
                          <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100">ME:{sub.rubric.ME}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">AE:{sub.rubric.AE}</span>
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200">BE:{sub.rubric.BE}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {sub.needsAttention ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded-full text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Bottleneck Focus
                          </span>
                        ) : sub.testedCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Satisfactory
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No submissions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-TIER CLASS & LEARNER DRILL-DOWN */}
      {activeTab === 'DRILLDOWN' && (
        <div className="space-y-6">
          {/* Level 1: Classes Overview Matrix */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-600" />
                Class Stream Performance Overview ({classesList.length} Classes)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any class stream below to drill down into the individual student scorecards and rankings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {classesList.map((cls: any) => {
                const isSelected = selectedClassId === cls.classId;
                return (
                  <div
                    key={cls.classId}
                    onClick={() => fetchClassDrilldown(cls.classId)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 border-sky-300 shadow-md ring-2 ring-sky-400'
                        : 'bg-white hover:bg-sky-50/50 border-sky-100 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-slate-900 text-sm">{cls.className}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-bold">
                        {cls.levelCategory}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-t border-sky-100/60">
                      <span className="text-slate-500 font-medium">Class Average:</span>
                      <span className="font-mono font-extrabold text-sky-700 text-sm">{cls.classAverage}%</span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-500 font-medium">Learners Tested:</span>
                      <span className="font-mono font-bold text-slate-700">{cls.testedCount}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <span className="text-slate-500 font-medium">Top Student:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[140px]">
                        {cls.topStudent ? `${cls.topStudent.name} (${cls.topStudent.average}%)` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 pt-1.5 border-t border-sky-100/60">
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Below 50%:
                      </span>
                      <span className="font-mono font-bold text-rose-700">{cls.strugglingCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Level 2: Deep Student Scorecard for Selected Class */}
          {selectedClassDetail && (
            <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-200 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass ring-1 ring-sky-200">
              <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-600" />
                    {selectedClassDetail.className} — Learner Scorecard & Rankings ({selectedClassDetail.students?.length} Learners)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Individual examination marks ranked in descending order of performance.
                  </p>
                </div>
                <button
                  onClick={() => setSelectedClassId(null)}
                  className="text-xs text-sky-600 hover:underline font-bold"
                >
                  Close Drill-Down
                </button>
              </div>

              {classDetailLoading ? (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedClassDetail.students?.length === 0 ? (
                <div className="py-6 text-center text-slate-400 italic text-xs">
                  No individual scores recorded for this class in this examination.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                      <tr>
                        <th className="py-3 px-3 text-center">Rank</th>
                        <th className="py-3 px-4">Learner Name</th>
                        <th className="py-3 px-3">Adm No.</th>
                        <th className="py-3 px-4">Subject Scores</th>
                        <th className="py-3 px-3 text-center">Mean Average</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100/60">
                      {selectedClassDetail.students.map((st: any) => (
                        <tr key={st.studentId} className="hover:bg-sky-50/40 transition-colors">
                          <td className="py-3 px-3 text-center font-mono font-black text-sky-800">
                            #{st.rank}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {st.studentName}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">
                            {st.admissionNumber || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {st.subjects.map((sub: any, sIdx: number) => (
                                <span
                                  key={sIdx}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    sub.score >= 50
                                      ? 'bg-sky-50 text-sky-800 border border-sky-100'
                                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {sub.subjectName}: {sub.score}% ({sub.rubric})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black text-sm text-sky-700">
                            {st.average}%
                          </td>
                          <td className="py-3 px-3 text-center">
                            {st.average >= 50 ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold">
                                Passed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-full text-[10px] font-bold">
                                Needs Remedial
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Level 3: School-Wide Priority Intervention List (<50%) */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-rose-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  School-Wide Priority Intervention Registry ({interventionLearners.length} Test Instances Below 50%)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Targeted learners requiring mandatory remedial tutoring and subject teacher follow-up.
                </p>
              </div>
            </div>

            {interventionLearners.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">
                No learners recorded below the 50% threshold for this examination.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-rose-50/70 text-rose-900 font-bold uppercase tracking-wider border-b border-rose-100">
                    <tr>
                      <th className="py-3 px-4">Learner Name</th>
                      <th className="py-3 px-3">Class</th>
                      <th className="py-3 px-4">Struggling Subject</th>
                      <th className="py-3 px-3 text-center">Score</th>
                      <th className="py-3 px-3 text-center">Rubric</th>
                      <th className="py-3 px-4">Teacher Remark / Prescribed Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100/50">
                    {interventionLearners.map((row: any) => (
                      <tr key={row.scoreId} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.studentName}
                          <span className="text-[10px] text-slate-400 font-mono block">Adm: {row.admissionNumber || '—'}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {row.className}
                        </td>
                        <td className="py-3 px-4 font-bold text-rose-800">
                          {row.subjectName}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-rose-700">
                          {row.marksObtained}%
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                            {row.rubric}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 italic">
                          {row.remarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STAFF MEETING BRIEFING & INSIGHTS */}
      {activeTab === 'BRIEFING' && (
        <div className="space-y-4">
          {/* Narrative Meeting Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insightsData?.insights?.map((ins: any, idx: number) => (
              <div
                key={idx}
                className={`p-4 sm:p-5 rounded-2xl border shadow-glass space-y-2 ${
                  ins.type === 'ALERT'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : ins.type === 'ACHIEVEMENT'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : ins.type === 'ACTION'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-sky-50/70 border-sky-200 text-sky-950'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-sm">
                  {ins.type === 'ALERT' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                  {ins.type === 'ACHIEVEMENT' && <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {ins.type === 'ACTION' && <Target className="w-4 h-4 text-amber-600 shrink-0" />}
                  {ins.type === 'INFO' && <Info className="w-4 h-4 text-sky-600 shrink-0" />}
                  <span>{ins.title}</span>
                </div>
                <p className="text-xs leading-relaxed font-medium text-slate-700">
                  {ins.message}
                </p>
              </div>
            ))}
          </div>

          {/* Actionable Departmental Directives */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-3 shadow-glass">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              Director of Studies Actionable Recommendations for Staff Meeting
            </h3>
            <ul className="space-y-2">
              {insightsData?.actionableRecommendations?.map((rec: string, rIdx: number) => (
                <li key={rIdx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium bg-sky-50/40 p-3 rounded-xl border border-sky-100">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    {rIdx + 1}
                  </span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Printable Staff Meeting Briefing Report Modal */}
      {showPrintModal && (
        <Modal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          title="Printable Academic Staff Meeting Briefing"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-sky-100">
              <p className="text-xs text-slate-600">
                Official DoS academic briefing sheet prepared for academic staff meetings and department reviews.
              </p>
              <button
                onClick={() => printElement('dos-briefing-printable', `${insightsData?.schoolName || 'Eldoret Muslim Academy'} - Academic Staff Meeting Briefing`)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-glass shrink-0 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Document
              </button>
            </div>

            {/* Document Print Sheet */}
            <div id="dos-briefing-printable" className="p-6 sm:p-8 bg-white border border-slate-300 rounded-xl text-slate-900 shadow-sm space-y-6">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4">
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900">
                  {insightsData?.schoolName || 'ELDORET MUSLIM ACADEMY'}
                </h1>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest mt-0.5">
                  Office of the Director of Studies · Academic Performance Review Committee
                </p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-bold uppercase tracking-wider text-slate-800">
                  Examination Analysis & Staff Meeting Briefing Report
                </div>
                <div className="mt-2 text-xs text-slate-600 flex justify-center items-center gap-6 font-medium">
                  <span><strong>Exam:</strong> {insightsData?.exam?.title || 'Current Exam'}</span>
                  <span><strong>Year:</strong> {insightsData?.academicYear || 2026}</span>
                  <span><strong>Term:</strong> Term {insightsData?.currentTermNumber || 1}</span>
                </div>
              </div>

              {/* Overview Metrics Table */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider mb-2 text-slate-800">1. Whole-School Performance Summary</h3>
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 font-bold bg-slate-50 w-1/3">School Mean Average:</td>
                      <td className="p-2 border border-slate-300 font-mono font-black">{school.schoolAverage}%</td>
                      <td className="p-2 border border-slate-300 font-bold bg-slate-50 w-1/3">Learners Evaluated:</td>
                      <td className="p-2 border border-slate-300 font-mono">{school.totalLearnersTested} Candidates</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 font-bold bg-slate-50">Top Learning Area:</td>
                      <td className="p-2 border border-slate-300 font-bold">{school.topSubject?.name} ({school.topSubject?.average}%)</td>
                      <td className="p-2 border border-slate-300 font-bold bg-slate-50">Lowest Learning Area:</td>
                      <td className="p-2 border border-slate-300 font-bold text-rose-700">{school.lowestSubject?.name} ({school.lowestSubject?.average}%)</td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-300 font-bold bg-slate-50">CBC Rubric Distribution:</td>
                      <td colSpan={3} className="p-2 border border-slate-300 font-mono">
                        EE (Exceeding): {school.rubricDistribution.EE} | ME (Meeting): {school.rubricDistribution.ME} | AE (Approaching): {school.rubricDistribution.AE} | BE (Below): {school.rubricDistribution.BE}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Briefing Observations */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider mb-2 text-slate-800">2. Key Analytical Observations & Departmental Findings</h3>
                <div className="space-y-2">
                  {insightsData?.insights?.map((ins: any, idx: number) => (
                    <div key={idx} className="p-2.5 border border-slate-300 bg-slate-50/60 rounded text-xs">
                      <div className="font-bold text-slate-900">{idx + 1}. {ins.title}</div>
                      <p className="text-[11px] text-slate-700 mt-0.5">{ins.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Remedial Registry */}
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider mb-2 text-slate-800">
                  3. Learners Requiring Urgent Remedial Attention (&lt;50% Marks)
                </h3>
                <table className="w-full text-left text-xs border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                      <th className="p-2 border border-slate-300">#</th>
                      <th className="p-2 border border-slate-300">Learner Name</th>
                      <th className="p-2 border border-slate-300">Class</th>
                      <th className="p-2 border border-slate-300">Subject</th>
                      <th className="p-2 border border-slate-300 text-center">Mark</th>
                      <th className="p-2 border border-slate-300">Prescribed Remedial Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interventionLearners.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-3 text-center text-slate-500 italic">
                          No candidates fell below 50% threshold.
                        </td>
                      </tr>
                    ) : (
                      interventionLearners.map((row: any, idx: number) => (
                        <tr key={row.scoreId} className="border-b border-slate-200">
                          <td className="p-1.5 border border-slate-300 text-center font-bold">{idx + 1}</td>
                          <td className="p-1.5 border border-slate-300 font-semibold">{row.studentName}</td>
                          <td className="p-1.5 border border-slate-300">{row.className}</td>
                          <td className="p-1.5 border border-slate-300 font-bold">{row.subjectName}</td>
                          <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-rose-700">{row.marksObtained}%</td>
                          <td className="p-1.5 border border-slate-300 italic text-[11px]">{row.remarks}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Actionable Directives */}
              <div className="border border-slate-200 bg-slate-50/50 p-3 rounded text-[11px] space-y-1 text-slate-700">
                <p className="font-bold uppercase tracking-wider text-slate-900">4. Action Plan for Subject Teachers & Class Tutors:</p>
                <ul className="list-decimal list-inside space-y-0.5 text-slate-600">
                  {insightsData?.actionableRecommendations?.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>

              {/* Signatures & School Stamp */}
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-300 text-xs">
                <div>
                  <div className="border-b border-slate-400 h-10 mb-1" />
                  <p className="font-bold text-slate-800">Director of Studies (DoS)</p>
                  <p className="text-[10px] text-slate-500">Signature & Date</p>
                </div>

                <div>
                  <div className="border-b border-slate-400 h-10 mb-1" />
                  <p className="font-bold text-slate-800">Headteacher / Principal</p>
                  <p className="text-[10px] text-slate-500">Signature & Date</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-sky-800 flex flex-col items-center justify-center text-center p-1 text-[7px] font-bold text-sky-900 tracking-tighter uppercase leading-tight select-none">
                    <span>ELDORET MUSLIM</span>
                    <span>ACADEMY</span>
                    <span className="my-0.5 text-[6px] text-sky-600">★ ACADEMIC REVIEW ★</span>
                    <span>OFFICIAL STAMP</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
};

