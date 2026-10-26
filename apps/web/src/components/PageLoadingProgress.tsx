import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Sparkles, CheckCircle2 } from 'lucide-react';

export interface PageLoadingProgressProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
  icon?: React.ElementType;
}

export const PageLoadingProgress: React.FC<PageLoadingProgressProps> = ({
  isLoading,
  title = 'Eldoret Muslim Academy',
  subtitle,
  onComplete,
  icon: IconComponent = GraduationCap,
}) => {
  const [progress, setProgress] = useState(12);
  const [stageText, setStageText] = useState('Initializing workstation session...');
  const isCompleteRef = useRef(false);

  useEffect(() => {
    isCompleteRef.current = false;
    let timer: ReturnType<typeof setInterval>;

    const updateStage = (val: number) => {
      if (val >= 100) {
        setStageText('Data loaded! Launching view...');
      } else if (val >= 75) {
        setStageText('Finalizing workspace records & metrics...');
      } else if (val >= 50) {
        setStageText('Verifying allocations & examination data...');
      } else if (val >= 25) {
        setStageText('Retrieving academic stream records...');
      } else {
        setStageText('Initializing workstation session...');
      }
    };

    if (isLoading) {
      // Gradually tick upwards towards 88-92% while waiting for network
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          // Step smaller as we get higher
          const remaining = 90 - prev;
          const step = Math.max(1, Math.floor(remaining * 0.15));
          const nextVal = Math.min(90, prev + step);
          updateStage(nextVal);
          return nextVal;
        });
      }, 120);
    } else {
      // Network call finished! Rapidly accelerate to 100%
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            if (!isCompleteRef.current) {
              isCompleteRef.current = true;
              updateStage(100);
              // Slight delay so user visually perceives 100% completion
              setTimeout(() => {
                onComplete?.();
              }, 180);
            }
            return 100;
          }
          const jump = Math.max(6, Math.floor((100 - prev) * 0.45));
          const nextVal = Math.min(100, prev + jump);
          updateStage(nextVal);
          return nextVal;
        });
      }, 35);
    }

    return () => clearInterval(timer);
  }, [isLoading, onComplete]);

  return (
    <div className="min-h-[420px] sm:min-h-[480px] w-full flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white/90 dark:bg-[#091326]/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-sky-100 dark:border-[#162b4d] shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-center space-y-5 relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-400/15 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/15 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Pulsing Branded Icon */}
        <div className="relative mx-auto w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-sky-400/20 dark:bg-sky-500/20 animate-ping opacity-60 pointer-events-none" />
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25">
            {progress >= 100 ? (
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white animate-in zoom-in-50 duration-200" />
            ) : (
              <IconComponent className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse text-white" />
            )}
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            {subtitle || stageText}
          </p>
        </div>

        {/* Progress Metric & Percentage */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold px-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500 animate-spin" style={{ animationDuration: '4s' }} />
              {progress >= 100 ? 'Loaded' : 'Synchronizing'}
            </span>
            <span className="text-sm font-black font-mono text-sky-600 dark:text-sky-400">
              {progress}%
            </span>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-[#0c1830] p-0.5 border border-sky-100 dark:border-[#162b4d] overflow-hidden relative shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 transition-all duration-150 relative shadow-sm"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite]"
                style={{
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer info pill */}
        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/60 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            {stageText}
          </span>
        </div>
      </div>
    </div>
  );
};

export interface PageLoadingWrapperProps {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}

export const PageLoadingWrapper: React.FC<PageLoadingWrapperProps> = ({
  isLoading,
  title,
  subtitle,
  icon,
  children,
}) => {
  const [animationComplete, setAnimationComplete] = useState(false);

  // If loading becomes false and progress bar reaches 100%, animationComplete is set to true
  useEffect(() => {
    if (!isLoading && animationComplete) {
      // already complete
    }
  }, [isLoading, animationComplete]);

  if (!animationComplete) {
    return (
      <PageLoadingProgress
        isLoading={isLoading}
        title={title}
        subtitle={subtitle}
        icon={icon}
        onComplete={() => setAnimationComplete(true)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};
