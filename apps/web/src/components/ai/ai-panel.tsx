import { Sparkles, X } from 'lucide-react';
import type { AnalysisResult } from '@puku/types';
import { useCanvasStore } from '../../store/canvas-store';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip } from '../ui/tooltip';
import { AnalysisResultView } from './analysis-result';

interface FloatingBarProps {
  loading: boolean;
  onAnalyze: () => void;
}

/**
 * Floating top-right control bar: logo + Puku AI toggle + Analyze button + close.
 * Always visible — discoverable even when AI is off. The Analyze button
 * is disabled while Puku AI is off so it can't fire requests.
 */
export function AIFloatingBar({ loading, onAnalyze }: FloatingBarProps) {
  const aiEnabled = useCanvasStore((s) => s.aiEnabled);
  const toggleAiEnabled = useCanvasStore((s) => s.toggleAiEnabled);
  const panelOpen = useCanvasStore((s) => s.aiPanelOpen);
  const closePanel = useCanvasStore((s) => s.closeAiPanel);

  return (
    <div className="ai-floating-bar" role="toolbar" aria-label="Puku AI controls">
      <img
        src="/canvas-logo.png"
        alt="Puku Canvas"
        className="ai-floating-logo"
        width={29}
        height={29}
        draggable={false}
      />

      <Tooltip tip="Toggle Puku AI — auto-summarizes the canvas (⌘P)">
        <button
          type="button"
          aria-label="Toggle Puku AI"
          aria-pressed={aiEnabled}
          data-on={aiEnabled ? 'true' : 'false'}
          className="puku-toggle"
          onClick={toggleAiEnabled}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="dot" />
          <span>Puku AI</span>
          <span style={{ opacity: 0.7 }}>{aiEnabled ? '· ON' : '· OFF'}</span>
        </button>
      </Tooltip>

      <Tooltip tip="Analyze now (⌘A)">
        <Button
          variant="default"
          size="sm"
          onClick={onAnalyze}
          disabled={loading}
          className="px-3"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? 'Analyzing…' : 'Analyze'}
        </Button>
      </Tooltip>

      {panelOpen && (
        <Tooltip tip="Close panel (Esc)">
          <button
            type="button"
            aria-label="Close AI panel"
            className="ai-close-btn"
            onClick={closePanel}
          >
            <X className="h-4 w-4" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

interface SidePanelProps {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
}

/**
 * Slide-in side panel that displays the analysis results.
 * Visibility is driven by `aiPanelOpen` in the store.
 */
export function AISidePanel({ result, loading, error }: SidePanelProps) {
  const aiEnabled = useCanvasStore((s) => s.aiEnabled);
  const panelOpen = useCanvasStore((s) => s.aiPanelOpen);

  // Don't render at all if AI is disabled or the panel is closed.
  if (!aiEnabled) return null;
  if (!panelOpen) return null;

  return (
    <aside className="ai-side-panel" aria-label="Puku AI analysis">
      <ScrollArea className="h-full pr-2">
        <div className="flex flex-col gap-3">
          <header className="ai-side-panel-header">
            <p className="text-xs text-muted-foreground">
              Canvas observer &amp; summarizer
            </p>
          </header>

          {loading && (
            <div className="summary-text flex items-center gap-2 text-muted-foreground">
              <Spinner size={14} />
              Analyzing the canvas…
            </div>
          )}

          {error && <p className="error-text">Error: {error}</p>}

          {!result && !loading && !error && (
            <p className="empty-hint">
              No analysis yet. Click <strong>Analyze</strong> to summarize the canvas.
            </p>
          )}

          {result && <AnalysisResultView result={result} />}
        </div>
      </ScrollArea>
    </aside>
  );
}

/**
 * Click-outside backdrop. Render this inside the workspace so it only
 * covers the canvas area, never the side panel itself. Render it from
 * `App.tsx` (not from `AISidePanel`) so it can sit over the canvas.
 */
export function AIBackdrop() {
  const aiEnabled = useCanvasStore((s) => s.aiEnabled);
  const panelOpen = useCanvasStore((s) => s.aiPanelOpen);
  const closePanel = useCanvasStore((s) => s.closeAiPanel);

  if (!aiEnabled || !panelOpen) return null;
  return <div className="ai-backdrop" aria-hidden="true" onClick={closePanel} />;
}