import { useEffect } from 'react';
import type { Tool } from '../store/canvas-store';
import { useCanvasStore } from '../store/canvas-store';

const TOOL_SHORTCUTS: Record<string, Tool> = {
  v: 'select',
  r: 'rectangle',
  o: 'ellipse',
  d: 'diamond',
  t: 'text',
  n: 'sticky',
  a: 'connector',
  l: 'line',
  p: 'pan',
  f: 'freedraw',
};

/**
 * Wires up keyboard shortcuts for tools + delete + undo/redo + AI toggle.
 */
export function useKeyboardShortcuts(
  onAnalyze: () => void,
  onClosePanel: () => void
) {
  const setTool = useCanvasStore((s) => s.setTool);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);
  const selectAll = useCanvasStore((s) => s.selectAll);
  const duplicateSelected = useCanvasStore((s) => s.duplicateSelected);
  const copySelected = useCanvasStore((s) => s.copySelected);
  const pasteSelected = useCanvasStore((s) => s.pasteSelected);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const toggleAiEnabled = useCanvasStore((s) => s.toggleAiEnabled);
  const setSpaceDown = useCanvasStore((s) => s.setSpaceDown);
  const resetViewport = useCanvasStore((s) => s.resetViewport);
  const zoomAt = useCanvasStore((s) => s.zoomAt);
  const aiEnabled = useCanvasStore((s) => s.aiEnabled);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Track spacebar for pan (but don't intercept when typing).
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === ' ' && !isTextInput) {
        setSpaceDown(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') setSpaceDown(false);
    };

    const onKey = (e: KeyboardEvent) => {
      // Don't capture when typing in an input.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // ⌘A / Ctrl+A → Select all
      if (mod && key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // ⌘C / Ctrl+C → Copy
      if (mod && key === 'c') {
        e.preventDefault();
        copySelected();
        return;
      }

      // ⌘V / Ctrl+V → Paste
      if (mod && key === 'v') {
        e.preventDefault();
        pasteSelected();
        return;
      }

      // ⌘D / Ctrl+D → Duplicate
      if (mod && key === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      // ⌘+ / ⌘= → Zoom in
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.2);
        return;
      }

      // ⌘- → Zoom out
      if (mod && e.key === '-') {
        e.preventDefault();
        zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.8);
        return;
      }

      // ⌘P / Ctrl+P → toggle Puku AI
      if (mod && key === 'p') {
        e.preventDefault();
        toggleAiEnabled();
        if (aiEnabled) onAnalyze();
        return;
      }

      // ⌘Z / Ctrl+Z → undo (⌘⇧Z → redo)
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      // ⌘Y / Ctrl+Y → redo (Windows convention)
      if (mod && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // ⌘0 / Ctrl+0 → reset viewport
      if (mod && key === '0') {
        e.preventDefault();
        resetViewport();
        return;
      }

      // ⌘O / Ctrl+O → open scene
      if (mod && !e.shiftKey && key === 'o') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('puku:menu-open'));
        return;
      }

      // ⌘S / Ctrl+S → save scene
      if (mod && !e.shiftKey && key === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('puku:menu-save'));
        return;
      }

      // ⌘⇧E / Ctrl+Shift+E → export PNG
      if (mod && e.shiftKey && key === 'e') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('puku:menu-export-png'));
        return;
      }

      // Escape → close AI panel if open, otherwise clear selection
      if (e.key === 'Escape') {
        const panelOpen = useCanvasStore.getState().aiPanelOpen;
        if (panelOpen) {
          onClosePanel();
        } else {
          clearSelection();
        }
        return;
      }

      // Tool shortcuts
      const tool = TOOL_SHORTCUTS[key];
      if (tool && !mod) {
        setTool(tool);
        return;
      }

      // Delete / Backspace → remove selected
      if (e.key === 'Backspace' || e.key === 'Delete') {
        deleteSelected();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [
    setTool,
    deleteSelected,
    clearSelection,
    onAnalyze,
    onClosePanel,
    undo,
    redo,
    toggleAiEnabled,
    setSpaceDown,
    resetViewport,
    aiEnabled,
  ]);
}
