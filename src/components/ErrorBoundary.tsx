import { Component, ReactNode } from 'react';
import { tr } from '../lib/i18n';

/** Catches an error in one page, so the rest of the app (header, tabs) keeps working. */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null; key?: string }> {
  state: { error: Error | null; key?: string } = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) { return { error }; }

  static getDerivedStateFromProps(props: { resetKey?: string }, state: { error: Error | null; key?: string }) {
    // Moving to another page clears the error.
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error) { console.error(error); }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card stack tight" role="alert">
        <strong>⚠️ {tr('משהו השתבש בעמוד הזה', 'Something went wrong on this page')}</strong>
        <span className="muted small">{tr('הנתונים שלך שמורים. נסה לרענן את העמוד.', 'Your data is safe. Try reloading the page.')}</span>
        <button className="btn primary" onClick={() => window.location.reload()}>{tr('רענון', 'Reload')}</button>
      </div>
    );
  }
}
