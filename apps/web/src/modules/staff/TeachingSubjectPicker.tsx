import React, { useState, useMemo } from 'react';
import { Search, X, Check, GraduationCap, Award } from 'lucide-react';

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
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Subjects Qualified to Teach{' '}
          <span className="font-normal text-slate-400 dark:text-slate-500 text-[11px]">
            (Select subjects this educator is certified to instruct)
          </span>
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500 italic bg-sky-50/50 dark:bg-[#0c1830] p-3 rounded-xl border border-sky-100 dark:border-[#162b4d]">
          No subjects registered yet. Use "Manage Subjects" button to register school subjects.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Header Label and Qualification Counter */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Subjects Qualified to Teach
          </label>
          <span className="font-normal text-slate-400 dark:text-slate-500 text-[11px] hidden sm:inline">
            (CBC learning areas this teacher is certified/qualified to instruct)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
              selectedSubjectIds.length > 0
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {selectedSubjectIds.length} {selectedSubjectIds.length === 1 ? 'Specialization' : 'Specializations'}
          </span>
          {selectedSubjectIds.length > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Current Teaching Qualifications Tray */}
      {selectedSubjects.length > 0 ? (
        <div className="p-2.5 sm:p-3 rounded-xl bg-sky-50/70 dark:bg-[#0b162c] border border-sky-200/80 dark:border-[#162b4d] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-sky-800 dark:text-sky-300">
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              Qualified Teaching Areas ({selectedSubjects.length}):
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Click a tag to deselect</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {selectedSubjects.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => onToggleSubject(sub.id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#091326] text-slate-800 dark:text-slate-200 border border-sky-200 dark:border-sky-800 text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all group shadow-2xs"
                title={`Deselect ${sub.name}`}
              >
                <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">{sub.code}</span>
                <span className="truncate max-w-[140px] sm:max-w-none">{sub.name}</span>
                <X className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#081224] border border-dashed border-slate-200 dark:border-[#162b4d] text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            No teaching specializations selected yet. Search or select from the subjects below.
          </p>
        </div>
      )}

      {/* Real-Time Search Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type to filter subjects (e.g. Mathematics, English, Kiswahili, UP-ENG)..."
          className="w-full bg-slate-50 dark:bg-[#081224] border border-slate-200 dark:border-[#162b4d] rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-[#0c1830] focus:ring-2 focus:ring-sky-400 focus:border-transparent outline-none transition-all"
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
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] font-semibold scrollbar-none">
        <button
          type="button"
          onClick={() => setLevelFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
            levelFilter === 'ALL'
              ? 'bg-sky-500 text-white shadow-2xs font-bold'
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
              ? 'bg-sky-500 text-white shadow-2xs font-bold'
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
              ? 'bg-sky-500 text-white shadow-2xs font-bold'
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
              ? 'bg-sky-500 text-white shadow-2xs font-bold'
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
              ? 'bg-sky-500 text-white shadow-2xs font-bold'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Junior Secondary
        </button>
      </div>

      {/* Subjects Selection Grid (Compact max height to keep form visible) */}
      <div className="p-3 bg-slate-50/60 dark:bg-[#081224] rounded-xl border border-slate-200 dark:border-[#162b4d] max-h-48 sm:max-h-52 overflow-y-auto">
        {filteredSubjects.length === 0 ? (
          <div className="py-6 text-center space-y-1.5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredSubjects.map((sub) => {
              const isSelected = selectedSubjectIds.includes(sub.id);
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onToggleSubject(sub.id)}
                  className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500 dark:border-sky-400 shadow-2xs'
                      : 'bg-white dark:bg-[#0c1830] border-slate-200/80 dark:border-[#162b4d] hover:border-sky-300 dark:hover:border-sky-600'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-sky-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-400'
                        }`}
                      >
                        {sub.code}
                      </span>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {sub.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block truncate mt-0.5">
                      {sub.levelCategory.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3 h-3" /> Qualified
                      </>
                    ) : (
                      '+ Add'
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Result Counter & Separation of Concerns Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-400 dark:text-slate-500 px-1 pt-0.5">
        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
          <GraduationCap className="w-3.5 h-3.5 text-sky-500 shrink-0" />
          Qualifications guide the Deputy Head during academic class allocation.
        </span>
        <span className="shrink-0 text-right">
          {filteredSubjects.length} of {subjects.length} subjects
        </span>
      </div>
    </div>
  );
};

