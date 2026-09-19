import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Select an option --',
  searchPlaceholder = 'Search options...',
  disabled = false,
  required = false,
  className = '',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const matchLabel = opt.label.toLowerCase().includes(term);
    const matchSublabel = opt.sublabel ? opt.sublabel.toLowerCase().includes(term) : false;
    const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(term) : false;
    return matchLabel || matchSublabel || matchBadge;
  });

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-white dark:bg-[#0c1830] border ${
          isOpen
            ? 'border-sky-500 ring-2 ring-sky-500/20'
            : 'border-sky-100 dark:border-[#1a335a]'
        } hover:border-sky-300 dark:hover:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-left text-slate-800 dark:text-slate-100 outline-none transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 flex-1">
          {selectedOption ? (
            <>
              <span className="font-semibold truncate text-slate-900 dark:text-slate-100">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-50 dark:bg-[#072648] text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-[#0c4a6e] shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-500' : ''
          }`}
        />
      </button>

      {/* Hidden input for HTML5 required form validation if needed */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          onChange={() => {}}
          className="opacity-0 absolute inset-0 pointer-events-none -z-10 h-0 w-0"
          tabIndex={-1}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-[#091326] border border-sky-200 dark:border-[#162b4d] rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Pinned Search Input at the Top */}
          <div className="p-2 border-b border-sky-100 dark:border-[#162b4d] bg-sky-50/50 dark:bg-[#0c1830]/80 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-sky-100/40 dark:divide-[#162b4d]/40 py-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                No options found matching "{search}"
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-[#072648] text-sky-700 dark:text-sky-300 font-bold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-sky-50/60 dark:hover:bg-[#0c1830]'
                    } ${opt.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isSelected
                                ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200'
                                : 'bg-slate-100 dark:bg-[#0c1f3d] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#1a335a]'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 truncate">
                          {opt.sublabel}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
