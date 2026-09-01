/**
 * Export the current canvas scene as a standalone SVG or PNG.
 *
 * Both functions take the live SVG element from the canvas and serialize it.
 * They assume the SVG already renders correctly in the DOM.
 */

interface SceneRef {
  /** The live <svg> element rendered by <Canvas />. */
  svg: SVGSVGElement | null;
  /** Optional scene name for the downloaded filename. */
  name?: string;
}

const VIEW_PADDING = 32;
const PX_PER_UNIT = 1; // 1 unit = 1 pixel at zoom = 1
const DEFAULT_DPR = 2;

function ts(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function standaloneSvgString(svg: SVGSVGElement, bg: string): string {
  // Clone the SVG so we can mutate without affecting the live canvas.
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Inline the live viewport transform so the export looks the same.
  const bbox = svg.getBoundingClientRect();
  const widthAttr = `${bbox.width || 1200}`;
  const heightAttr = `${bbox.height || 800}`;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', widthAttr);
  clone.setAttribute('height', heightAttr);
  // Background rect so PNG export isn't transparent.
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', widthAttr);
  bgRect.setAttribute('height', heightAttr);
  bgRect.setAttribute('fill', bg);
  clone.insertBefore(bgRect, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

export function exportSceneSvg({ svg, name = 'puku-canvas' }: SceneRef) {
  if (!svg) return;
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--canvas-bg')
    .trim() || '#ffffff';
  const xml = standaloneSvgString(svg, bg);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, `${name}-${ts()}.svg`);
}

export function exportScenePng({
  svg,
  name = 'puku-canvas',
  scale = DEFAULT_DPR,
}: SceneRef & { scale?: number }) {
  if (!svg) return;
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue('--canvas-bg')
    .trim() || '#ffffff';
  const xml = standaloneSvgString(svg, bg);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const bbox = svg.getBoundingClientRect();
      const w = Math.max(1, Math.round((bbox.width || 1200) * scale));
      const h = Math.max(1, Math.round((bbox.height || 800) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve();
        return;
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) downloadBlob(pngBlob, `${name}-${ts()}.png`);
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    img.src = url;
  });
}

/** Save the current scene JSON to disk. */
export function saveSceneJson(scene: unknown, name = 'puku-canvas') {
  const json = JSON.stringify(
    { version: 1, kind: 'puku-canvas-scene', scene },
    null,
    2
  );
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${name}-${ts()}.json`);
}

/** Open a file picker for loading a JSON scene. */
export function openSceneJson(): Promise<unknown | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          resolve(parsed);
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

// Suppress unused-var warning for VIEW_PADDING; kept for future crop export.
void VIEW_PADDING;
void PX_PER_UNIT;