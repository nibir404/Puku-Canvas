import { useCallback, useEffect, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useCanvasStore } from '@/store/canvas-store';
import { Canvas } from '@/components/canvas/canvas';
import { Toolbar } from '@/components/canvas/toolbar';
import { AIFloatingBar, AISidePanel, AIBackdrop } from '@/components/ai/ai-panel';
import { AppMenu } from '@/components/menu/app-menu';
import { PagesPanel, PagesBackdrop } from '@/components/pages/pages-panel';
import { ShareModal } from '@/components/share/share-modal';
import { useAIAnalysis } from '@/hooks/use-ai-analysis';
import { useAutoAnalyze } from '@/hooks/use-auto-analyze';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useTheme } from '@/hooks/use-theme';
import { openSceneJson, saveSceneJson, exportScenePng, exportSceneSvg } from '@/hooks/use-export';
import { decodeSceneFromUrl } from '@/lib/share';
import { cn } from '@/lib/utils';

export function App() {
  const scene = useCanvasStore((s) => s.scene);
  const aiEnabled = useCanvasStore((s) => s.aiEnabled);
  const openAiPanel = useCanvasStore((s) => s.openAiPanel);
  const closeAiPanel = useCanvasStore((s) => s.closeAiPanel);
  const aiPanelOpen = useCanvasStore((s) => s.aiPanelOpen);
  const pagesPanelOpen = useCanvasStore((s) => s.pagesPanelOpen);
  const loadScene = useCanvasStore((s) => s.loadScene);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const { result, loading, error, latencyMs, analyze, reset } = useAIAnalysis(aiEnabled);

  useAutoAnalyze(scene, aiEnabled, analyze, reset);
  useTheme();

  // Load shared scene from URL hash on startup
  useEffect(() => {
    if (window.location.hash) {
      const decoded = decodeSceneFromUrl(window.location.hash);
      if (decoded) {
        loadScene(decoded);
      }
    }
  }, [loadScene]);

  useEffect(() => {
    const handleOpen = async () => {
      const loaded = await openSceneJson();
      if (loaded && typeof loaded === 'object') {
        const targetScene = (loaded as any).scene ?? loaded;
        if (targetScene && Array.isArray(targetScene.shapes)) {
          loadScene(targetScene);
        }
      }
    };

    const handleSave = () => {
      saveSceneJson(scene, scene.name);
    };

    const handleExportPng = () => {
      const svg = document.querySelector<SVGSVGElement>('.canvas-svg');
      if (svg) exportScenePng({ svg, name: scene.name });
    };

    const handleExportSvg = () => {
      const svg = document.querySelector<SVGSVGElement>('.canvas-svg');
      if (svg) exportSceneSvg({ svg, name: scene.name });
    };

    const handleShare = () => {
      setShareModalOpen(true);
    };

    window.addEventListener('puku:menu-open', handleOpen);
    window.addEventListener('puku:menu-save', handleSave);
    window.addEventListener('puku:menu-export-png', handleExportPng);
    window.addEventListener('puku:menu-export-svg', handleExportSvg);
    window.addEventListener('puku:menu-share', handleShare);

    return () => {
      window.removeEventListener('puku:menu-open', handleOpen);
      window.removeEventListener('puku:menu-save', handleSave);
      window.removeEventListener('puku:menu-export-png', handleExportPng);
      window.removeEventListener('puku:menu-export-svg', handleExportSvg);
      window.removeEventListener('puku:menu-share', handleShare);
    };
  }, [scene, loadScene]);

  const runAnalysis = useCallback(async () => {
    if (!aiEnabled) return;
    openAiPanel();
    await analyze(scene);
  }, [analyze, scene, aiEnabled, openAiPanel]);

  useKeyboardShortcuts(runAnalysis, closeAiPanel);

  const shellClass = cn(
    'app-shell',
    pagesPanelOpen && 'pages-panel-open',
    aiEnabled && aiPanelOpen && 'ai-panel-open'
  );

  return (
    <div className={shellClass}>
      <PagesPanel />
      <main className="workspace">
        <AppMenu />
        <Toolbar />
        <button
          type="button"
          className="share-action-btn"
          onClick={() => setShareModalOpen(true)}
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
        <Canvas />
        <PagesBackdrop />
        <AIBackdrop />
        <AIFloatingBar loading={loading} onAnalyze={runAnalysis} />
      </main>
      <AISidePanel
        result={result}
        loading={loading}
        error={error ? `${error}${latencyMs != null ? ` (${latencyMs}ms)` : ''}` : null}
      />
      <ShareModal open={shareModalOpen} onClose={() => setShareModalOpen(false)} />
    </div>
  );
}