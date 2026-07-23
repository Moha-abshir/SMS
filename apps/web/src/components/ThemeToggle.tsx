import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setTheme('light')}
        title="Light Mode"
        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
          theme === 'light'
            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        <Sun className="w-4 h-4" />
      </button>

      <button
        onClick={() => setTheme('dark')}
        title="Dark Mode"
        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
          theme === 'dark'
            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        <Moon className="w-4 h-4" />
      </button>

      <button
        onClick={() => setTheme('system')}
        title="System Preference"
        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        <Laptop className="w-4 h-4" />
      </button>
    </div>
  );
};
