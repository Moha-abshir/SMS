import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Application Crash Caught by ErrorBoundary]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/overview';
  };

  private handleResetAuth = () => {
    try {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    } catch {}
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred';
      const isChunkError = errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Loading chunk');

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-sky-50/40 via-white to-sky-50/30 dark:from-[#060c18] dark:via-[#081020] dark:to-[#060c18] text-slate-800 dark:text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="max-w-md w-full bg-white/90 dark:bg-[#091326]/90 backdrop-blur-xl border border-sky-100 dark:border-[#162b4d] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-glass space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-500 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {isChunkError ? 'Application Updated' : 'Something Went Wrong'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isChunkError
                  ? 'A new version of the portal has been deployed. Please reload your browser to load the latest application files.'
                  : 'The portal encountered an unexpected rendering error. Your data has not been lost.'}
              </p>
            </div>

            {/* Error Message Pill */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#060d1a] border border-slate-200 dark:border-slate-800 text-left overflow-x-auto text-[11px] font-mono text-slate-600 dark:text-slate-400">
              {errorMessage}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Portal
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#0c1830] hover:bg-slate-200 dark:hover:bg-[#122444] text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-[#162b4d] transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  Dashboard
                </button>

                <button
                  onClick={this.handleResetAuth}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Re-Login
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
