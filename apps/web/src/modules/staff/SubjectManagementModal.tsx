import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { sanitizeErrorMessage } from '../../lib/formatters';
import { Modal } from '../../components/Modal';

interface Subject {
  id: string;
  name: string;
  code: string;
  levelCategory: 'PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR' | 'PPE';
}

interface SubjectManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubjectsUpdated?: () => void;
}

export const SubjectManagementModal: React.FC<SubjectManagementModalProps> = ({
  isOpen,
  onClose,
  onSubjectsUpdated,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New/Edit subject form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [levelCategory, setLevelCategory] = useState<'PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR' | 'PPE'>('PRIMARY');

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/subjects');
      setSubjects(res.data.data);
    } catch (error: any) {
      toast.error(sanitizeErrorMessage(error.response?.data?.message) || 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setLevelCategory('PRIMARY');
  };

  const handleEditClick = (sub: Subject) => {
    setEditingId(sub.id);
    setName(sub.name);
    setCode(sub.code);
    setLevelCategory(sub.levelCategory);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Subject Name and Code are required');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await apiClient.put(`/api/subjects/${editingId}`, { name, code, levelCategory });
        toast.success('Subject updated successfully');
      } else {
        await apiClient.post('/api/subjects', { name, code, levelCategory });
        toast.success('Subject registered successfully');
      }

      resetForm();
      fetchSubjects();
      if (onSubjectsUpdated) onSubjectsUpdated();
    } catch (error: any) {
      const msg = sanitizeErrorMessage(error.response?.data?.message || 'Failed to save subject');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, subName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${subName}"?`)) return;

    try {
      await apiClient.delete(`/api/subjects/${id}`);
      toast.success(`Subject "${subName}" deleted`);
      fetchSubjects();
      if (onSubjectsUpdated) onSubjectsUpdated();
    } catch (error: any) {
      toast.error(sanitizeErrorMessage(error.response?.data?.message) || 'Failed to delete subject');
    }
  };

  // Group subjects by category
  const primarySubjects = subjects.filter((s) => s.levelCategory === 'PRIMARY' || s.levelCategory === 'LOWER_PRIMARY' || s.levelCategory === 'UPPER_PRIMARY');
  const juniorSubjects = subjects.filter((s) => s.levelCategory === 'JUNIOR');
  const ppeSubjects = subjects.filter((s) => s.levelCategory === 'PPE');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="School Subject Management" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Intro banner */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center gap-3 text-xs text-blue-900 dark:text-blue-300">
          <BookOpen className="w-5 h-5 shrink-0 text-blue-600" />
          <p>
            Manage all subjects taught at Eldoret Muslim Academy. Defined subjects can be assigned to teachers for examination marking, class allocation, and timetable scheduling.
          </p>
        </div>

        {/* Add/Edit Subject Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {editingId ? 'Edit Subject' : 'Add New Subject'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mathematics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Code / Abbr *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MATH"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs uppercase font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Level Category *
              </label>
              <select
                value={levelCategory}
                onChange={(e) => setLevelCategory(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="PRIMARY">Primary (Class 1–6)</option>
                <option value="LOWER_PRIMARY">Lower Primary (Grades 1–3)</option>
                <option value="UPPER_PRIMARY">Upper Primary (Grades 4–6)</option>
                <option value="JUNIOR">Junior Secondary (Grade 7–9)</option>
                <option value="PPE">Pre-Primary (PPE / Nursery)</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
              >
                {submitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {editingId ? 'Update' : 'Add Subject'}
              </button>
            </div>
          </div>
        </form>

        {/* Subjects List by Category */}
        {loading ? (
          <div className="py-8 text-center text-slate-400">Loading subject catalog...</div>
        ) : (
          <div className="space-y-6 max-h-[450px] overflow-y-auto pr-1">
            {/* Primary Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs rounded-lg inline-block">
                  Primary Level (Class 1–6) ({primarySubjects.length} Subjects)
                </span>
              </div>
              {primarySubjects.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-2">No subjects registered for this level yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {primarySubjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs shadow-xs hover:border-blue-500/50 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">{sub.name}</span>
                        <span className="mt-1 inline-block font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                          {sub.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditClick(sub)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Junior Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-extrabold text-xs rounded-lg inline-block">
                  Junior Secondary (Grade 7–9) ({juniorSubjects.length} Subjects)
                </span>
              </div>
              {juniorSubjects.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-2">No subjects registered for this level yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {juniorSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs shadow-xs hover:border-blue-500/50 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">{sub.name}</span>
                        <span className="mt-1 inline-block font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                          {sub.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditClick(sub)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PPE Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-extrabold text-xs rounded-lg inline-block">
                  PPE (Pre-Primary / Nursery) ({ppeSubjects.length} Subjects)
                </span>
              </div>
              {ppeSubjects.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-2">No subjects registered for this level yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {ppeSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs shadow-xs hover:border-blue-500/50 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">{sub.name}</span>
                        <span className="mt-1 inline-block font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                          {sub.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditClick(sub)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
