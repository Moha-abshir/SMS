import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen, Users, CheckCircle, ShieldAlert, Plus, Trash2, UserCheck,
  CheckCircle2, AlertCircle, ArrowRight, Layers, Sparkles, SlidersHorizontal,
  Info, ShieldCheck, Award
} from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { SearchableSelect } from '../../components/SearchableSelect';
import { ClassSubjectAllocationSlideOver } from './ClassSubjectAllocationSlideOver';
import { PageLoadingWrapper } from '../../components/PageLoadingProgress';

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

  const fetchAllocations = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await apiClient.get('/api/allocations');
      if (res.data.data) {
        setData(res.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load allocations');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations(true);
  }, []);

  const handleAssignClassTeacher = async (classId: string, teacherId: string) => {
    try {
      setSavingClassId(classId);

      // Optimistically update classTeacher in local state
      const targetTeacher = data.teachers.find((t) => t.id === teacherId);
      setData((prev) => ({
        ...prev,
        classes: prev.classes.map((c) =>
          c.class.id === classId
            ? {
                ...c,
                class: { ...c.class, classTeacherId: teacherId || null },
                classTeacher: targetTeacher
                  ? {
                      id: targetTeacher.id,
                      firstName: targetTeacher.firstName,
                      lastName: targetTeacher.lastName,
                    }
                  : null,
              }
            : c
        ),
      }));

      const res = await apiClient.post('/api/allocations/class-teacher', { classId, teacherId });
      toast.success(res.data.message || 'Class teacher assigned successfully', { autoClose: 1500 });
      await fetchAllocations(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign class teacher');
      await fetchAllocations(false);
    } finally {
      setSavingClassId(null);
    }
  };

  const handleAssignSubjectTeacherDirect = async (classId: string, subjectId: string, teacherId: string) => {
    const prevAllocations = data.subjectAllocations;

    const targetTeacher = data.teachers.find((t) => t.id === teacherId);
    const targetSubject = data.subjects.find((s) => s.id === subjectId);
    const targetClassRow = data.classes.find((c) => c.class.id === classId);
    const targetClass = targetClassRow?.class;

    if (!targetTeacher || !targetSubject || !targetClass) {
      return;
    }

    const existingIndex = prevAllocations.findIndex(
      (sa) => sa.class.id === classId && sa.subject.id === subjectId
    );

    const tempAllocationId = existingIndex >= 0
      ? prevAllocations[existingIndex].allocation.id
      : `temp-${Date.now()}`;

    const optimisticRecord = {
      allocation: {
        id: tempAllocationId,
        classId,
        subjectId,
        teacherId,
        academicYear: data.academicYear,
      },
      teacher: {
        id: targetTeacher.id,
        firstName: targetTeacher.firstName,
        lastName: targetTeacher.lastName,
        email: targetTeacher.email || '',
        phoneNumber: targetTeacher.phoneNumber || '',
      },
      subject: targetSubject,
      class: targetClass,
    };

    let nextAllocations = [...prevAllocations];
    if (existingIndex >= 0) {
      nextAllocations[existingIndex] = optimisticRecord;
    } else {
      nextAllocations.push(optimisticRecord);
    }

    setData((prev) => ({
      ...prev,
      subjectAllocations: nextAllocations,
    }));

    try {
      const res = await apiClient.post('/api/allocations/subject', {
        classId,
        subjectId,
        teacherId,
        academicYear: data.academicYear,
      });
      toast.success(res.data.message || 'Subject teacher assigned successfully', { autoClose: 1500 });
      await fetchAllocations(false);
    } catch (error: any) {
      setData((prev) => ({
        ...prev,
        subjectAllocations: prevAllocations,
      }));
      toast.error(error.response?.data?.message || 'Failed to assign subject teacher');
    }
  };

  const handleOpenSubjectAllocation = (classId: string) => {
    setSearchParams({ classId });
  };

  const handleCloseSubjectAllocation = () => {
    setSearchParams({});
  };

  const handleRemoveSubjectAllocation = async (allocationId: string) => {
    const prevAllocations = data.subjectAllocations;
    setData((prev) => ({
      ...prev,
      subjectAllocations: prev.subjectAllocations.filter((sa) => sa.allocation.id !== allocationId),
    }));

    try {
      const res = await apiClient.delete(`/api/allocations/subject/${allocationId}`);
      toast.success(res.data.message || 'Allocation removed successfully', { autoClose: 1500 });
      await fetchAllocations(false);
    } catch (error: any) {
      setData((prev) => ({
        ...prev,
        subjectAllocations: prevAllocations,
      }));
      toast.error(error.response?.data?.message || 'Failed to remove allocation');
    }
  };

  return (
    <PageLoadingWrapper
      isLoading={loading}
      title="Class & Subject Allocations"
      subtitle="Loading academic streams, educator qualifications, and teaching assignments..."
      icon={Layers}
    >
      <div className="space-y-3.5 max-w-7xl mx-auto">
        {/* 1. Flattened Header Row (Max Height: ~48px) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          {/* Left: Role title + user details + active term badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Class & Teacher Allocation Workspace
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                Deputy Academic Oversight
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                {data.academicYear} Academic Year
              </span>
            </div>
          </div>

          {/* Right: Quick allocation status */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] text-xs font-semibold text-slate-600 dark:text-slate-300 shadow-xs">
              {data.subjectAllocations.length} Active Assignments
            </span>
          </div>
        </div>

        {/* 2. Sleek Metric Ribbon (Max Height: ~44px) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a]/70 px-3 py-2 text-xs shadow-xs">
          {/* Slot 1: Classes */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <Layers className="w-4 h-4 text-sky-500 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.classes.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Classes
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">Active CBC Streams</span>
            </div>
          </div>

          {/* Slot 2: Teachers */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <Users className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.teachers.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Teachers
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">Teaching Staff Directory</span>
            </div>
          </div>

          {/* Slot 3: Subjects */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-tight font-mono">
                  {data.subjects.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Subjects
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">Curriculum Learning Areas</span>
            </div>
          </div>

          {/* Slot 4: Allocations */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <Award className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm leading-tight font-mono">
                  {data.subjectAllocations.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Allocated
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block">Subject Assignments</span>
            </div>
          </div>
        </div>

        {/* 3. Compact CBC Assignment Rules Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 text-xs text-sky-900 dark:text-sky-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>
              <strong>CBC Assignment Logic:</strong> Pre-Primary & Lower Primary (G1–3) auto-assign all subjects to Class Teacher. Upper Primary & JSS (G4–9) allocate per subject based on qualifications.
            </span>
          </div>
          <span className="text-[10px] text-sky-700 dark:text-sky-400 font-bold uppercase tracking-wider shrink-0">
            Official Standard
          </span>
        </div>

        {/* 4. Section 1: Class Teacher Assignments (High-Density Table) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                1. Class Teacher Assignments ({data.classes.length} Classes)
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Form / Homeroom In-Charge
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3.5">Class Name</th>
                  <th className="py-2.5 px-3.5">Category Tier</th>
                  <th className="py-2.5 px-3.5">Current Assigned Class Teacher</th>
                  <th className="py-2.5 px-3.5 text-center min-w-[240px]">Action / Select Teacher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {data.classes.map((cRow) => {
                  const cls = cRow.class;
                  const currentTeacher = cRow.classTeacher;
                  const isLowerCbc = cls.levelCategory === 'PPE' || cls.levelCategory === 'LOWER_PRIMARY';

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3.5 font-bold text-slate-900 dark:text-slate-100">
                        {cls.name}
                      </td>
                      <td className="py-2 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {cls.levelCategory?.replace(/_/g, ' ')} {isLowerCbc ? '(Auto-All Subjects)' : ''}
                        </span>
                      </td>
                      <td className="py-2 px-3.5 font-semibold text-sky-700 dark:text-sky-300">
                        {currentTeacher ? (
                          `${currentTeacher.firstName} ${currentTeacher.lastName}`
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2 px-3.5 text-left">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
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
                          </div>
                          {savingClassId === cls.id && (
                            <div
                              className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin shrink-0"
                              title="Saving..."
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Section 2: Subject Teacher Allocations by Grade (Grades 4-9) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] p-3.5 space-y-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  2. Subject Teacher Allocations (Upper Primary & Junior Secondary: Grades 4 – 9)
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Assign qualified subject specialists per learning area.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              {data.subjectAllocations.length} Active Subject Assignments
            </span>
          </div>

          {/* Upper Primary & Junior Secondary Grade-by-Grade Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
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
                    className={`p-3 rounded-lg border transition-all ${
                      isCurrentActive
                        ? 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-400 dark:border-sky-500 ring-1 ring-sky-400/30'
                        : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 hover:border-sky-300 dark:hover:border-sky-700'
                    } shadow-2xs space-y-2`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {cls.name}
                          </h4>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                            {cls.levelCategory.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          <span>CT: </span>
                          {ct ? (
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {ct.firstName} {ct.lastName}
                            </span>
                          ) : (
                            <span className="italic text-amber-600 dark:text-amber-400">Unassigned</span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {isComplete ? 'Complete' : `${allocatedCount}/${totalCount}`}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span>Coverage</span>
                        <span className="font-bold">{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isComplete ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-400">
                        {totalCount} learning areas
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenSubjectAllocation(cls.id)}
                        className={`px-2.5 py-1 rounded-md font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                          isCurrentActive
                            ? 'bg-sky-600 text-white'
                            : 'bg-sky-600 hover:bg-sky-500 text-white'
                        }`}
                      >
                        <span>Allocate</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 6. Section 3: Official CBC Learning Areas Directory (Compact) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1830] p-3.5 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                3. Registered CBC Learning Areas ({data.subjects.length} Total Subjects)
              </h2>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              4 Level Categories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* ECDE / Pre-Primary */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Pre-Primary (PPE)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {data.subjects.filter((s) => s.levelCategory === 'PPE').length} Areas
                </span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {data.subjects.filter((s) => s.levelCategory === 'PPE').map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className="text-slate-600 dark:text-slate-300 truncate">{sub.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">{sub.code}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lower Primary */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Lower Primary (G1–3)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                  {data.subjects.filter((s) => s.levelCategory === 'LOWER_PRIMARY' || s.levelCategory === 'PRIMARY').length} Areas
                </span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {data.subjects.filter((s) => s.levelCategory === 'LOWER_PRIMARY' || s.levelCategory === 'PRIMARY').map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className="text-slate-600 dark:text-slate-300 truncate">{sub.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">{sub.code}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upper Primary */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Upper Primary (G4–6)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                  {data.subjects.filter((s) => s.levelCategory === 'UPPER_PRIMARY').length} Areas
                </span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {data.subjects.filter((s) => s.levelCategory === 'UPPER_PRIMARY').map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className="text-slate-600 dark:text-slate-300 truncate">{sub.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">{sub.code}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Junior Secondary */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Junior Sec (G7–9)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {data.subjects.filter((s) => s.levelCategory === 'JUNIOR').length} Areas
                </span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {data.subjects.filter((s) => s.levelCategory === 'JUNIOR').map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between text-[11px] py-0.5">
                    <span className="text-slate-600 dark:text-slate-300 truncate">{sub.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">{sub.code}</span>
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
      </div>
    </PageLoadingWrapper>
  );
};

export default AllocationView;
