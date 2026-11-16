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
      <div className="bg-white dark:bg-[#0c1830] border border-sky-100 dark:border-[#162b4d] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#162b4d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                Create Continuous Assessment
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                National transition cohorts (Grades 3, 6, 9)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Class & Subject Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Assigned Class & Learning Area
            </label>
            <select
              value={selectedKey}
              onChange={(e) => handleAllocationChange(e.target.value)}
              className="w-full h-10 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#081024] text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
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

          {/* Field 2: Assessment Series Segmented Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Assessment Series
            </label>
            <div className="flex p-1 bg-slate-100 dark:bg-[#081024] rounded-xl border border-slate-200 dark:border-[#162b4d] gap-1">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCatNumber(num)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    catNumber === num
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  CAT {num}
                </button>
              ))}
            </div>
          </div>

          {/* Field 3: Total / Out of Marks & Presets in a Single Compact Block */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Total / Out of Marks
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Max score
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={1000}
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                className="w-24 h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 dark:border-[#162b4d] bg-white dark:bg-[#081024] text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-center shrink-0"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {presetMarks.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMaxMarks(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      maxMarks === preset
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    /{preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#162b4d]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
