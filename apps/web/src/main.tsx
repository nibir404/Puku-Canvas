import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

// Top-level ErrorBoundary so any runtime error in <App /> shows up on
// screen instead of leaving a blank page.
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('RootErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <pre
          style={{
            position: 'fixed',
            inset: 0,
            padding: 24,
            background: '#0b0b0b',
            color: '#ffb4b4',
            font: '13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
            zIndex: 99999,
            margin: 0,
          }}
        >
          {`Render error: ${e.message}\n\n${e.stack ?? ''}`}
        </pre>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root')!;
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
