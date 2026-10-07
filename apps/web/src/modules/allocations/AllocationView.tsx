import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, CheckCircle, ShieldAlert, Plus, Trash2, UserCheck,
  CheckCircle2, AlertCircle, ArrowRight, Layers, Sparkles, SlidersHorizontal, Info
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { SearchableSelect } from '../../components/SearchableSelect';
import { ClassSubjectAllocationSlideOver } from './ClassSubjectAllocationSlideOver';

export const AllocationView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    academicYear: number;
    classes: any[];
    teachers: any[];
    subjects: any[];
    qualifications: any[];
    subjectAllocations: any[];
  }>({
    academicYear: 2026,
    classes: [],
    teachers: [],
    subjects: [],
    qualifications: [],
    subjectAllocations: [],
  });

  const [savingClassId, setSavingClassId] = useState<string | null>(null);

  // Deep-Linkable Slide-Over URL state
  const [searchParams, setSearchParams] = useSearchParams();
  const activeClassId = searchParams.get('classId');

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/allocations');
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load allocations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const handleAssignClassTeacher = async (classId: string, teacherId: string) => {
    try {
      setSavingClassId(classId);
      const res = await apiClient.post('/api/allocations/class-teacher', { classId, teacherId });
      toast.success(res.data.message || 'Class teacher assigned successfully');
      fetchAllocations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign class teacher');
    } finally {
      setSavingClassId(null);
    }
  };

  const handleAssignSubjectTeacherDirect = async (classId: string, subjectId: string, teacherId: string) => {
    try {
      const res = await apiClient.post('/api/allocations/subject-teacher', {
        classId,
        subjectId,
        teacherId,
      });
      toast.success(res.data.message || 'Subject teacher allocated successfully');
      await fetchAllocations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to allocate subject teacher');
      throw error;
    }
  };

  const handleOpenSubjectAllocation = (classId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('classId', classId);
    setSearchParams(newParams);
  };

  const handleCloseSubjectAllocation = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('classId');
    setSearchParams(newParams);
  };

  const handleRemoveSubjectAllocation = async (allocationId: string) => {
    try {
      await apiClient.delete(`/api/allocations/subject-teacher/${allocationId}`);
      toast.success('Subject allocation removed');
      fetchAllocations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove allocation');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 sm:space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl shadow-glass">
        <div>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-widest mb-1">
            <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            Deputy Academic Workstation & Allocations
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Class & Teacher Allocation Workspace</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-xl">
            Class Teacher oversight & Subject-qualified teacher allocation across all CBC grades.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center justify-around sm:justify-start gap-2.5 sm:gap-4 p-2.5 sm:px-5 sm:py-3 bg-sky-50/70 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0 shadow-xs">
          <div className="text-center px-2 py-1 sm:p-0">
            <span className="block text-lg sm:text-xl font-bold text-sky-700 dark:text-sky-400 leading-none">{data.classes.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">Classes</span>
          </div>
          <div className="hidden sm:block w-[1px] h-8 bg-sky-200 dark:bg-[#162b4d]" />
          <div className="text-center px-2 py-1 sm:p-0">
            <span className="block text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-400 leading-none">{data.teachers.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">Teachers</span>
          </div>
          <div className="hidden sm:block w-[1px] h-8 bg-sky-200 dark:bg-[#162b4d]" />
          <div className="text-center px-2 py-1 sm:p-0">
            <span className="block text-lg sm:text-xl font-bold text-sky-700 dark:text-sky-400 leading-none">{data.subjects.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">Subjects</span>
          </div>
          <div className="hidden sm:block w-[1px] h-8 bg-sky-200 dark:bg-[#162b4d]" />
          <div className="text-center px-2 py-1 sm:p-0">
            <span className="block text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">{data.subjectAllocations.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">Allocated</span>
          </div>
        </div>
      </div>

      {/* CBC Rules Notice Banner */}
      <div className="p-3.5 sm:p-4 bg-sky-50/70 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-xl sm:rounded-2xl flex items-center gap-3 text-xs text-sky-900 dark:text-sky-200">
        <ShieldAlert className="w-5 h-5 shrink-0 text-sky-600 dark:text-sky-400" />
        <div>
          <strong className="font-bold">CBC Teaching Assignment Logic:</strong>
          <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px] text-sky-800 dark:text-sky-300">
            <li><strong>PPE & Lower Primary (Grades 1–3):</strong> Assigning a Class Teacher automatically allocates them to ALL learning areas for that class.</li>
            <li><strong>Upper Primary & JSS (Grades 4–9):</strong> Subject teachers are allocated individually per subject based on their teaching qualifications.</li>
          </ul>
        </div>
      </div>

      {/* Class Teacher Assignment Table */}
      <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          1. Class Teacher Assignments ({data.classes.length} Classes)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-sky-50/80 dark:bg-[#0c1830] text-sky-900 dark:text-sky-300 font-bold uppercase tracking-wider border-b border-sky-100 dark:border-[#162b4d]">
              <tr>
                <th className="py-3.5 px-4">Class Name</th>
                <th className="py-3.5 px-4">Category Tier</th>
                <th className="py-3.5 px-4">Current Assigned Class Teacher</th>
                <th className="py-3.5 px-4 text-center">Action / Select Teacher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60 dark:divide-[#162b4d]">
              {data.classes.map((cRow) => {
                const cls = cRow.class;
                const currentTeacher = cRow.classTeacher;
                const isLowerCbc = cls.levelCategory === 'PPE' || cls.levelCategory === 'LOWER_PRIMARY';

                return (
                  <tr key={cls.id} className="hover:bg-sky-50/40 dark:hover:bg-[#0f2042] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                      {cls.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-400">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100 dark:bg-[#072648] dark:text-sky-300 dark:border-[#0c4a6e]">
                        {cls.levelCategory} {isLowerCbc ? '(Auto-All Subjects)' : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sky-700 dark:text-sky-300">
                      {currentTeacher ? `${currentTeacher.firstName} ${currentTeacher.lastName}` : <span className="text-slate-400 dark:text-slate-500 italic">Unassigned</span>}
                    </td>
                    <td className="py-3.5 px-4 text-left min-w-[240px]">
                      <SearchableSelect
                        value={currentTeacher?.id || ''}
                        disabled={savingClassId === cls.id}
                        onChange={(val) => handleAssignClassTeacher(cls.id, val)}
                        placeholder="-- Assign Class Teacher --"
                        searchPlaceholder="Search teacher..."
                        options={[
                          { value: '', label: '-- Unassign / None --' },
                          ...data.teachers.map((t) => ({
                            value: t.id,
                            label: `${t.firstName} ${t.lastName}`,
                            sublabel: t.phoneNumber ? `Phone: ${t.phoneNumber}` : (t.email || undefined),
                          })),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Subject Teacher Allocation Workspace (Grades 4-9) */}
      <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-5 shadow-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 dark:border-[#162b4d] pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              2. Subject Teacher Allocations by Grade
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Grade-by-grade subject management with specialist recommendations for Upper Primary & Junior Secondary.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
            {data.subjectAllocations.length} Active Allocations
          </span>
        </div>

        {/* Notice Banner: Pre-Primary & Lower Primary are Auto-Sorted */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-50/90 to-blue-50/60 dark:from-[#0c1830] dark:to-[#0f2042] border border-sky-200/80 dark:border-[#1a335a] rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-500 text-white shadow-xs shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Pre-Primary & Lower Primary Subject Allocation Notice (ECDE & Grades 1–3)
                </h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Auto-Sorted
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Under CBC guidelines, all learning areas for Pre-Primary (Playgroup, PP1, PP2) and Lower Primary (Grades 1–3) are taught exclusively by their assigned <strong>Class Teacher</strong>. These allocations are already sorted and locked automatically. They do not require manual assignment and cannot be changed unless the Class Teacher is reassigned in Section 1.
              </p>

              {/* Status overview for Lower classes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-3 pt-2 border-t border-sky-200/50 dark:border-[#1a335a]">
                {data.classes
                  .filter((c) => {
                    const cat = c.class.levelCategory;
                    return cat === 'PPE' || cat === 'LOWER_PRIMARY' || cat === 'PRIMARY';
                  })
                  .map((c) => {
                    const ct = c.classTeacher;
                    return (
                      <div
                        key={c.class.id}
                        className="p-2.5 rounded-xl bg-white/90 dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] flex items-center justify-between text-xs shadow-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100 block truncate">
                            {c.class.name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                            {c.class.levelCategory.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          {ct ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {ct.firstName} {ct.lastName}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 italic">
                              Unassigned in Sec. 1
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Upper Primary & Junior Secondary Grade-by-Grade List */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Upper Primary & Junior Secondary Grades (Grades 4 – 9)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click <strong>Allocate Subjects</strong> on any grade to open the deep-linkable slide-over panel, inspect CBC curriculum areas, and assign recommended subject specialists.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {data.classes
              .filter((c) => {
                const cat = c.class.levelCategory;
                return cat === 'UPPER_PRIMARY' || cat === 'JUNIOR';
              })
              .map((cRow) => {
                const cls = cRow.class;
                const ct = cRow.classTeacher;
                const classSubjects = data.subjects.filter((s) => s.levelCategory === cls.levelCategory);
                const classAllocations = data.subjectAllocations.filter((sa) => sa.class.id === cls.id);
                const totalCount = classSubjects.length;
                const allocatedCount = classAllocations.length;
                const isComplete = totalCount > 0 && allocatedCount >= totalCount;
                const percent = totalCount > 0 ? Math.round((allocatedCount / totalCount) * 100) : 0;
                const isCurrentActive = activeClassId === cls.id;

                return (
                  <div
                    key={cls.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrentActive
                        ? 'bg-sky-500/5 dark:bg-sky-500/10 border-sky-400 dark:border-sky-500 ring-2 ring-sky-400/30'
                        : 'bg-white dark:bg-[#091326] border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-700'
                    } shadow-xs space-y-3`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-sky-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {cls.name[0] || 'G'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">
                              {cls.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                              {cls.levelCategory.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            <span>Class Teacher: </span>
                            {ct ? (
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {ct.firstName} {ct.lastName}
                              </span>
                            ) : (
                              <span className="italic text-amber-600 dark:text-amber-400 font-medium">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {isComplete ? 'Fully Allocated' : `${allocatedCount}/${totalCount} Subjects`}
                      </span>
                    </div>

                    {/* Subject Completion Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>Subject Coverage</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isComplete ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-[#162b4d]">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        {totalCount} learning areas
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenSubjectAllocation(cls.id)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-glass flex items-center gap-1.5 transition-all cursor-pointer group ${
                          isCurrentActive
                            ? 'bg-sky-600 text-white'
                            : 'bg-sky-500 hover:bg-sky-600 text-white'
                        }`}
                      >
                        <span>Allocate Subjects</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 3. Official Subjects & Learning Areas by Class Level */}
      <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-5 shadow-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 dark:border-[#162b4d] pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              3. Official Subjects & Learning Areas by Class Level ({data.subjects.length} Total Subjects)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Standard Competency Based Curriculum (CBC) learning areas registered at Eldoret Muslim Academy.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
            4 Level Tiers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tier 1: Pre-Primary */}
          <div className="p-3.5 bg-sky-50/50 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                ECDE / Pre-Primary (Playgroup, PP1, PP2)
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {data.subjects.filter((s) => s.levelCategory === 'PPE').length} Areas
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {data.subjects.filter((s) => s.levelCategory === 'PPE').map((sub) => (
                <div key={sub.id} className="p-2 rounded-xl bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] flex items-center justify-between text-xs shadow-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{sub.name}</span>
                  <span className="ml-1 text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0">{sub.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tier 2: Lower Primary */}
          <div className="p-3.5 bg-sky-50/50 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Lower Primary (Grades 1 – 3)
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                {data.subjects.filter((s) => s.levelCategory === 'LOWER_PRIMARY' || s.levelCategory === 'PRIMARY').length} Areas
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {data.subjects.filter((s) => s.levelCategory === 'LOWER_PRIMARY' || s.levelCategory === 'PRIMARY').map((sub) => (
                <div key={sub.id} className="p-2 rounded-xl bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] flex items-center justify-between text-xs shadow-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{sub.name}</span>
                  <span className="ml-1 text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0">{sub.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tier 3: Upper Primary */}
          <div className="p-3.5 bg-sky-50/50 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                Upper Primary (Grades 4 – 6)
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {data.subjects.filter((s) => s.levelCategory === 'UPPER_PRIMARY').length} Areas
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {data.subjects.filter((s) => s.levelCategory === 'UPPER_PRIMARY').map((sub) => (
                <div key={sub.id} className="p-2 rounded-xl bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] flex items-center justify-between text-xs shadow-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{sub.name}</span>
                  <span className="ml-1 text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0">{sub.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tier 4: Junior Secondary */}
          <div className="p-3.5 bg-sky-50/50 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Junior Secondary (Grades 7 – 9)
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {data.subjects.filter((s) => s.levelCategory === 'JUNIOR').length} Areas
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {data.subjects.filter((s) => s.levelCategory === 'JUNIOR').map((sub) => (
                <div key={sub.id} className="p-2 rounded-xl bg-white dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] flex items-center justify-between text-xs shadow-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{sub.name}</span>
                  <span className="ml-1 text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 shrink-0">{sub.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Deep-Linkable Slide-Over Panel for Selected Class Subject Allocations */}
      <ClassSubjectAllocationSlideOver
        isOpen={Boolean(activeClassId)}
        onClose={handleCloseSubjectAllocation}
        classId={activeClassId}
        classes={data.classes}
        subjects={data.subjects}
        teachers={data.teachers}
        qualifications={data.qualifications}
        subjectAllocations={data.subjectAllocations}
        onAssignSubjectTeacher={handleAssignSubjectTeacherDirect}
        onRemoveSubjectAllocation={handleRemoveSubjectAllocation}
      />
    </motion.div>
  );
};
