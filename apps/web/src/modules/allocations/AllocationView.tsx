import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, CheckCircle, ShieldAlert, Plus, Trash2, UserCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 text-white rounded-3xl shadow-xl border border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
            <BookOpen className="w-4 h-4" />
            Deputy Academic Workstation & Allocations
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Class & Teacher Allocation Workspace</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium max-w-xl">
            Class Teacher oversight & Subject-qualified teacher allocation across all CBC grades.
          </p>
        </div>

        <div className="flex items-center gap-4 px-5 py-3 bg-slate-900/80 border border-slate-800 rounded-2xl backdrop-blur-md shrink-0">
          <div className="text-center">
            <span className="block text-xl font-bold text-blue-400 leading-none">{data.classes.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-1 block">Classes</span>
          </div>
          <div className="w-[1px] h-8 bg-slate-800" />
          <div className="text-center">
            <span className="block text-xl font-bold text-emerald-400 leading-none">{data.teachers.length}</span>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mt-1 block">Teachers</span>
          </div>
        </div>
      </div>

      {/* CBC Rules Notice Banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center gap-3 text-xs text-blue-900 dark:text-blue-300">
        <ShieldAlert className="w-5 h-5 shrink-0 text-blue-600" />
        <div>
          <strong className="font-bold">CBC Teaching Assignment Logic:</strong>
          <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[11px] text-blue-800 dark:text-blue-300">
            <li><strong>PPE & Lower Primary (Grades 1–3):</strong> Assigning a Class Teacher automatically allocates them to ALL learning areas for that class.</li>
            <li><strong>Upper Primary & JSS (Grades 4–9):</strong> Subject teachers are allocated individually per subject based on their teaching qualifications.</li>
          </ul>
        </div>
      </div>

      {/* Class Teacher Assignment Table */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-blue-600" />
          1. Class Teacher Assignments ({data.classes.length} Classes)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Class Name</th>
                <th className="py-3.5 px-4">Category Tier</th>
                <th className="py-3.5 px-4">Current Assigned Class Teacher</th>
                <th className="py-3.5 px-4 text-center">Action / Select Teacher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.classes.map((cRow) => {
                const cls = cRow.class;
                const currentTeacher = cRow.classTeacher;
                const isLowerCbc = cls.levelCategory === 'PPE' || cls.levelCategory === 'LOWER_PRIMARY';

                return (
                  <tr key={cls.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {cls.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-500">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isLowerCbc ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {cls.levelCategory} {isLowerCbc ? '(Auto-All Subjects)' : ''}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400">
                      {currentTeacher ? `${currentTeacher.firstName} ${currentTeacher.lastName}` : <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={currentTeacher?.id || ''}
                        disabled={savingClassId === cls.id}
                        onChange={(e) => handleAssignClassTeacher(cls.id, e.target.value)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                      >
                        <option value="">-- Assign Class Teacher --</option>
                        {data.teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} ({t.email})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subject Teacher Allocation Workspace (Grades 4-9) */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          2. Subject Teacher Allocations ({data.subjectAllocations.length} Active Allocations)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Class</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Allocated Teacher</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.subjectAllocations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                    No subject allocations recorded yet. Assign class teachers or allocate subject teachers.
                  </td>
                </tr>
              ) : (
                data.subjectAllocations.map((alloc) => (
                  <tr key={alloc.allocation.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {alloc.class.name}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-indigo-600 dark:text-indigo-400">
                      {alloc.subject.name} ({alloc.subject.code})
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {alloc.teacher.firstName} {alloc.teacher.lastName}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleRemoveSubjectAllocation(alloc.allocation.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
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
