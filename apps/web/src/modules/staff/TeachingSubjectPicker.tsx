import React, { useState, useMemo } from 'react';
import { Search, X, Check, Layers } from 'lucide-react';

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  levelCategory: string;
}

interface TeachingSubjectPickerProps {
  subjects: SubjectItem[];
  selectedSubjectIds: string[];
  onToggleSubject: (subjectId: string) => void;
  onClearAll?: () => void;
}

export const TeachingSubjectPicker: React.FC<TeachingSubjectPickerProps> = ({
  subjects,
  selectedSubjectIds,
  onToggleSubject,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'PPE' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JUNIOR'>('ALL');

  // Filter subjects based on search query and level filter
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return subjects.filter((sub) => {
      // Level filter
      if (levelFilter === 'PPE' && sub.levelCategory !== 'PPE') return false;
      if (levelFilter === 'LOWER_PRIMARY' && sub.levelCategory !== 'LOWER_PRIMARY' && sub.levelCategory !== 'PRIMARY') return false;
      if (levelFilter === 'UPPER_PRIMARY' && sub.levelCategory !== 'UPPER_PRIMARY') return false;
      if (levelFilter === 'JUNIOR' && sub.levelCategory !== 'JUNIOR') return false;

      // Search match (name, code, or levelCategory)
      if (!q) return true;
      const matchName = sub.name.toLowerCase().includes(q);
      const matchCode = sub.code.toLowerCase().includes(q);
      const matchLevel = sub.levelCategory.toLowerCase().includes(q);
      return matchName || matchCode || matchLevel;
    });
  }, [subjects, searchQuery, levelFilter]);

  // Selected subjects objects for quick summary
  const selectedSubjects = useMemo(() => {
    return subjects.filter((s) => selectedSubjectIds.includes(s.id));
  }, [subjects, selectedSubjectIds]);

  if (subjects.length === 0) {
    return (
      <div className="space-y-2 pt-1">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
          Assigned Teaching Subjects <span className="font-normal text-slate-400 text-[11px]">(Select subjects this teacher can teach)</span>
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500 italic bg-sky-50/50 dark:bg-[#0c1830] p-2.5 rounded-xl border border-sky-100 dark:border-[#162b4d]">
          No subjects registered yet. Use "Manage Subjects" button to register school subjects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pt-1">
      {/* Label and Selection Counter */}
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Assigned Teaching Subjects{' '}
          <span className="font-normal text-slate-400 dark:text-slate-500 text-[11px]">
            (Select subjects this teacher can teach)
          </span>
        </label>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
            selectedSubjectIds.length > 0
              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {selectedSubjectIds.length} Selected
          </span>
          {selectedSubjectIds.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search subject by name or code (e.g. Math, IRE, JSS, LP)..."
          className="w-full bg-slate-50/80 dark:bg-[#091326] border border-sky-100 dark:border-[#162b4d] rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0c1830] focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Level Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-semibold scrollbar-none">
        <button
          type="button"
          onClick={() => setLevelFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
            levelFilter === 'ALL'
              ? 'bg-sky-500 text-white shadow-xs font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          All ({subjects.length})
        </button>
        <button
          type="button"
          onClick={() => setLevelFilter('PPE')}
          className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
            levelFilter === 'PPE'
              ? 'bg-sky-500 text-white shadow-xs font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Pre-Primary
        </button>
        <button
          type="button"
          onClick={() => setLevelFilter('LOWER_PRIMARY')}
          className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
            levelFilter === 'LOWER_PRIMARY'
              ? 'bg-sky-500 text-white shadow-xs font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Lower Primary
        </button>
        <button
          type="button"
          onClick={() => setLevelFilter('UPPER_PRIMARY')}
          className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
            levelFilter === 'UPPER_PRIMARY'
              ? 'bg-sky-500 text-white shadow-xs font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Upper Primary
        </button>
        <button
          type="button"
          onClick={() => setLevelFilter('JUNIOR')}
          className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
            levelFilter === 'JUNIOR'
              ? 'bg-sky-500 text-white shadow-xs font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Junior Secondary
        </button>
      </div>

      {/* Selected Subjects Tag Tray (shows currently selected items even when searching) */}
      {selectedSubjects.length > 0 && searchQuery && (
        <div className="p-2 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 space-y-1">
          <div className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1">
            <Check className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            Currently Selected ({selectedSubjects.length}):
          </div>
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
            {selectedSubjects.map((sub) => (
              <span
                key={sub.id}
                onClick={() => onToggleSubject(sub.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-[#0c1830] text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800 text-[11px] font-medium cursor-pointer hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors"
                title="Click to remove"
              >
                <span className="font-mono font-bold text-[10px]">{sub.code}</span>
                <span className="truncate max-w-[120px]">{sub.name}</span>
                <X className="w-2.5 h-2.5 opacity-60" />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scrollable Subjects Grid */}
      <div className="p-3 bg-sky-50/40 dark:bg-[#0c1830]/80 rounded-xl border border-sky-100 dark:border-[#162b4d] max-h-48 overflow-y-auto space-y-2">
        {filteredSubjects.length === 0 ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              No subjects found matching <span className="font-bold text-slate-600 dark:text-slate-300">"{searchQuery}"</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setLevelFilter('ALL');
              }}
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
            >
              Reset filter & search
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filteredSubjects.map((sub) => {
              const isSelected = selectedSubjectIds.includes(sub.id);
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onToggleSubject(sub.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500 text-white border-sky-500 shadow-glass'
                      : 'bg-white dark:bg-[#091326] text-slate-700 dark:text-slate-200 border-sky-100 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                  <span
                    className={`font-mono font-bold text-[10px] px-1 py-0.2 rounded ${
                      isSelected
                        ? 'bg-sky-600/70 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-400'
                    }`}
                  >
                    {sub.code}
                  </span>
                  <span>{sub.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Result Counter footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
        <span>
          Showing {filteredSubjects.length} of {subjects.length} subjects
        </span>
        {searchQuery && (
          <span className="text-sky-600 dark:text-sky-400 font-medium">
            Filtered by "{searchQuery}"
          </span>
        )}
      </div>
    </div>
  );
};
