import { Component, type ErrorInfo, type ReactNode } from 'react';
import { windowScopedKey } from '@/desktop/windows';

// Same key fileCommands uses for this window's draft (desktop secondary windows are suffixed).
const RECOVERY_KEY = windowScopedKey('arkdraw:recovery');

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  notice: string | null;
}

/**
 * Top-level render guard. Without it, any render error unmounts the whole React
 * root and leaves a blank page. The fallback lets the user save the last autosaved
 * document as JSON, or reload with the recovery draft discarded.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, notice: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ArkDraw crashed while rendering', error, info.componentStack);
  }

  private download = () => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(RECOVERY_KEY);
    } catch {
      /* storage unavailable */
    }
    if (raw === null) {
      this.setState({ notice: 'No autosaved document was found to download.' });
      return;
    }
    // The draft is { name, path, data } where data is the serialized .arkdraw document.
    let parsed: { data?: unknown; name?: unknown };
    try {
      parsed = JSON.parse(raw) as { data?: unknown; name?: unknown };
    } catch {
      this.setState({ notice: 'The autosaved draft could not be read.' });
      return;
    }
    if (typeof parsed.data !== 'string') {
      this.setState({ notice: 'The autosaved draft could not be read.' });
      return;
    }
    const base = typeof parsed.name === 'string' && parsed.name ? parsed.name : 'diagram';
    const filename = base.endsWith('.arkdraw') ? base : `${base}.arkdraw`;
    try {
      const url = URL.createObjectURL(new Blob([parsed.data], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      this.setState({ notice: `Saved ${filename}.` });
    } catch {
      this.setState({ notice: 'The download could not be started.' });
    }
  };

  private reloadWithoutDraft = () => {
    try {
      localStorage.removeItem(RECOVERY_KEY);
    } catch {
      /* storage unavailable */
    }
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 18 }}>ArkDraw hit an unexpected error.</h1>
        <p>{this.state.error.message}</p>
        <p>Download your last autosaved document before reloading, or reload to discard the recovered draft.</p>
        <button type="button" onClick={this.download}>Download as JSON</button>{' '}
        <button type="button" onClick={this.reloadWithoutDraft}>Reload and discard draft</button>
        {this.state.notice && <p role="status">{this.state.notice}</p>}
      </div>
    );
  }
}
