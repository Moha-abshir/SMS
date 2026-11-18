import { Component, type ReactNode } from 'react';

/** Keeps a failed route/chunk recoverable without automatically reloading unsaved work. */
export class WorkspaceErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="p-6 space-y-3">
      <p>This workspace could not load. Check your connection and reload to try again.</p>
      <button className="workspace-button-primary" onClick={() => window.location.reload()}>Reload workspace</button>
    </div>;
    return this.props.children;
  }
}
