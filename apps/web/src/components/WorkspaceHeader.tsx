import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface WorkspaceHeaderProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
}

/** A compact page heading; actions wrap below the title on smaller screens. */
export function WorkspaceHeader({ icon: Icon, title, description, children }: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white" aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {children && <div className="workspace-actions">{children}</div>}
    </header>
  );
}
