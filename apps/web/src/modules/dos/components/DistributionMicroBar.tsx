import React from 'react';

export interface PrimaryDistribution {
  EE: number;
  ME: number;
  AE: number;
  BE: number;
}

export interface JuniorDistribution {
  8: number;
  7: number;
  6: number;
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

interface DistributionMicroBarProps {
  isJunior: boolean;
  distribution?: PrimaryDistribution | JuniorDistribution | null;
  className?: string;
}

export const DistributionMicroBar: React.FC<DistributionMicroBarProps> = ({
  isJunior,
  distribution,
  className = '',
}) => {
  if (!distribution) {
    return (
      <div className={`h-2 w-32 rounded-full bg-slate-100 dark:bg-slate-800 ${className}`} title="No distribution data" />
    );
  }

  if (isJunior) {
    const dist = distribution as JuniorDistribution;
    const c8 = dist[8] || 0;
    const c7 = dist[7] || 0;
    const c6 = dist[6] || 0;
    const c5 = dist[5] || 0;
    const c4 = dist[4] || 0;
    const c3 = dist[3] || 0;
    const c2 = dist[2] || 0;
    const c1 = dist[1] || 0;
    const total = c8 + c7 + c6 + c5 + c4 + c3 + c2 + c1;

    if (total === 0) {
      return (
        <div className={`h-2 w-32 rounded-full bg-slate-100 dark:bg-slate-800 ${className}`} title="No scores recorded" />
      );
    }

    const p8 = (c8 / total) * 100;
    const p7 = (c7 / total) * 100;
    const p6 = (c6 / total) * 100;
    const p5 = (c5 / total) * 100;
    const p4 = (c4 / total) * 100;
    const p3 = (c3 / total) * 100;
    const p2 = (c2 / total) * 100;
    const p1 = (c1 / total) * 100;

    const tooltip = `8 pts (EE1): ${c8} (${p8.toFixed(0)}%) | 7 pts (EE2): ${c7} (${p7.toFixed(0)}%) | 6 pts (ME1): ${c6} (${p6.toFixed(0)}%) | 5 pts (ME2): ${c5} (${p5.toFixed(0)}%) | 4 pts (AE1): ${c4} (${p4.toFixed(0)}%) | 3 pts (AE2): ${c3} (${p3.toFixed(0)}%) | 2 pts (BE1): ${c2} (${p2.toFixed(0)}%) | 1 pt (BE2): ${c1} (${p1.toFixed(0)}%)`;

    return (
      <div
        className={`group relative flex h-2 w-32 sm:w-36 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 cursor-help ${className}`}
        title={tooltip}
      >
        {p8 > 0 && <div style={{ width: `${p8}%` }} className="h-full bg-emerald-600 shrink-0" />}
        {p7 > 0 && <div style={{ width: `${p7}%` }} className="h-full bg-emerald-400 shrink-0" />}
        {p6 > 0 && <div style={{ width: `${p6}%` }} className="h-full bg-sky-600 shrink-0" />}
        {p5 > 0 && <div style={{ width: `${p5}%` }} className="h-full bg-sky-400 shrink-0" />}
        {p4 > 0 && <div style={{ width: `${p4}%` }} className="h-full bg-amber-500 shrink-0" />}
        {p3 > 0 && <div style={{ width: `${p3}%` }} className="h-full bg-amber-400 shrink-0" />}
        {p2 > 0 && <div style={{ width: `${p2}%` }} className="h-full bg-rose-400 shrink-0" />}
        {p1 > 0 && <div style={{ width: `${p1}%` }} className="h-full bg-rose-600 shrink-0" />}
      </div>
    );
  }

  const dist = distribution as PrimaryDistribution;
  const ee = dist.EE || 0;
  const me = dist.ME || 0;
  const ae = dist.AE || 0;
  const be = dist.BE || 0;
  const total = ee + me + ae + be;

  if (total === 0) {
    return (
      <div className={`h-2 w-32 rounded-full bg-slate-100 dark:bg-slate-800 ${className}`} title="No scores recorded" />
    );
  }

  const pEE = (ee / total) * 100;
  const pME = (me / total) * 100;
  const pAE = (ae / total) * 100;
  const pBE = (be / total) * 100;

  const tooltip = `EE (75-100%): ${ee} (${pEE.toFixed(0)}%) | ME (50-74%): ${me} (${pME.toFixed(0)}%) | AE (40-49%): ${ae} (${pAE.toFixed(0)}%) | BE (<40%): ${be} (${pBE.toFixed(0)}%)`;

  return (
    <div
      className={`group relative flex h-2 w-32 sm:w-36 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 cursor-help ${className}`}
      title={tooltip}
    >
      {pEE > 0 && <div style={{ width: `${pEE}%` }} className="h-full bg-emerald-500 shrink-0" />}
      {pME > 0 && <div style={{ width: `${pME}%` }} className="h-full bg-sky-500 shrink-0" />}
      {pAE > 0 && <div style={{ width: `${pAE}%` }} className="h-full bg-amber-500 shrink-0" />}
      {pBE > 0 && <div style={{ width: `${pBE}%` }} className="h-full bg-rose-500 shrink-0" />}
    </div>
  );
};
