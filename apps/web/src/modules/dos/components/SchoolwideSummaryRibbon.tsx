import React from 'react';
import { Users, GraduationCap, Award, TrendingUp, TrendingDown, AlertTriangle, Sparkles } from 'lucide-react';

export interface SummaryRibbonData {
  candidacy: {
    satCount: number;
    enrolledCount: number;
    percentage: number;
  };
  primaryBlock: {
    meanPercentage: number;
    rubricMode: 'EE' | 'ME' | 'AE' | 'BE';
    masteryPercentage: number;
    beCount: number;
    deltaMeanPct: number | null;
  };
  juniorBlock: {
    meanPoints: number;
    meanPercentage: number;
    scaleLabel: string;
    masteryPercentage: number;
    beCount: number;
    deltaPoints: number | null;
    deltaMeanPct: number | null;
  };
  outliers: {
    top: { name: string; meanPct: number } | null;
    watch: { name: string; meanPct: number } | null;
  };
  remedialWatchlistCount: number;
}

interface SchoolwideSummaryRibbonProps {
  data: SummaryRibbonData | null;
  loading?: boolean;
  onFilterRemedial?: () => void;
}

export const SchoolwideSummaryRibbon: React.FC<SchoolwideSummaryRibbonProps> = ({
  data,
  loading = false,
  onFilterRemedial,
}) => {
  if (loading || !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800/80 dark:bg-[#111827] shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse space-y-1.5 px-2">
              <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { candidacy, primaryBlock, juniorBlock, outliers, remedialWatchlistCount } = data;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800/80 dark:bg-[#111827] shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:divide-x divide-slate-100 dark:divide-slate-800/80">
        {/* 1. School Candidacy */}
        <div className="flex items-center gap-2.5 lg:pr-3">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Candidacy Sat
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
              {candidacy.satCount} / {candidacy.enrolledCount}{' '}
              <span className="font-semibold text-slate-500 dark:text-slate-400">({candidacy.percentage}%)</span>
            </div>
          </div>
        </div>

        {/* 2. Primary Block (PP1-G6) */}
        <div className="flex items-center gap-2.5 lg:px-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Primary (PP1–G6)</span>
              {primaryBlock.deltaMeanPct !== null && (
                <span
                  className={`inline-flex items-center text-[9px] font-extrabold ${
                    primaryBlock.deltaMeanPct >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {primaryBlock.deltaMeanPct >= 0 ? '+' : ''}
                  {primaryBlock.deltaMeanPct}%
                </span>
              )}
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
              {primaryBlock.meanPercentage}%{' '}
              <span className="px-1 py-0.2 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {primaryBlock.rubricMode}
              </span>{' '}
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                · {primaryBlock.masteryPercentage}% EE/ME
              </span>
            </div>
          </div>
        </div>

        {/* 3. Junior Secondary Block (G7-G9) */}
        <div className="flex items-center gap-2.5 lg:px-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Junior (G7–G9)</span>
              {juniorBlock.deltaPoints !== null && (
                <span
                  className={`inline-flex items-center text-[9px] font-extrabold ${
                    juniorBlock.deltaPoints >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {juniorBlock.deltaPoints >= 0 ? '+' : ''}
                  {juniorBlock.deltaPoints} pts
                </span>
              )}
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
              {juniorBlock.meanPoints} / 8.0{' '}
              <span className="px-1 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                {juniorBlock.scaleLabel}
              </span>{' '}
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                ({juniorBlock.meanPercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* 4. Schoolwide Outlier Subjects */}
        <div className="flex items-center gap-2.5 lg:px-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Outlier Subjects
            </div>
            <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
              {outliers.top ? (
                <span title={`Top: ${outliers.top.name} (${outliers.top.meanPct}%)`}>
                  Top: <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">{outliers.top.name.split(' ')[0]}</strong> ({outliers.top.meanPct}%)
                </span>
              ) : (
                'None'
              )}{' '}
              ·{' '}
              {outliers.watch ? (
                <span title={`Watch: ${outliers.watch.name} (${outliers.watch.meanPct}%)`}>
                  Watch: <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{outliers.watch.name.split(' ')[0]}</strong> ({outliers.watch.meanPct}%)
                </span>
              ) : (
                ''
              )}
            </div>
          </div>
        </div>

        {/* 5. Remedial Watchlist (BE) */}
        <div className="flex items-center gap-2.5 lg:pl-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              remedialWatchlistCount > 0
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Remedial Watchlist
            </div>
            <div className="text-xs font-black truncate">
              {remedialWatchlistCount > 0 ? (
                <span
                  onClick={onFilterRemedial}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 cursor-pointer hover:bg-rose-200 transition-colors"
                >
                  {remedialWatchlistCount} Learners in BE
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                  0 Below Expectations
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
