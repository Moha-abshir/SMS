import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'pill' | 'icon';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'pill', className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isDark
            ? 'bg-[#0d1c38] border-[#1d3863] text-amber-400 hover:bg-[#13274c] hover:border-amber-400/50 shadow-xs'
            : 'bg-white border-sky-200 text-sky-600 hover:bg-sky-50 shadow-xs'
        } ${className}`}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
        isDark
          ? 'bg-[#0c1830] border-[#182f54] text-slate-300 hover:bg-[#0f213d] hover:border-[#1e3d6f]'
          : 'bg-white/80 border-sky-100 text-slate-700 hover:bg-sky-50 hover:border-sky-200 shadow-xs'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`p-1 rounded-lg ${
            isDark ? 'bg-amber-400/10 text-amber-400' : 'bg-sky-100 text-sky-600'
          }`}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </div>
        <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      </div>
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          isDark
            ? 'bg-[#072648] text-sky-300 border-[#0c4a6e]'
            : 'bg-sky-50 text-sky-700 border-sky-200/80'
        }`}
      >
        {isDark ? 'ON' : 'OFF'}
      </span>
    </button>
  );
};


