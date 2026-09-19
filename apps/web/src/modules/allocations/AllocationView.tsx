import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, CheckCircle, ShieldAlert, Plus, Trash2, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { SearchableSelect } from '../../components/SearchableSelect';

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

  const handleAssignSubjectTeacher = async (classId: string, subjectId: string, teacherId: string) => {
    try {
      const res = await apiClient.post('/api/allocations/subject-teacher', { classId, subjectId, teacherId });
      toast.success(res.data.message || 'Subject teacher allocated successfully');
      fetchAllocations();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to allocate subject teacher');
    }
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

        <div className="flex items-center justify-around sm:justify-start gap-4 px-4 sm:px-5 py-2.5 sm:py-3 bg-sky-50/70 dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-xl sm:rounded-2xl backdrop-blur-md w-full sm:w-auto shrink-0 shadow-xs">
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-sky-700 dark:text-sky-400 leading-none">{data.classes.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">Classes</span>
          </div>
          <div className="w-[1px] h-8 bg-sky-200 dark:bg-[#162b4d]" />
          <div className="text-center">
            <span className="block text-lg sm:text-xl font-bold text-sky-600 dark:text-sky-400 leading-none">{data.teachers.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase mt-1 block">Teachers</span>
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

      {/* Subject Teacher Allocation Workspace (Grades 4-9) */}
      <div className="p-4 sm:p-6 bg-white/85 dark:bg-[#091326]/90 backdrop-blur-md border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl space-y-4 shadow-glass">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          2. Subject Teacher Allocations ({data.subjectAllocations.length} Active Allocations)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[580px]">
            <thead className="bg-sky-50/80 dark:bg-[#0c1830] text-sky-900 dark:text-sky-300 font-bold uppercase tracking-wider border-b border-sky-100 dark:border-[#162b4d]">
              <tr>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Allocated Teacher</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/60 dark:divide-[#162b4d]">
              {data.subjectAllocations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
                    No subject allocations recorded yet. Assign class teachers or allocate subject teachers.
                  </td>
                </tr>
              ) : (
                data.subjectAllocations.map((alloc) => (
                  <tr key={alloc.allocation.id} className="hover:bg-sky-50/40 dark:hover:bg-[#0f2042] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                      {alloc.class.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-sky-700 dark:text-sky-300">
                      {alloc.subject.name} ({alloc.subject.code})
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-200">
                      {alloc.teacher.firstName} {alloc.teacher.lastName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleRemoveSubjectAllocation(alloc.allocation.id)}
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                        title="Remove allocation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
