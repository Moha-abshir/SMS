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
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

export const SubjectPerformanceView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PRIMARY_RUBRICS' | 'JUNIOR_POINTS' | 'DRILLDOWN'>('PRIMARY_RUBRICS');
  const [classFilter, setClassFilter] = useState<'ALL' | 'PRIMARY' | 'JUNIOR'>('ALL');

  // Exam & Analysis data
  const [analysis, setAnalysis] = useState<any | null>(null);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classDetailLoading, setClassDetailLoading] = useState(false);

  const fetchExamAnalysis = async (examId?: string, classId?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (examId) params.append('examId', examId);
      if (classId) params.append('classId', classId);

      const res = await apiClient.get(`/api/dos/exam-analysis?${params.toString()}`);
      const data = res.data.data;
      setAnalysis(data);

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

  const subjectsList: any[] = analysis?.subjects || [];
  const classesList: any[] = analysis?.classes || [];
  const interventionLearners: any[] = analysis?.interventionLearners || [];
  const selectedClassDetail = analysis?.selectedClassDetail;
  const examsList: any[] = analysis?.examsList || [];

  // Categorize subjects: Primary (PP1 - G6) vs Junior Secondary (G7 - G9)
  const primarySubjects = subjectsList.filter(
    (s) => !s.isJunior && s.levelCategory !== 'JUNIOR'
  );
  const juniorSubjects = subjectsList.filter(
    (s) => s.isJunior || s.levelCategory === 'JUNIOR'
  );

  // Categorize classes:
  const primaryClasses = classesList.filter((c) => !c.isJunior);
  const juniorClasses = classesList.filter((c) => c.isJunior);

  // Filtered classes for drilldown
  const filteredClasses = classesList.filter((c) => {
    if (classFilter === 'PRIMARY') return !c.isJunior;
    if (classFilter === 'JUNIOR') return c.isJunior;
    return true;
  });

  // Categorize interventions:
  const primaryInterventions = interventionLearners.filter((row) => !row.isJunior);
  const juniorInterventions = interventionLearners.filter((row) => row.isJunior);

  // Primary Metrics
  const primaryTestedScores = primarySubjects.reduce((acc, s) => acc + (s.testedCount || 0), 0);
  const activePrimarySubjects = primarySubjects.filter((s) => s.testedCount > 0);
  const primaryAverage =
    activePrimarySubjects.length > 0
      ? Math.round((activePrimarySubjects.reduce((acc, s) => acc + s.averageScore, 0) / activePrimarySubjects.length) * 10) / 10
      : 0;
  const sortedPrimarySubjects = [...activePrimarySubjects].sort((a, b) => b.averageScore - a.averageScore);
  const topPrimarySubject = sortedPrimarySubjects[0] || null;
  const lowestPrimarySubject = sortedPrimarySubjects.length > 1 ? sortedPrimarySubjects[sortedPrimarySubjects.length - 1] : null;

  const primaryRubricTotals = primarySubjects.reduce(
    (acc, s) => ({
      EE: acc.EE + (s.rubric?.EE || 0),
      ME: acc.ME + (s.rubric?.ME || 0),
      AE: acc.AE + (s.rubric?.AE || 0),
      BE: acc.BE + (s.rubric?.BE || 0),
    }),
    { EE: 0, ME: 0, AE: 0, BE: 0 }
  );

  // Junior Secondary Metrics
  const juniorTestedScores = juniorSubjects.reduce((acc, s) => acc + (s.testedCount || 0), 0);
  const activeJuniorSubjects = juniorSubjects.filter((s) => s.testedCount > 0);
  const juniorAverage =
    activeJuniorSubjects.length > 0
      ? Math.round((activeJuniorSubjects.reduce((acc, s) => acc + s.averageScore, 0) / activeJuniorSubjects.length) * 10) / 10
      : 0;
  const sortedJuniorSubjects = [...activeJuniorSubjects].sort((a, b) => b.averageScore - a.averageScore);
  const topJuniorSubject = sortedJuniorSubjects[0] || null;
  const lowestJuniorSubject = sortedJuniorSubjects.length > 1 ? sortedJuniorSubjects[sortedJuniorSubjects.length - 1] : null;

  const juniorPointsTotals = juniorSubjects.reduce(
    (acc, s) => {
      for (let p = 1; p <= 8; p++) {
        acc[p] = (acc[p] || 0) + (s.points?.[p] || 0);
      }
      return acc;
    },
    { 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>
  );

  return (
    <PageLoadingWrapper
      isLoading={loading && !analysis}
      title="Academic Performance Intelligence"
      subtitle="Aggregating CBC rubric frequencies, score rankings, and stream averages..."
      icon={BarChart3}
    >
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-sky-100 shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-widest mb-1">
            <BarChart3 className="w-4 h-4 text-sky-500" />
            Academic Intelligence & Performance Hub
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Learning Area Performance & Academic Oversight
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium max-w-xl">
            Streamlined evaluation structured into dedicated sections for Pre-Primary & Primary (CBC Rubrics) and Junior Secondary (Points System).
          </p>
        </div>

        {/* Exam Selector */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs font-bold text-slate-600">Exam:</label>
          <select
            value={selectedExamId}
            onChange={(e) => handleExamChange(e.target.value)}
            className="bg-white border border-sky-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-sky-500 outline-hidden transition-colors shadow-xs"
          >
            {examsList.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.title} ({e.termName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass overflow-x-auto">
        <button
          onClick={() => setActiveTab('PRIMARY_RUBRICS')}
          className={`flex-1 min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'PRIMARY_RUBRICS'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:bg-sky-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Pre-Primary & Primary (CBC Rubrics · PP–G6)
        </button>

        <button
          onClick={() => setActiveTab('JUNIOR_POINTS')}
          className={`flex-1 min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'JUNIOR_POINTS'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:bg-sky-50'
          }`}
        >
          <Award className="w-4 h-4" />
          Junior Secondary (Points Scale · G7–G9)
        </button>

        <button
          onClick={() => setActiveTab('DRILLDOWN')}
          className={`flex-1 min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'DRILLDOWN'
              ? 'bg-sky-500 text-white shadow-glass'
              : 'text-slate-600 hover:bg-sky-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Class & Learner Drill-Down
        </button>
      </div>

      {/* SECTION 1: PRE-PRIMARY & PRIMARY (CBC RUBRICS) */}
      {activeTab === 'PRIMARY_RUBRICS' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Primary Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">Primary Average</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{primaryAverage}%</div>
              <p className="text-[11px] text-sky-600 font-semibold mt-0.5">{primaryTestedScores} Evaluated Scores</p>
            </div>

            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">Primary Classes</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{primaryClasses.length}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Playgroup, PP1, PP2 & G1–G6</p>
            </div>

            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-600" /> Top Subject
              </span>
              <div className="text-sm font-black text-slate-900 mt-1 truncate">
                {topPrimarySubject ? topPrimarySubject.subjectName : '—'}
              </div>
              <p className="text-[11px] text-emerald-600 font-bold font-mono mt-0.5">
                {topPrimarySubject ? `${topPrimarySubject.averageScore}% Mean` : 'No data'}
              </p>
            </div>

            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-amber-600" /> Lowest Subject
              </span>
              <div className="text-sm font-black text-slate-900 mt-1 truncate">
                {lowestPrimarySubject ? lowestPrimarySubject.subjectName : '—'}
              </div>
              <p className="text-[11px] text-amber-600 font-bold font-mono mt-0.5">
                {lowestPrimarySubject ? `${lowestPrimarySubject.averageScore}% Mean` : 'No data'}
              </p>
            </div>

            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass col-span-2 lg:col-span-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" /> Remedial Alerts
              </span>
              <div className="text-2xl font-black text-rose-600 mt-1 font-mono">{primaryInterventions.length}</div>
              <p className="text-[11px] text-rose-700 font-semibold mt-0.5">Scores Below 50% Threshold</p>
            </div>
          </div>

          {/* Strict 4-Level CBC Rubric Reference Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-900 text-sm">EE (75% – 100%)</span>
                <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-900 font-bold rounded-full text-[10px] font-mono">
                  {primaryRubricTotals.EE}
                </span>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium block">Exceeding Expectations · Level 4</span>
            </div>

            <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-sky-900 text-sm">ME (50% – 74%)</span>
                <span className="px-1.5 py-0.5 bg-sky-200 text-sky-900 font-bold rounded-full text-[10px] font-mono">
                  {primaryRubricTotals.ME}
                </span>
              </div>
              <span className="text-[11px] text-sky-800 font-medium block">Meeting Expectations · Level 3</span>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-900 text-sm">AE (25% – 49%)</span>
                <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 font-bold rounded-full text-[10px] font-mono">
                  {primaryRubricTotals.AE}
                </span>
              </div>
              <span className="text-[11px] text-amber-800 font-medium block">Approaching Expectations · Level 2</span>
            </div>

            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-black text-rose-900 text-sm">BE (0% – 24%)</span>
                <span className="px-1.5 py-0.5 bg-rose-200 text-rose-900 font-bold rounded-full text-[10px] font-mono">
                  {primaryRubricTotals.BE}
                </span>
              </div>
              <span className="text-[11px] text-rose-800 font-medium block">Below Expectations · Level 1</span>
            </div>
          </div>

          {/* Primary Learning Areas Table */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                  Pre-Primary & Primary Learning Areas ({primarySubjects.length} Subjects Evaluated)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Academic performance strictly evaluated using the 4-Level CBC Rubric scale.
                </p>
              </div>
            </div>

            {primarySubjects.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">
                No Pre-Primary or Primary subjects recorded for this examination.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                    <tr>
                      <th className="py-3.5 px-4">Subject Name</th>
                      <th className="py-3.5 px-4">Level Tier</th>
                      <th className="py-3.5 px-4 text-center">Learners</th>
                      <th className="py-3.5 px-4 text-center">Average</th>
                      <th className="py-3.5 px-4 text-center">Lowest / Highest</th>
                      <th className="py-3.5 px-4 text-center">CBC Rubrics Breakdown</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/60 font-medium">
                    {primarySubjects.map((sub: any) => (
                      <tr key={sub.subjectId} className="hover:bg-sky-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {sub.subjectName}
                          <span className="text-[10px] text-slate-400 font-mono block">Code: {sub.subjectCode}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-100 text-[10px] font-bold">
                            {sub.levelCategory || 'PRIMARY'}
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
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded" title="EE: 75-100%">
                              EE: {sub.rubric?.EE || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded border border-sky-100" title="ME: 50-74%">
                              ME: {sub.rubric?.ME || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded" title="AE: 25-49%">
                              AE: {sub.rubric?.AE || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200" title="BE: 0-24%">
                              BE: {sub.rubric?.BE || 0}
                            </span>
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
            )}
          </div>

          {/* Primary Remedial Registry (<50%) */}
          {primaryInterventions.length > 0 && (
            <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-rose-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Primary Remedial Registry ({primaryInterventions.length} Scores Below 50%)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Primary candidates requiring teacher intervention and remedial coaching.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-rose-50/70 text-rose-900 font-bold uppercase tracking-wider border-b border-rose-100">
                    <tr>
                      <th className="py-3 px-4">Learner Name</th>
                      <th className="py-3 px-3">Class</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-3 text-center">Score</th>
                      <th className="py-3 px-3 text-center">CBC Rubric</th>
                      <th className="py-3 px-4">Teacher Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100/50">
                    {primaryInterventions.map((row: any) => (
                      <tr key={row.scoreId} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.studentName}
                          <span className="text-[10px] text-slate-400 font-mono block">Adm: {row.admissionNumber || '—'}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{row.className}</td>
                        <td className="py-3 px-4 font-bold text-rose-800">{row.subjectName}</td>
                        <td className="py-3 px-3 text-center font-mono font-black text-rose-700">{row.marksObtained}%</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                            {row.rubric || 'BE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 italic">{row.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: JUNIOR SECONDARY (POINTS SYSTEM) */}
      {activeTab === 'JUNIOR_POINTS' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Junior Secondary Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">Junior Sec. Average</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{juniorAverage}%</div>
              <p className="text-[11px] text-sky-600 font-semibold mt-0.5">{juniorTestedScores} Evaluated Scores</p>
            </div>

            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">Junior Sec. Classes</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{juniorClasses.length}</div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Grades 7, 8 & 9</p>
            </div>

            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-600" /> Top Subject
              </span>
              <div className="text-sm font-black text-slate-900 mt-1 truncate">
                {topJuniorSubject ? topJuniorSubject.subjectName : '—'}
              </div>
              <p className="text-[11px] text-emerald-600 font-bold font-mono mt-0.5">
                {topJuniorSubject ? `${topJuniorSubject.averageScore}% Mean` : 'No data'}
              </p>
            </div>

            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-amber-600" /> Lowest Subject
              </span>
              <div className="text-sm font-black text-slate-900 mt-1 truncate">
                {lowestJuniorSubject ? lowestJuniorSubject.subjectName : '—'}
              </div>
              <p className="text-[11px] text-amber-600 font-bold font-mono mt-0.5">
                {lowestJuniorSubject ? `${lowestJuniorSubject.averageScore}% Mean` : 'No data'}
              </p>
            </div>

            <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl shadow-glass col-span-2 lg:col-span-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" /> Remedial Alerts
              </span>
              <div className="text-2xl font-black text-rose-600 mt-1 font-mono">{juniorInterventions.length}</div>
              <p className="text-[11px] text-rose-700 font-semibold mt-0.5">Scores Below 50% Threshold</p>
            </div>
          </div>

          {/* Strict 8-Level Junior Secondary Points Reference Bar */}
          <div className="p-4 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl shadow-glass space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-600" />
                Junior Secondary 8-Level Points System (1 to 8 Points)
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Headteacher Scale Specification</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              <div className="p-2.5 bg-sky-600 text-white rounded-xl text-center shadow-xs">
                <div className="text-base font-black font-mono">8 pts</div>
                <div className="text-[10px] opacity-90">90 – 100%</div>
                <div className="text-[11px] font-bold mt-1 font-mono bg-white/20 rounded py-0.5">
                  {juniorPointsTotals[8] || 0}
                </div>
              </div>

              <div className="p-2.5 bg-sky-100 text-sky-900 border border-sky-300 rounded-xl text-center">
                <div className="text-base font-black font-mono">7 pts</div>
                <div className="text-[10px] text-sky-700">75 – 89%</div>
                <div className="text-[11px] font-bold mt-1 font-mono bg-white rounded py-0.5 border border-sky-200">
                  {juniorPointsTotals[7] || 0}
                </div>
              </div>

              <div className="p-2.5 bg-teal-50 text-teal-900 border border-teal-200 rounded-xl text-center">
                <div className="text-base font-black font-mono">6 pts</div>
                <div className="text-[10px] text-teal-700">58 – 74%</div>
                <div className="text-[11px] font-bold mt-1 font-mono bg-white rounded py-0.5 border border-teal-200">
                  {juniorPointsTotals[6] || 0}
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-center">
                <div className="text-base font-black font-mono">5 pts</div>
                <div className="text-[10px] text-blue-700">41 – 57%</div>
                <div className="text-[11px] font-bold mt-1 font-mono bg-white rounded py-0.5 border border-blue-200">
                  {juniorPointsTotals[5] || 0}
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-center">
                <div className="text-base font-black font-mono">4 pts</div>
                <div className="text-[10px] text-slate-500">31 – 40%</div>
                <div className="text-[11px] font-bold mt-1 font-mono bg-white rounded py-0.5 border border-slate-200">
                  {juniorPointsTotals[4] || 0}
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-center">
                <div className="text-base font-black font-mono">3 pts</div>
                <div className="text-[10px] text-amber-700">21 – 30%</div>
                <div className="text-[11px] font-bold mt-1 font-mono bg-white rounded py-0.5 border border-amber-200">
                  {juniorPointsTotals[3] || 0}
                </div>
              </div>

              <div className="p-2.5 bg-orange-50 text-orange-900 border border-orange-200 rounded-xl text-center">
                <div className="text-base font-black font-mono">2 pts</div>
                <div className="text-[10px] text-orange-700">11 – 20%</div>
                <div className="text-[11px] font-bold mt-1 font-mono bg-white rounded py-0.5 border border-orange-200">
                  {juniorPointsTotals[2] || 0}
                </div>
              </div>

              <div className="p-2.5 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-center">
                <div className="text-base font-black font-mono">1 pt</div>
                <div className="text-[10px] text-rose-700">0 – 10%</div>
                <div className="text-[11px] font-bold mt-1 font-mono bg-white rounded py-0.5 border border-rose-200">
                  {juniorPointsTotals[1] || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Junior Secondary Learning Areas Table */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                  Junior Secondary Learning Areas ({juniorSubjects.length} Subjects Evaluated)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Academic performance strictly evaluated using the 8-Level Points scale.
                </p>
              </div>
            </div>

            {juniorSubjects.length === 0 ? (
              <div className="py-8 text-center text-slate-400 italic text-xs">
                No Junior Secondary subjects recorded for this examination.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                    <tr>
                      <th className="py-3.5 px-4">Subject Name</th>
                      <th className="py-3.5 px-4 text-center">Learners</th>
                      <th className="py-3.5 px-4 text-center">Average</th>
                      <th className="py-3.5 px-4 text-center">Lowest / Highest</th>
                      <th className="py-3.5 px-4 text-center">Points Distribution (8p down to 1p)</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/60 font-medium">
                    {juniorSubjects.map((sub: any) => (
                      <tr key={sub.subjectId} className="hover:bg-sky-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {sub.subjectName}
                          <span className="text-[10px] text-slate-400 font-mono block">Code: {sub.subjectCode}</span>
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
                          <div className="flex items-center justify-center gap-1 font-mono text-[10px] font-bold flex-wrap">
                            <span className="px-1.5 py-0.5 bg-sky-600 text-white rounded" title="8 pts (90-100%)">
                              8p:{sub.points?.[8] || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-sky-100 text-sky-800 rounded border border-sky-200" title="7 pts (75-89%)">
                              7p:{sub.points?.[7] || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 rounded border border-teal-200" title="6 pts (58-74%)">
                              6p:{sub.points?.[6] || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200" title="5 pts (41-57%)">
                              5p:{sub.points?.[5] || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200" title="4 pts (31-40%)">
                              4p:{sub.points?.[4] || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200" title="3 pts (21-30%)">
                              3p:{sub.points?.[3] || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-800 rounded border border-orange-200" title="2 pts (11-20%)">
                              2p:{sub.points?.[2] || 0}
                            </span>
                            <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200" title="1 pt (0-10%)">
                              1p:{sub.points?.[1] || 0}
                            </span>
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
            )}
          </div>

          {/* Junior Secondary Remedial Registry (<50%) */}
          {juniorInterventions.length > 0 && (
            <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-rose-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
              <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Junior Secondary Remedial Registry ({juniorInterventions.length} Scores Below 50%)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Junior Secondary candidates requiring targeted subject remedial sessions.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-rose-50/70 text-rose-900 font-bold uppercase tracking-wider border-b border-rose-100">
                    <tr>
                      <th className="py-3 px-4">Learner Name</th>
                      <th className="py-3 px-3">Class</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-3 text-center">Score</th>
                      <th className="py-3 px-3 text-center">Points</th>
                      <th className="py-3 px-4">Teacher Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100/50">
                    {juniorInterventions.map((row: any) => (
                      <tr key={row.scoreId} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.studentName}
                          <span className="text-[10px] text-slate-400 font-mono block">Adm: {row.admissionNumber || '—'}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{row.className}</td>
                        <td className="py-3 px-4 font-bold text-rose-800">{row.subjectName}</td>
                        <td className="py-3 px-3 text-center font-mono font-black text-rose-700">{row.marksObtained}%</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded font-bold text-[10px]">
                            {row.points !== null && row.points !== undefined ? `${row.points} pts` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 italic">{row.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: MULTI-TIER CLASS & LEARNER DRILL-DOWN */}
      {activeTab === 'DRILLDOWN' && (
        <div className="space-y-6">
          {/* Level 1: Classes Overview Matrix with Tier Filter */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-sky-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-600" />
                  Class Stream Performance Overview ({filteredClasses.length} Streams)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a class stream to inspect individual student scorecards and rankings.
                </p>
              </div>

              {/* Tier Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl text-xs font-bold self-start sm:self-auto">
                <button
                  onClick={() => setClassFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    classFilter === 'ALL'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({classesList.length})
                </button>
                <button
                  onClick={() => setClassFilter('PRIMARY')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    classFilter === 'PRIMARY'
                      ? 'bg-white text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Primary ({primaryClasses.length})
                </button>
                <button
                  onClick={() => setClassFilter('JUNIOR')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    classFilter === 'JUNIOR'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Junior Sec. ({juniorClasses.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredClasses.map((cls: any) => {
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
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          cls.isJunior
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {cls.isJunior ? 'Junior Sec. (Points)' : 'Primary (Rubrics)'}
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
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-600" />
                      {selectedClassDetail.className} — Learner Scorecard & Rankings
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        selectedClassDetail.isJunior
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {selectedClassDetail.isJunior ? 'Points Scale (1–8)' : 'CBC Rubrics (EE/ME/AE/BE)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Individual examination marks ranked in descending order of performance ({selectedClassDetail.students?.length} Learners).
                  </p>
                </div>
                <button
                  onClick={() => setSelectedClassId(null)}
                  className="text-xs text-sky-600 hover:underline font-bold cursor-pointer"
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
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead className="bg-sky-50/80 text-sky-900 font-bold uppercase tracking-wider border-b border-sky-100">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">Rank</th>
                        <th className="py-3 px-4">Learner Name</th>
                        <th className="py-3 px-3">Adm #</th>
                        <th className="py-3 px-4">
                          Learning Areas ({selectedClassDetail.isJunior ? 'Points' : 'Rubrics'})
                        </th>
                        <th className="py-3 px-3 text-center">Average</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100/60 font-medium">
                      {selectedClassDetail.students?.map((st: any) => (
                        <tr key={st.studentId} className="hover:bg-sky-50/40 transition-colors">
                          <td className="py-3 px-3 text-center font-black font-mono text-slate-500">
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
                                  {sub.subjectName}: {sub.score}% (
                                  {selectedClassDetail.isJunior && sub.points != null
                                    ? `${sub.points} pts`
                                    : (sub.rubric || '—')}
                                  )
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

          {/* Combined Remedial Registry with Tier Filter */}
          <div className="p-4 sm:p-6 bg-white/85 backdrop-blur-md border border-rose-100 rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Priority Intervention Registry ({interventionLearners.length} Instances Below 50%)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Targeted learners requiring remedial tutoring and subject teacher follow-up across streams.
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
                      <th className="py-3 px-3 text-center">Assessment</th>
                      <th className="py-3 px-4">Teacher Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100/50">
                    {interventionLearners
                      .filter((row: any) => {
                        if (classFilter === 'PRIMARY') return !row.isJunior;
                        if (classFilter === 'JUNIOR') return row.isJunior;
                        return true;
                      })
                      .map((row: any) => (
                        <tr key={row.scoreId} className="hover:bg-rose-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {row.studentName}
                            <span className="text-[10px] text-slate-400 font-mono block">Adm: {row.admissionNumber || '—'}</span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">{row.className}</td>
                          <td className="py-3 px-4 font-bold text-rose-800">{row.subjectName}</td>
                          <td className="py-3 px-3 text-center font-mono font-black text-rose-700">{row.marksObtained}%</td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                row.isJunior
                                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.isJunior && row.points != null ? `${row.points} pts` : (row.rubric || 'BE')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 italic">{row.remarks}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </PageLoadingWrapper>
  );
};

export default SubjectPerformanceView;
