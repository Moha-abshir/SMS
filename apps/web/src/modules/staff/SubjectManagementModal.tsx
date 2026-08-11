import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';
import { Modal } from '../../components/Modal';

interface Subject {
  id: string;
  name: string;
  code: string;
  levelCategory: 'PRIMARY' | 'JUNIOR' | 'PPE';
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
  const [levelCategory, setLevelCategory] = useState<'PRIMARY' | 'JUNIOR' | 'PPE'>('PRIMARY');

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/subjects');
      setSubjects(res.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch subjects');
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
      toast.error('Name and Code are required');
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await apiClient.put(`/api/subjects/${editingId}`, { name, code, levelCategory });
        toast.success('Subject updated successfully');
      } else {
        await apiClient.post('/api/subjects', { name, code, levelCategory });
        toast.success('Subject added successfully');
      }

      resetForm();
      fetchSubjects();
      if (onSubjectsUpdated) onSubjectsUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save subject');
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
      toast.error(error.response?.data?.message || 'Failed to delete subject');
    }
  };

  const categories: { label: string; value: 'PRIMARY' | 'JUNIOR' | 'PPE'; color: string }[] = [
    {
      label: 'Primary (Class 1–6)',
      value: 'PRIMARY',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
    },
    {
      label: 'Junior Secondary (Grade 7–9)',
      value: 'JUNIOR',
      color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50',
    },
    {
      label: 'PPE (Pre-Primary / Nursery)',
      value: 'PPE',
      color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="School Subject Management" maxWidth="max-w-3xl">
      <div className="space-y-6">
        
        {/* Header callout */}
        <div className="flex items-center gap-3 p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl">
          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            Manage all subjects taught at Eldoret Muslim Academy. Defined subjects can be assigned to teachers for examination marking, class allocation, and timetable scheduling.
          </p>
        </div>

        {/* Add/Edit Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {editingId ? 'Edit Subject' : 'Add New Subject'}
            </h4>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Mathematics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Code / Abbr *</label>
              <input
                type="text"
                required
                placeholder="e.g. MATH"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white uppercase outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Level Category *</label>
              <select
                value={levelCategory}
                onChange={(e) => setLevelCategory(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors"
              >
                <option value="PRIMARY">Primary</option>
                <option value="JUNIOR">Junior Secondary</option>
                <option value="PPE">Pre-Primary (PPE)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
            >
              {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {editingId ? 'Update Subject' : 'Add Subject'}
            </button>
          </div>
        </form>

        {/* Subject Directory Categorized List */}
        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1">
          {categories.map((cat) => {
            const catSubjects = subjects.filter((s) => s.levelCategory === cat.value);
            return (
              <div key={cat.value} className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${cat.color}`}>
                    {cat.label} ({catSubjects.length})
                  </span>
                </div>

                {catSubjects.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2 pl-2">No subjects registered for this level yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catSubjects.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-blue-700 dark:text-blue-400 rounded">
                            {sub.code}
                          </span>
                          <span className="text-xs font-medium text-slate-900 dark:text-white">{sub.name}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditClick(sub)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(sub.id, sub.name)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
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
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
