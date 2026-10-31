import React, { useState, useEffect, useRef } from 'react';
import { ArrowDown, RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children?: React.ReactNode;
  threshold?: number;
  onRefresh?: () => Promise<void> | void;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  threshold = 60,
  onRefresh,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const isTrackingRef = useRef(false);

  useEffect(() => {
    // Only bind on touch devices
    if (typeof window === 'undefined' || !('ontouchstart' in window)) {
      return;
    }

    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate pull-to-refresh if window is at the very top
      if (window.scrollY > 2) return;
      if (e.touches.length !== 1) return;

      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isTrackingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTrackingRef.current || startYRef.current === null || startXRef.current === null) {
        return;
      }

      // If user has scrolled down the page, stop tracking
      if (window.scrollY > 2) {
        isTrackingRef.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startYRef.current;
      const diffX = currentX - startXRef.current;

      // If horizontal gesture is dominant (swiping table or slider), abort
      if (Math.abs(diffX) > Math.abs(diffY)) {
        isTrackingRef.current = false;
        setPullDistance(0);
        return;
      }

      // Only track downward pulling
      if (diffY > 0) {
        // Logarithmic/exponential damping for natural resistance feel
        const damped = Math.min(85, Math.pow(diffY, 0.8) * 1.4);
        setPullDistance(damped);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isTrackingRef.current) return;
      isTrackingRef.current = false;

      setPullDistance((currentDist) => {
        if (currentDist >= threshold) {
          setIsRefreshing(true);
          if (onRefresh) {
            Promise.resolve(onRefresh()).finally(() => {
              setIsRefreshing(false);
            });
          } else {
            // Standard mobile reload behavior
            setTimeout(() => {
              window.location.reload();
            }, 250);
          }
          return threshold;
        }
        return 0;
      });

      startYRef.current = null;
      startXRef.current = null;
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [threshold, onRefresh]);

  const progress = Math.min(1, pullDistance / threshold);
  const isTriggered = pullDistance >= threshold;
  const isVisible = pullDistance > 8 || isRefreshing;

  return (
    <>
      {/* Floating Pull-to-Refresh Indicator */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0 -translate-y-8'
        }`}
        style={{
          top: isVisible ? `${Math.max(16, pullDistance * 0.85)}px` : '-40px',
        }}
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-[#0a1528]/95 backdrop-blur-md shadow-lg border border-sky-200/90 dark:border-sky-800/80 text-sky-600 dark:text-sky-400 text-xs font-semibold">
          {isRefreshing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
              <span>Reloading...</span>
            </>
          ) : (
            <>
              <div
                className="transition-transform duration-150"
                style={{
                  transform: `rotate(${isTriggered ? 180 : progress * 180}deg)`,
                }}
              >
                <ArrowDown className={`w-4 h-4 ${isTriggered ? 'text-sky-500 scale-110' : 'text-slate-500 dark:text-slate-400'}`} />
              </div>
              <span className={isTriggered ? 'text-sky-600 dark:text-sky-300 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                {isTriggered ? 'Release to reload' : 'Pull to reload'}
              </span>
            </>
          )}
        </div>
      </div>

      {children}
    </>
  );
};
