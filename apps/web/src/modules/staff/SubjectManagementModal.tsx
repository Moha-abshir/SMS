import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, Check, X, Layers, ListPlus } from 'lucide-react';
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

interface BulkRow {
  name: string;
  code: string;
}

export const SubjectManagementModal: React.FC<SubjectManagementModalProps> = ({
  isOpen,
  onClose,
  onSubjectsUpdated,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form mode: 'single' vs 'bulk'
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('bulk');

  // Single Add / Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [levelCategory, setLevelCategory] = useState<'PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR' | 'PPE'>('PPE');

  // Bulk Add state
  const [bulkLevelCategory, setBulkLevelCategory] = useState<'PRIMARY' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR' | 'PPE'>('PPE');
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([
    { name: '', code: '' },
    { name: '', code: '' },
    { name: '', code: '' },
  ]);

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
    setLevelCategory('PPE');
    setBulkLevelCategory('PPE');
    setBulkRows([
      { name: '', code: '' },
      { name: '', code: '' },
      { name: '', code: '' },
    ]);
  };

  const handleEditClick = (sub: Subject) => {
    setAddMode('single');
    setEditingId(sub.id);
    setName(sub.name);
    setCode(sub.code);
    setLevelCategory(sub.levelCategory);
  };

  // Single Subject Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
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

  // Bulk Subjects Submit
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = bulkRows.filter((r) => r.name.trim() && r.code.trim());

    if (validRows.length === 0) {
      toast.error('Please enter at least one subject name and code');
      return;
    }

    const payload = validRows.map((r) => ({
      name: r.name.trim(),
      code: r.code.trim(),
      levelCategory: bulkLevelCategory,
    }));

    try {
      setSubmitting(true);
      const res = await apiClient.post('/api/subjects', { subjects: payload });
      const count = res.data.addedCount ?? validRows.length;
      toast.success(`Successfully added ${count} subject(s)!`);

      resetForm();
      fetchSubjects();
      if (onSubjectsUpdated) onSubjectsUpdated();
    } catch (error: any) {
      toast.error(sanitizeErrorMessage(error.response?.data?.message) || 'Failed to save bulk subjects');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBulkRow = () => {
    setBulkRows((prev) => [...prev, { name: '', code: '' }]);
  };

  const handleRemoveBulkRow = (index: number) => {
    if (bulkRows.length <= 1) return;
    setBulkRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkRowChange = (index: number, field: 'name' | 'code', value: string) => {
    setBulkRows((prev) => {
      const copy = [...prev];
      copy[index][field] = value;
      // Auto-generate code from name if code is untouched
      if (field === 'name' && (!copy[index].code || copy[index].code === value.slice(0, -1).toUpperCase())) {
        copy[index].code = value.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
      }
      return copy;
    });
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

  // Group subjects by 4 distinct official school levels
  const ppeSubjects = subjects.filter((s) => s.levelCategory === 'PPE');
  const lowerPrimarySubjects = subjects.filter((s) => s.levelCategory === 'LOWER_PRIMARY' || s.levelCategory === 'PRIMARY');
  const upperPrimarySubjects = subjects.filter((s) => s.levelCategory === 'UPPER_PRIMARY');
  const juniorSubjects = subjects.filter((s) => s.levelCategory === 'JUNIOR');

  const categories = [
    { title: 'ECDE / Pre-Primary (Playgroup, PP1, PP2)', data: ppeSubjects },
    { title: 'Lower Primary (Grades 1 – 3)', data: lowerPrimarySubjects },
    { title: 'Upper Primary (Grades 4 – 6)', data: upperPrimarySubjects },
    { title: 'Junior Secondary (Grades 7 – 9)', data: juniorSubjects },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="School Subject Management" maxWidth="max-w-4xl">
      <div className="space-y-5">
        {/* Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl">
          <div className="flex items-center gap-2.5 text-xs text-sky-900">
            <BookOpen className="w-4 h-4 shrink-0 text-sky-600" />
            <span className="font-semibold">Manage subjects taught at Eldoret Muslim Academy across 4 school levels.</span>
          </div>

          <div className="flex items-center gap-1 bg-white/90 p-1 rounded-xl border border-sky-100 w-full sm:w-auto shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => { setAddMode('bulk'); resetForm(); }}
              className={`flex-1 sm:flex-none justify-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                addMode === 'bulk'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" /> Batch Add Multiple
            </button>
            <button
              type="button"
              onClick={() => { setAddMode('single'); resetForm(); }}
              className={`flex-1 sm:flex-none justify-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                addMode === 'single'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> {editingId ? 'Edit Subject' : 'Single Add'}
            </button>
          </div>
        </div>

        {/* Batch / Bulk Add Form */}
        {addMode === 'bulk' ? (
          <form onSubmit={handleBulkSubmit} className="p-3.5 sm:p-4 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl space-y-3.5 shadow-glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-sky-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ListPlus className="w-4 h-4 text-sky-600" /> Batch Add Multiple Subjects At Once
              </h4>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                <label className="text-xs font-semibold text-slate-600 shrink-0">
                  Target Level:
                </label>
                <select
                  value={bulkLevelCategory}
                  onChange={(e) => setBulkLevelCategory(e.target.value as any)}
                  className="bg-white border border-sky-100 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 w-full sm:w-auto focus:border-sky-500 outline-none"
                >
                  <option value="PPE">ECDE / Pre-Primary (Playgroup, PP1, PP2)</option>
                  <option value="LOWER_PRIMARY">Lower Primary (Grades 1 – 3)</option>
                  <option value="UPPER_PRIMARY">Upper Primary (Grades 4 – 6)</option>
                  <option value="JUNIOR">Junior Secondary (Grades 7 – 9)</option>
                </select>
              </div>
            </div>

            {/* Dynamic Rows Table */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {bulkRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[11px] font-bold text-slate-400 w-4 sm:w-5 text-right shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    placeholder="Subject Name (e.g. Mathematics)"
                    value={row.name}
                    onChange={(e) => handleBulkRowChange(idx, 'name', e.target.value)}
                    className="flex-1 min-w-0 bg-white border border-sky-100 rounded-xl px-2.5 sm:px-3 py-2 text-xs text-slate-800 focus:border-sky-500 outline-none"
                  />
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="Code (e.g. LP-MATH)"
                    value={row.code}
                    onChange={(e) => handleBulkRowChange(idx, 'code', e.target.value)}
                    className="w-24 sm:w-36 shrink-0 bg-white border border-sky-100 rounded-xl px-2 sm:px-2.5 py-2 text-xs uppercase font-mono font-bold text-slate-800 focus:border-sky-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveBulkRow(idx)}
                    disabled={bulkRows.length <= 1}
                    className="p-1.5 sm:p-2 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-lg transition-colors shrink-0"
                    title="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-sky-100">
              <button
                type="button"
                onClick={handleAddBulkRow}
                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100/80 text-sky-700 font-bold text-xs rounded-xl flex items-center gap-1 border border-sky-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Row
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center gap-1.5 transition-all"
              >
                {submitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save All Subjects ({bulkRows.filter((r) => r.name.trim()).length})
              </button>
            </div>
          </form>
        ) : (
          /* Single Add / Edit Subject Form — Optimally Spaced Grid */
          <form onSubmit={handleSingleSubmit} className="p-4 bg-white/80 backdrop-blur-md border border-sky-100 rounded-2xl space-y-3.5 shadow-glass">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              {editingId ? 'Edit Subject' : 'Add Single Subject'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3 py-2 text-xs text-slate-800 focus:border-sky-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  placeholder="e.g. LP-MATH"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-white border border-sky-100 rounded-xl px-2.5 py-2 text-xs uppercase font-mono font-bold text-slate-800 focus:border-sky-500 outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Level Category *
                </label>
                <select
                  value={levelCategory}
                  onChange={(e) => setLevelCategory(e.target.value as any)}
                  className="w-full bg-white border border-sky-100 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:border-sky-500 outline-none"
                >
                  <option value="PPE">ECDE / Pre-Primary (Playgroup, PP1, PP2)</option>
                  <option value="LOWER_PRIMARY">Lower Primary (Grades 1 – 3)</option>
                  <option value="UPPER_PRIMARY">Upper Primary (Grades 4 – 6)</option>
                  <option value="JUNIOR">Junior Secondary (Grades 7 – 9)</option>
                </select>
              </div>

              <div className="sm:col-span-3 flex items-center justify-end gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-2 bg-white border border-sky-200 hover:bg-sky-50 text-slate-700 font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 px-3.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-glass flex items-center justify-center gap-1.5 transition-all whitespace-nowrap"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingId ? 'Update Subject' : 'Add Subject'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Subjects List by Category — Minimal Ultra-Compact Row Design */}
        {loading ? (
          <div className="py-8 text-center text-slate-400">Loading subject catalog...</div>
        ) : (
          <div className="space-y-5">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between border-b border-sky-100 pb-1">
                  <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 font-extrabold text-[11px] rounded-md inline-block border border-sky-100">
                    {cat.title} ({cat.data.length})
                  </span>
                </div>
                {cat.data.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic px-1 py-1">No subjects registered for this level yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {cat.data.map((sub) => (
                      <div
                        key={sub.id}
                        className="py-1.5 px-3 rounded-xl border border-sky-100 bg-white/80 backdrop-blur-xs flex items-center justify-between gap-2 hover:border-sky-400 hover:bg-sky-50/50 shadow-xs transition-all"
                      >
                        <div className="flex items-center min-w-0">
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {sub.name}
                          </span>
                          <span className="ml-1.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-100 shrink-0">
                            {sub.code}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => handleEditClick(sub)}
                            className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                            title="Edit Subject"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id, sub.name)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
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
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
