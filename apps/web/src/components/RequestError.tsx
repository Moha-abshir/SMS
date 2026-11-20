import { AlertCircle } from 'lucide-react';

export function RequestError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
    >
      <p className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 min-h-10 rounded-lg border border-rose-300 px-3 text-xs font-semibold dark:border-rose-800"
      >
        Try again
      </button>
    </div>
  );
}
