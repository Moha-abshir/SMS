import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/** Keep the navigation shell interactive while a destination's code downloads. */
export function RouteLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 10_000);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      className="workspace-panel p-5 space-y-3"
    >
      <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <Loader2 className="h-4 w-4 animate-spin text-sky-600" /> Opening page…
      </p>
      {slow && (
        <div className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
          <p>
            This is taking longer than usual. Check your connection or choose
            another page.
          </p>
          <button
            className="workspace-button-secondary"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )}
    </div>
  );
}
