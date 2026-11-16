import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { apiClient } from '../../lib/apiClient';

interface CreateCatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (createdCat: any) => void;
  preselectedAllocation?: {
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    cats: any[];
  } | null;
  allocations: Array<{
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    cats: any[];
  }>;
}

export const CreateCatModal: React.FC<CreateCatModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  preselectedAllocation,
  allocations,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [catNumber, setCatNumber] = useState<number>(1);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preselectedAllocation) {
      setSelectedKey(`${preselectedAllocation.classId}::${preselectedAllocation.subjectId}`);
      // Find highest cat number + 1
      const existingNums = preselectedAllocation.cats.map((c) => c.catNumber);
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      setCatNumber(nextNum);
    } else if (allocations.length > 0) {
      const match = allocations.find((a) => `${a.classId}::${a.subjectId}` === selectedKey);
      const target = match || allocations[0];
      setSelectedKey(`${target.classId}::${target.subjectId}`);
      const existingNums = target.cats.map((c) => c.catNumber);
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      setCatNumber(nextNum);
    }
  }, [preselectedAllocation, allocations, isOpen]);

  const handleAllocationChange = (key: string) => {
    setSelectedKey(key);
    const target = allocations.find((a) => `${a.classId}::${a.subjectId}` === key);
    if (target) {
      const existingNums = target.cats.map((c) => c.catNumber);
      const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
      setCatNumber(nextNum);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKey) {
      toast.error('Please select an allocated learning area');
      return;
    }

    const [classId, subjectId] = selectedKey.split('::');
    if (!classId || !subjectId) {
      toast.error('Invalid class or subject selection');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/api/cats', {
        classId,
        subjectId,
        catNumber,
        maxMarks,
      });

      const created = res.data?.data || res.data;
      toast.success(`CAT ${catNumber} created successfully!`);
      onCreated(created);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create CAT assessment');
    } finally {
      setLoading(false);
    }
  };

  const presetMarks = [20, 30, 40, 50, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#162b4d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                New Continuous Assessment (CAT)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                National transition cohorts (Grades 3, 6, 9)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Class & Subject Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Assigned Class & Learning Area
            </label>
            <select
              value={selectedKey}
              onChange={(e) => handleAllocationChange(e.target.value)}
              className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#081024] text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            >
              {allocations.map((alloc) => (
                <option
                  key={`${alloc.classId}::${alloc.subjectId}`}
                  value={`${alloc.classId}::${alloc.subjectId}`}
                >
                  {alloc.className} • {alloc.subjectName}
                  {alloc.cats.length > 0 ? ` (${alloc.cats.length} CAT${alloc.cats.length > 1 ? 's' : ''} recorded)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* CAT Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Assessment Series
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCatNumber(num)}
                    className={`flex-1 h-9 rounded-xl text-xs font-black transition-all ${
                      catNumber === num
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    CAT {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Max Marks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Total / Out of Marks
              </label>
              <input
                type="number"
                min={5}
                max={1000}
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                className="w-full h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#081024] text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Quick Max Mark Presets */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Quick presets:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presetMarks.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMaxMarks(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    maxMarks === preset
                      ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  /{preset} Marks
                </button>
              ))}
            </div>
          </div>

          {/* Information Notice */}
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Continuous assessment marks are formative and will automatically normalize to 100% and map to the official CBC rubric levels. They will be immediately visible on the Class Teacher and Leadership dashboards.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#162b4d]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Creating...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Assessment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
