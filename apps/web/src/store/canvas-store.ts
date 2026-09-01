import { create } from 'zustand';
import type {
  Scene,
  Shape,
  ShapeKind,
  ArrowShape,
  LineShape,
  FreedrawShape,
  Point,
} from '@puku/types';
import { isArrow, isLine, isFreedraw } from '@puku/types';
import {
  createEmptyScene,
  cryptoRandomId,
  center,
  pointInRect,
  pointInEllipse,
  rectsIntersect,
  distanceToSegment,
  clamp,
  getShapeIntersection,
  type Rect,
} from '@puku/core';

export type Tool =
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'text'
  | 'sticky'
  | 'connector'
  | 'line'
  | 'freedraw'
  | 'pan';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export type DragState =
  | {
      kind: 'move' | 'resize' | 'marquee';
      startPointer: Point;
      currentPointer: Point;
      originalShapes?: Map<string, Shape>;
      resizeHandle?: ResizeHandle;
    }
  | {
      kind: 'create';
      startPointer: Point;
      currentPointer: Point;
      draftId: string;
    }
  | {
      kind: 'freedraw';
      startPointer: Point;
      currentPointer: Point;
      draftId: string;
      draftPoints: Point[];
    }
  | {
      kind: 'line';
      startPointer: Point;
      currentPointer: Point;
      draftId: string;
    }
  | {
      /** Connector drag — creating a new one or re-anchoring an existing endpoint. */
      kind: 'connector';
      startPointer: Point;
      currentPointer: Point;
      /** id of the connector being edited (created or re-anchored). */
      draftId: string;
      /** Which endpoint is being dragged: 'from' or 'to'. */
      end: 'from' | 'to';
      /** Snapshot of the endpoint at drag start (shape id or free point). */
      endSnapshot: { fromId?: string | null; toId?: string | null; fromPoint?: Point; toPoint?: Point };
    };

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'w' | 'e'
  | 'sw' | 's' | 'se';

const HISTORY_LIMIT = 100;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const HANDLE_SIZE = 8;

interface PukuPage {
  id: string;
  name: string;
  scene: Scene;
}

interface PukuState {
  /** Active page's scene. Mirror of `pages[activePageId].scene`; kept here so
   *  every existing consumer reads `state.scene` without change. */
  scene: Scene;
  /** All pages. The active page's scene mirrors `state.scene` exactly. */
  pages: PukuPage[];
  activePageId: string;
  selectedIds: Set<string>;
  tool: Tool;
  viewport: Viewport;
  spaceDown: boolean;

  // Undo/redo
  past: Scene[];
  future: Scene[];

  // Live UI state
  drag: DragState | null;
  clipboard: Shape[];
  editingId: string | null;
  pendingArrow: { fromId: string } | null;

  // AI
  aiEnabled: boolean;
  aiPanelOpen: boolean;

  // Pages panel (left slide-in)
  pagesPanelOpen: boolean;

  // Style defaults — applied to newly created shapes, and edited
  // in-place when a single shape is selected.
  defaultStroke: string;
  defaultFill: string;
  defaultFontFamily: string;
  defaultFontSize: number;
  defaultFontWeight: 'normal' | 'bold';

  // Actions
  setTool: (tool: Tool) => void;
  setAiEnabled: (enabled: boolean) => void;
  toggleAiEnabled: () => void;
  openAiPanel: () => void;
  closeAiPanel: () => void;
  toggleAiPanel: () => void;
  openPagesPanel: () => void;
  closePagesPanel: () => void;

  // Viewport
  setViewport: (v: Viewport) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screenX: number, screenY: number, factor: number) => void;
  resetViewport: () => void;
  setSpaceDown: (down: boolean) => void;

  // Shapes (commit-snapshotting mutators)
  beginCreate: (kind: ShapeKind, pointer: Point) => string;
  beginFreedraw: (pointer: Point) => string;
  extendFreedraw: (pointer: Point) => void;
  beginLine: (pointer: Point) => string;
  extendLine: (pointer: Point) => void;
  commitDraft: () => void;
  cancelDraft: () => void;

  // Connector — FigJam-style free-form drag.
  beginConnectorDraft: (pointer: Point, fromId?: string | null) => string;
  extendConnector: (pointer: Point, overShapeId?: string | null) => void;
  beginReanchorEndpoint: (connectorId: string, end: 'from' | 'to', pointer: Point) => void;

  beginResize: (handle: ResizeHandle, pointer: Point) => void;
  beginMove: (pointer: Point) => void;
  beginMarquee: (pointer: Point) => void;
  updateDrag: (pointer: Point) => void;
  endDrag: () => void;

  updateShape: (id: string, patch: Partial<Shape>) => void;
  commitText: (id: string, text: string) => void;
  setEditing: (id: string | null) => void;
  deleteSelected: () => void;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  duplicateSelected: () => void;
  copySelected: () => void;
  pasteSelected: () => void;

  // Style controls
  setDefaultStroke: (color: string) => void;
  setDefaultFill: (color: string) => void;
  setDefaultFontFamily: (family: string) => void;
  setDefaultFontSize: (size: number) => void;
  setDefaultFontWeight: (weight: 'normal' | 'bold') => void;
  applyDefaultStyle: (kind: 'stroke' | 'fill' | 'fontFamily' | 'fontSize' | 'fontWeight', value: string) => void;

  setArrowLabel: (id: string, label: string) => void;
  updateArrowControlPoint: (id: string, ctrlPoint: Point) => void;
  setConnectorEndpoints: (
    id: string,
    patch: Partial<Pick<ArrowShape, 'fromId' | 'toId' | 'fromPoint' | 'toPoint'>>
  ) => void;

  loadScene: (scene: Scene) => void;
  setSceneName: (name: string) => void;

  // Pages
  createPage: (name?: string) => string;
  selectPage: (id: string) => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;

  // History
  commit: () => void;
  undo: () => void;
  redo: () => void;

  // Hit-testing
  hitTest: (pointer: Point) => string | null;
}

const NODE_KINDS: ShapeKind[] = ['rectangle', 'ellipse', 'diamond', 'text', 'sticky'];

const SCENE_STORAGE_KEY = 'puku:canvas_pages_v1';

function readStoredPages(): { pages: PukuPage[]; activePageId: string; scene: Scene } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SCENE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0 && parsed.activePageId) {
      const active = parsed.pages.find((p: any) => p.id === parsed.activePageId) ?? parsed.pages[0];
      if (active && active.scene && Array.isArray(active.scene.shapes)) {
        return {
          pages: parsed.pages,
          activePageId: active.id,
          scene: active.scene,
        };
      }
    }
  } catch (e) {
    console.error('Failed to restore canvas from localStorage:', e);
  }
  return null;
}

function savePagesToStorage(pages: PukuPage[], activePageId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      SCENE_STORAGE_KEY,
      JSON.stringify({ pages, activePageId })
    );
  } catch (e) {
    /* ignore quota / privacy errors */
  }
}

/** Wrap Zustand's `set` so that any time `scene` changes, the active page's
 *  stored scene mirrors it. This keeps `state.scene` and
 *  `state.pages[activePageId].scene` synchronized without touching every
 *  individual action. The wrapper short-circuits when only the mirror is
 *  being written, so it doesn't recurse. */
type SetState = (
  partial:
    | PukuState
    | Partial<PukuState>
    | ((state: PukuState) => PukuState | Partial<PukuState>),
  replace?: false
) => void;

export const useCanvasStore = create<PukuState>((rawSet, get) => {
  // Wrap `set` to mirror scene into pages[activePageId].scene automatically
  // and persist state to localStorage.
  let mirroring = false;
  const set: SetState = (partial, replace) => {
    // Compute the next partial.
    let next: Partial<PukuState> | PukuState | undefined;
    if (typeof partial === 'function') {
      next = (partial as (s: PukuState) => PukuState | Partial<PukuState>)(get());
    } else {
      next = partial;
    }
    rawSet(next as any, replace as any);
    if (mirroring) return;
    const state = get();
    const active = state.pages.find((p) => p.id === state.activePageId);
    let updatedPages = state.pages;
    if (active && active.scene !== state.scene) {
      mirroring = true;
      try {
        updatedPages = state.pages.map((p) =>
          p.id === state.activePageId ? { ...p, scene: state.scene } : p
        );
        rawSet({ pages: updatedPages });
      } finally {
        mirroring = false;
      }
    }
    savePagesToStorage(updatedPages, state.activePageId);
  };

  /** Push the current scene onto the undo stack before a mutation. */
  function commitToHistory() {
    set((s) => {
      const next = s.past.slice(-HISTORY_LIMIT + 1);
      next.push(s.scene);
      return { past: next, future: [] };
    });
  }

  // Restore saved state from localStorage or initialize defaults
  const stored = readStoredPages();
  const initialScene = stored?.scene ?? createEmptyScene('My Puku Canvas');
  const initialPageId = stored?.activePageId ?? cryptoRandomId();
  const initialPages = stored?.pages ?? [{ id: initialPageId, name: 'Page 1', scene: initialScene }];

  return {
    scene: initialScene,
    pages: initialPages,
    activePageId: initialPageId,
    selectedIds: new Set(),
    tool: 'select',
    viewport: { x: 0, y: 0, zoom: 1 },
    spaceDown: false,
    past: [],
    future: [],
    drag: null,
    clipboard: [],
    editingId: null,
    pendingArrow: null,
    aiEnabled: false,
    aiPanelOpen: false,
    pagesPanelOpen: false,

    // Style defaults
    defaultStroke: '#1f1f1f',
    defaultFill: '#ffffff',
    defaultFontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    defaultFontSize: 14,
    defaultFontWeight: 'normal',

    setTool: (tool) => set({ tool }),
    setAiEnabled: (aiEnabled) => set({ aiEnabled }),
    toggleAiEnabled: () => set((s) => ({ aiEnabled: !s.aiEnabled })),
    openAiPanel: () => set({ aiPanelOpen: true }),
    closeAiPanel: () => set({ aiPanelOpen: false }),
    toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
    openPagesPanel: () => set({ pagesPanelOpen: true }),
    closePagesPanel: () => set({ pagesPanelOpen: false }),

    setViewport: (viewport) => set({ viewport }),
    panBy: (dx, dy) =>
      set((s) => ({ viewport: { ...s.viewport, x: s.viewport.x + dx, y: s.viewport.y + dy } })),
    zoomAt: (screenX, screenY, factor) =>
      set((s) => {
        const oldZoom = s.viewport.zoom;
        const newZoom = clamp(oldZoom * factor, MIN_ZOOM, MAX_ZOOM);
        // Keep the screen-space point under the cursor stationary.
        // worldX = (screenX - viewport.x) / oldZoom
        const worldX = (screenX - s.viewport.x) / oldZoom;
        const worldY = (screenY - s.viewport.y) / oldZoom;
        return {
          viewport: {
            x: screenX - worldX * newZoom,
            y: screenY - worldY * newZoom,
            zoom: newZoom,
          },
        };
      }),
    resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),
    setSpaceDown: (spaceDown) => set({ spaceDown }),

    beginCreate: (kind, pointer) => {
      commitToHistory();
      const id = cryptoRandomId();
      const s = get();
      // Text shapes get fill-only — stroke is invisible/disabled by the UI
      // for the 'text' kind but we still keep the defaultStroke in case.
      const isTextOnly = kind === 'text';
      const draft: Shape = {
        id,
        kind,
        x: pointer.x,
        y: pointer.y,
        width: 1,
        height: 1,
        text: defaultTextFor(kind),
        stroke: isTextOnly ? 'transparent' : s.defaultStroke,
        fill: isTextOnly ? s.defaultFill : (defaultFillFor(kind) || s.defaultFill),
        strokeWidth: 1.5,
        fontFamily: s.defaultFontFamily,
        fontSize: s.defaultFontSize,
        fontWeight: s.defaultFontWeight,
        zIndex: Date.now(),
      } as Shape;
      set((cur) => ({
        scene: {
          ...cur.scene,
          shapes: [...cur.scene.shapes, draft],
          updatedAt: new Date().toISOString(),
        },
        drag: { kind: 'create', startPointer: pointer, currentPointer: pointer, draftId: id },
        selectedIds: new Set([id]),
      }));
      return id;
    },

    beginFreedraw: (pointer) => {
      commitToHistory();
      const id = cryptoRandomId();
      const draft: FreedrawShape = {
        id,
        kind: 'freedraw',
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0,
        points: [{ x: 0, y: 0 }],
        stroke: '#1f1f1f',
        strokeWidth: 1.5,
        zIndex: Date.now(),
      };
      set((s) => ({
        scene: { ...s.scene, shapes: [...s.scene.shapes, draft], updatedAt: new Date().toISOString() },
        drag: {
          kind: 'freedraw',
          startPointer: pointer,
          currentPointer: pointer,
          draftId: id,
          draftPoints: [{ x: 0, y: 0 }],
        },
        selectedIds: new Set([id]),
      }));
      return id;
    },

    extendFreedraw: (pointer) => {
      const drag = get().drag;
      if (!drag || drag.kind !== 'freedraw') return;
      const local: Point = {
        x: pointer.x - drag.startPointer.x,
        y: pointer.y - drag.startPointer.y,
      };
      const points = drag.draftPoints.concat([local]);
      const draftId = drag.draftId;
      // Defer bounds normalization to endDrag — during the drag we just grow
      // the local point list and update width/height to the bbox in local
      // space. We do NOT mutate x,y or re-translate points each frame, which
      // was causing the visible stroke to jump.
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.map((sh) => {
            if (sh.id !== draftId || !isFreedraw(sh)) return sh;
            // Compute bbox of all points (still local-origin-relative to
            // shape's original x,y). Use min/max so we don't shift origin.
            let minX = 0, minY = 0, maxX = 0, maxY = 0;
            for (const p of points) {
              if (p.x < minX) minX = p.x;
              if (p.y < minY) minY = p.y;
              if (p.x > maxX) maxX = p.x;
              if (p.y > maxY) maxY = p.y;
            }
            return {
              ...sh,
              points,
              width: Math.max(1, maxX - minX),
              height: Math.max(1, maxY - minY),
            } as FreedrawShape;
          }),
          updatedAt: new Date().toISOString(),
        },
        drag: { ...drag, draftPoints: points, currentPointer: pointer },
      }));
    },

    beginLine: (pointer) => {
      commitToHistory();
      const id = cryptoRandomId();
      const draft: LineShape = {
        id,
        kind: 'line',
        x: pointer.x,
        y: pointer.y,
        width: 0,
        height: 0,
        points: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
        stroke: '#1f1f1f',
        strokeWidth: 1.5,
        zIndex: Date.now(),
      };
      set((s) => ({
        scene: { ...s.scene, shapes: [...s.scene.shapes, draft], updatedAt: new Date().toISOString() },
        drag: { kind: 'line', startPointer: pointer, currentPointer: pointer, draftId: id },
        selectedIds: new Set([id]),
      }));
      return id;
    },

    extendLine: (pointer) => {
      const drag = get().drag;
      if (!drag || drag.kind !== 'line') return;
      const draftId = drag.draftId!;
      const local: Point = { x: pointer.x - drag.startPointer.x, y: pointer.y - drag.startPointer.y };
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.map((sh) => {
            if (sh.id !== draftId || !isLine(sh)) return sh;
            return { ...sh, points: [sh.points[0], local], width: local.x, height: local.y };
          }),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    commitDraft: () => set({ drag: null }),
    cancelDraft: () => {
      // Remove the draft shape (create/freedraw/line/connector).
      const drag = get().drag;
      if (!drag) return;
      // Only drag kinds that have a draftId are cancellable in the
      // "remove the in-progress shape" sense.
      if (drag.kind !== 'create' && drag.kind !== 'freedraw' && drag.kind !== 'line' && drag.kind !== 'connector') {
        set({ drag: null });
        return;
      }
      const draftId = drag.draftId;
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.filter((sh) => sh.id !== draftId),
          updatedAt: new Date().toISOString(),
        },
        drag: null,
        selectedIds: new Set(),
      }));
    },

    beginResize: (resizeHandle, pointer) => {
      commitToHistory();
      const originals = new Map<string, Shape>();
      get().scene.shapes.forEach((s) => {
        if (get().selectedIds.has(s.id)) originals.set(s.id, s);
      });
      set({
        drag: {
          kind: 'resize',
          startPointer: pointer,
          currentPointer: pointer,
          originalShapes: originals,
          resizeHandle,
        },
      });
    },

    beginMove: (pointer) => {
      commitToHistory();
      const state = get();
      const originals = new Map<string, Shape>();
      // Capture every selected shape as the move target.
      for (const s of state.scene.shapes) {
        if (state.selectedIds.has(s.id)) originals.set(s.id, s);
      }
      // Also pull in the from/to shapes of any connector in the selection so
      // that the connector "carries" its endpoints when moved. This matches
      // Excalidraw/FigJam behavior — dragging a connector drags the shapes
      // it connects.
      for (const s of state.scene.shapes) {
        if (!isArrow(s)) continue;
        if (!originals.has(s.id)) continue;
        if (s.fromId) {
          const fromShape = state.scene.shapes.find((x) => x.id === s.fromId);
          if (fromShape && !originals.has(fromShape.id)) originals.set(fromShape.id, fromShape);
        }
        if (s.toId) {
          const toShape = state.scene.shapes.find((x) => x.id === s.toId);
          if (toShape && !originals.has(toShape.id)) originals.set(toShape.id, toShape);
        }
      }
      if (originals.size === 0) {
        // Nothing to move — treat as marquee start.
        set({
          drag: { kind: 'marquee', startPointer: pointer, currentPointer: pointer },
        });
      } else {
        set({
          drag: {
            kind: 'move',
            startPointer: pointer,
            currentPointer: pointer,
            originalShapes: originals,
          },
        });
      }
    },

    beginMarquee: (pointer) => {
      set({
        drag: { kind: 'marquee', startPointer: pointer, currentPointer: pointer },
        selectedIds: new Set(),
      });
    },

    updateDrag: (pointer) => {
      const drag = get().drag;
      if (!drag) return;
      const dx = pointer.x - drag.startPointer.x;
      const dy = pointer.y - drag.startPointer.y;

      if (drag.kind === 'create' && drag.draftId) {
        set((s) => ({
          scene: {
            ...s.scene,
            shapes: s.scene.shapes.map((sh) =>
              sh.id !== drag.draftId
                ? sh
                : resizeShapeFromHandle(sh, drag.startPointer, pointer, 'se')
            ),
            updatedAt: new Date().toISOString(),
          },
          drag: { ...drag, currentPointer: pointer },
        }));
        return;
      }

      if (drag.kind === 'move' && drag.originalShapes) {
        set((s) => ({
          scene: {
            ...s.scene,
            shapes: s.scene.shapes.map((sh) => {
              const original = drag.originalShapes!.get(sh.id);
              if (!original) return sh;
              return { ...original, x: original.x + dx, y: original.y + dy } as Shape;
            }),
            updatedAt: new Date().toISOString(),
          },
          drag: { ...drag, currentPointer: pointer },
        }));
        return;
      }

      if (drag.kind === 'resize' && drag.originalShapes && drag.resizeHandle) {
        set((s) => ({
          scene: {
            ...s.scene,
            shapes: s.scene.shapes.map((sh) => {
              const original = drag.originalShapes!.get(sh.id);
              if (!original) return sh;
              return resizeShapeFromHandle(original, drag.startPointer, pointer, drag.resizeHandle!);
            }),
            updatedAt: new Date().toISOString(),
          },
          drag: { ...drag, currentPointer: pointer },
        }));
        return;
      }

      if (drag.kind === 'freedraw') {
        get().extendFreedraw(pointer);
        // currentPointer is updated by extendFreedraw indirectly via the drag state.
        return;
      }

      if (drag.kind === 'line') {
        get().extendLine(pointer);
        return;
      }

      if (drag.kind === 'connector') {
        // Update the connector's dragged endpoint to the current pointer
        // (free) — if the pointer is over a shape, the canvas can call
        // extendConnector with overShapeId; otherwise we just use the
        // pointer as a free endpoint.
        const overShapeId = getHitShapeId(get().scene, pointer);
        get().extendConnector(pointer, overShapeId);
        set({ drag: { ...drag, currentPointer: pointer } });
        return;
      }

      // Marquee — just track the pointer; selection happens on endDrag.
      if (drag.kind === 'marquee') {
        set({ drag: { ...drag, currentPointer: pointer } });
      }
    },

    endDrag: () => {
      const drag = get().drag;
      if (!drag) return;

      if (drag.kind === 'marquee') {
        const start = drag.startPointer;
        const end = drag.currentPointer;
        const minX = Math.min(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxX = Math.max(start.x, end.x);
        const maxY = Math.max(start.y, end.y);
        const rect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        const ids = new Set<string>();
        const shapes = get().scene.shapes;
        for (const sh of shapes) {
          const b = getShapeBoundingBox(sh, shapes);
          if (rectsIntersect(b, rect)) {
            ids.add(sh.id);
          }
        }
        set({ drag: null, selectedIds: ids });
        return;
      }

      if (drag.kind === 'freedraw') {
        const draftId = drag.draftId;
        const finalPoints = drag.draftPoints;
        set((s) => ({
          scene: {
            ...s.scene,
            shapes: s.scene.shapes.map((sh) => {
              if (sh.id !== draftId || !isFreedraw(sh)) return sh;
              return updateFreedrawBounds({ ...sh, points: finalPoints });
            }),
            updatedAt: new Date().toISOString(),
          },
          drag: null,
          tool: 'select',
        }));
        return;
      }

      if (drag.kind === 'connector') {
        const draftId = drag.draftId;
        const draft = get().scene.shapes.find((sh) => sh.id === draftId);
        if (!draft || !isArrow(draft)) {
          set({ drag: null, tool: 'select' });
          return;
        }
        const startPt = resolveArrowStart(draft, get().scene.shapes);
        const endPt = resolveArrowEnd(draft, get().scene.shapes);
        const len = startPt && endPt ? Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y) : 0;
        if (len < 5) {
          set((s) => ({
            scene: {
              ...s.scene,
              shapes: s.scene.shapes.filter((sh) => sh.id !== draftId),
              updatedAt: new Date().toISOString(),
            },
            drag: null,
            selectedIds: new Set(),
            tool: 'select',
          }));
          return;
        }
        set({ drag: null, tool: 'select' });
        return;
      }

      if (drag.kind === 'create') {
        set({ drag: null, tool: 'select' });
        return;
      }

      set({ drag: null });
    },

    updateShape: (id, patch) => {
      commitToHistory();
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.map((sh) => (sh.id === id ? ({ ...sh, ...patch } as Shape) : sh)),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    commitText: (id, text) => {
      commitToHistory();
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.map((sh) => (sh.id === id ? ({ ...sh, text } as Shape) : sh)),
          updatedAt: new Date().toISOString(),
        },
        editingId: null,
      }));
    },

    setEditing: (editingId) => set({ editingId }),

    deleteSelected: () => {
      commitToHistory();
      set((s) => {
        const ids = s.selectedIds;
        const remaining = s.scene.shapes.filter((sh) => {
          if (ids.has(sh.id)) return false;
          if (isArrow(sh)) {
            // Cascade-delete arrows attached to a deleted endpoint. Free
            // endpoints (no fromId/toId) are inert.
            if (sh.fromId && ids.has(sh.fromId)) return false;
            if (sh.toId && ids.has(sh.toId)) return false;
          }
          return true;
        });
        return {
          scene: { ...s.scene, shapes: remaining, updatedAt: new Date().toISOString() },
          selectedIds: new Set(),
          editingId: null,
        };
      });
    },

    setSelected: (ids) => set({ selectedIds: new Set(ids) }),
    toggleSelected: (id) =>
      set((s) => {
        const next = new Set(s.selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedIds: next };
      }),
    clearSelection: () => set({ selectedIds: new Set(), editingId: null }),

    selectAll: () => {
      const s = get();
      set({ selectedIds: new Set(s.scene.shapes.map((sh) => sh.id)) });
    },

    duplicateSelected: () => {
      const s = get();
      if (s.selectedIds.size === 0) return;
      commitToHistory();

      const selectedShapes = s.scene.shapes.filter((sh) => s.selectedIds.has(sh.id));
      const idMap = new Map<string, string>();
      for (const sh of selectedShapes) {
        idMap.set(sh.id, cryptoRandomId());
      }

      const duplicates: Shape[] = selectedShapes.map((sh) => {
        const newId = idMap.get(sh.id)!;
        if (isArrow(sh)) {
          const fromId = sh.fromId ? (idMap.get(sh.fromId) ?? sh.fromId) : undefined;
          const toId = sh.toId ? (idMap.get(sh.toId) ?? sh.toId) : undefined;
          return {
            ...sh,
            id: newId,
            fromId,
            toId,
            fromPoint: sh.fromPoint ? { x: sh.fromPoint.x + 20, y: sh.fromPoint.y + 20 } : undefined,
            toPoint: sh.toPoint ? { x: sh.toPoint.x + 20, y: sh.toPoint.y + 20 } : undefined,
          } as ArrowShape;
        }

        return {
          ...sh,
          id: newId,
          x: sh.x + 20,
          y: sh.y + 20,
        } as Shape;
      });

      const newSelectedIds = new Set(duplicates.map((d) => d.id));
      set({
        scene: {
          ...s.scene,
          shapes: [...s.scene.shapes, ...duplicates],
          updatedAt: new Date().toISOString(),
        },
        selectedIds: newSelectedIds,
      });
    },

    copySelected: () => {
      const s = get();
      const selectedShapes = s.scene.shapes.filter((sh) => s.selectedIds.has(sh.id));
      if (selectedShapes.length > 0) {
        set({ clipboard: JSON.parse(JSON.stringify(selectedShapes)) });
      }
    },

    pasteSelected: () => {
      const s = get();
      if (s.clipboard.length === 0) return;
      commitToHistory();

      const idMap = new Map<string, string>();
      for (const sh of s.clipboard) {
        idMap.set(sh.id, cryptoRandomId());
      }

      const pasted: Shape[] = s.clipboard.map((sh) => {
        const newId = idMap.get(sh.id)!;
        if (isArrow(sh)) {
          const fromId = sh.fromId ? (idMap.get(sh.fromId) ?? sh.fromId) : undefined;
          const toId = sh.toId ? (idMap.get(sh.toId) ?? sh.toId) : undefined;
          return {
            ...sh,
            id: newId,
            fromId,
            toId,
            fromPoint: sh.fromPoint ? { x: sh.fromPoint.x + 20, y: sh.fromPoint.y + 20 } : undefined,
            toPoint: sh.toPoint ? { x: sh.toPoint.x + 20, y: sh.toPoint.y + 20 } : undefined,
          } as ArrowShape;
        }

        return {
          ...sh,
          id: newId,
          x: sh.x + 20,
          y: sh.y + 20,
        } as Shape;
      });

      const newSelectedIds = new Set(pasted.map((d) => d.id));
      set({
        scene: {
          ...s.scene,
          shapes: [...s.scene.shapes, ...pasted],
          updatedAt: new Date().toISOString(),
        },
        selectedIds: newSelectedIds,
      });
    },

    // Style controls — when a single shape is selected, the picker edits
    // that shape in-place; when nothing is selected, the picker updates the
    // default applied to future shapes.
    setDefaultStroke: (defaultStroke) => set({ defaultStroke }),
    setDefaultFill: (defaultFill) => set({ defaultFill }),
    setDefaultFontFamily: (defaultFontFamily) => set({ defaultFontFamily }),
    setDefaultFontSize: (defaultFontSize) => set({ defaultFontSize }),
    setDefaultFontWeight: (defaultFontWeight) => set({ defaultFontWeight }),
    applyDefaultStyle: (kind, value) => {
      const s = get();
      const ids = s.selectedIds;
      if (ids.size === 1) {
        // Edit the selected shape directly.
        commitToHistory();
        const id = [...ids][0];
        const patch: any = {};
        if (kind === 'stroke') patch.stroke = value;
        else if (kind === 'fill') patch.fill = value;
        else if (kind === 'fontFamily') patch.fontFamily = value;
        else if (kind === 'fontSize') patch.fontSize = Number(value) || s.defaultFontSize;
        else if (kind === 'fontWeight') patch.fontWeight = value;
        set((cur) => ({
          scene: {
            ...cur.scene,
            shapes: cur.scene.shapes.map((sh) =>
              sh.id === id ? ({ ...sh, ...patch } as Shape) : sh
            ),
            updatedAt: new Date().toISOString(),
          },
        }));
        // Also update the default so future shapes match.
        if (kind === 'stroke') set({ defaultStroke: String(value) });
        else if (kind === 'fill') set({ defaultFill: String(value) });
        else if (kind === 'fontFamily') set({ defaultFontFamily: String(value) });
        else if (kind === 'fontSize') set({ defaultFontSize: Number(value) || s.defaultFontSize });
        else if (kind === 'fontWeight') set({ defaultFontWeight: value as 'normal' | 'bold' });
        return;
      }
      // No selection (or multi) — just update the default.
      if (kind === 'stroke') set({ defaultStroke: String(value) });
      else if (kind === 'fill') set({ defaultFill: String(value) });
      else if (kind === 'fontFamily') set({ defaultFontFamily: String(value) });
      else if (kind === 'fontSize') set({ defaultFontSize: Number(value) || s.defaultFontSize });
      else if (kind === 'fontWeight') set({ defaultFontWeight: value as 'normal' | 'bold' });
    },

    // Connector drag — shape-anchored on both ends. Caller must invoke this
    // with a real `fromId` (pointerdown was on a shape); free-floating start
    // is not allowed. During the drag, `toId` is only set when the pointer
    // is over a shape; otherwise the connector has no valid `to` end and
    // `endDrag` cancels the draft.
    beginConnectorDraft: (pointer, fromId) => {
      commitToHistory();
      const id = cryptoRandomId();
      const arrow: ArrowShape = {
        id,
        kind: 'arrow',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        fromId: fromId ?? null,
        fromPoint: fromId ? undefined : pointer,
        toId: null,
        toPoint: pointer,
        stroke: '#1f1f1f',
        strokeWidth: 1.5,
        zIndex: Date.now(),
      };
      const endSnapshot = {
        fromId: arrow.fromId ?? null,
        toId: null,
        fromPoint: arrow.fromPoint,
        toPoint: pointer,
      };
      set((s) => ({
        scene: { ...s.scene, shapes: [...s.scene.shapes, arrow], updatedAt: new Date().toISOString() },
        drag: {
          kind: 'connector',
          startPointer: pointer,
          currentPointer: pointer,
          draftId: id,
          end: 'to',
          endSnapshot,
        },
        selectedIds: new Set([id]),
        pendingArrow: null,
      }));
      return id;
    },

    extendConnector: (pointer, overShapeId) => {
      const drag = get().drag;
      if (!drag || drag.kind !== 'connector') return;
      const draftId = drag.draftId;
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.map((sh) => {
            if (sh.id !== draftId || !isArrow(sh)) return sh;
            if (drag.end === 'to') {
              if (overShapeId) {
                return { ...sh, toId: overShapeId, toPoint: undefined };
              }
              return { ...sh, toId: null, toPoint: pointer };
            } else {
              if (overShapeId) {
                return { ...sh, fromId: overShapeId, fromPoint: undefined };
              }
              return { ...sh, fromId: null, fromPoint: pointer };
            }
          }),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    beginReanchorEndpoint: (connectorId, end, pointer) => {
      commitToHistory();
      const connector = get().scene.shapes.find((s) => s.id === connectorId);
      if (!connector || !isArrow(connector)) return;
      const endSnapshot = {
        fromId: connector.fromId ?? null,
        toId: connector.toId ?? null,
        fromPoint: connector.fromPoint,
        toPoint: connector.toPoint,
      };
      // Initialize the dragged endpoint to a free point at the pointer; the
      // pointermove will refine it (snap to a shape if hovered).
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.map((sh) => {
            if (sh.id !== connectorId || !isArrow(sh)) return sh;
            if (end === 'from') {
              return { ...sh, fromId: null, fromPoint: { x: pointer.x, y: pointer.y } };
            }
            return { ...sh, toId: null, toPoint: { x: pointer.x, y: pointer.y } };
          }),
          updatedAt: new Date().toISOString(),
        },
        drag: {
          kind: 'connector',
          startPointer: pointer,
          currentPointer: pointer,
          draftId: connectorId,
          end,
          endSnapshot,
        },
      }));
    },

    setArrowLabel: (id, label) => {
      commitToHistory();
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.map((sh) =>
            sh.id === id && isArrow(sh) ? { ...sh, label } : sh
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    updateArrowControlPoint: (id, ctrlPoint) => {
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.map((sh) =>
            sh.id === id && isArrow(sh) ? { ...sh, points: [ctrlPoint] } : sh
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    setConnectorEndpoints: (id, patch) => {
      commitToHistory();
      set((s) => ({
        scene: {
          ...s.scene,
          shapes: s.scene.shapes.map((sh) =>
            sh.id === id && isArrow(sh) ? { ...sh, ...patch } : sh
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    loadScene: (scene) =>
      set({
        scene,
        // Replace the active page's scene; keep pages structure intact.
        pages: get().pages.map((p) =>
          p.id === get().activePageId ? { ...p, scene } : p
        ),
        selectedIds: new Set(),
        past: [],
        future: [],
        editingId: null,
        pendingArrow: null,
        drag: null,
      }),

    setSceneName: (name) => {
      commitToHistory();
      set((s) => {
        const next = { ...s.scene, name };
        return {
          scene: next,
          pages: s.pages.map((p) =>
            p.id === s.activePageId ? { ...p, name, scene: next } : p
          ),
        };
      });
    },

    // Pages — each page owns its own scene. Switching pages swaps `scene`
    // (and clears all transient interaction state).
    createPage: (name) => {
      const newName =
        name ?? `Page ${get().pages.length + 1}`;
      const id = cryptoRandomId();
      const freshScene: Scene = createEmptyScene(newName);
      set((s) => ({
        pages: [...s.pages, { id, name: newName, scene: freshScene }],
        activePageId: id,
        scene: freshScene,
        selectedIds: new Set(),
        past: [],
        future: [],
        editingId: null,
        pendingArrow: null,
        drag: null,
        viewport: { x: 0, y: 0, zoom: 1 },
      }));
      return id;
    },

    selectPage: (id) => {
      const target = get().pages.find((p) => p.id === id);
      if (!target) return;
      set({
        activePageId: id,
        scene: target.scene,
        selectedIds: new Set(),
        past: [],
        future: [],
        editingId: null,
        pendingArrow: null,
        drag: null,
        viewport: { x: 0, y: 0, zoom: 1 },
      });
    },

    deletePage: (id) => {
      const s = get();
      if (s.pages.length <= 1) return; // never leave zero pages
      const idx = s.pages.findIndex((p) => p.id === id);
      if (idx === -1) return;
      const wasActive = s.activePageId === id;
      const remaining = s.pages.filter((p) => p.id !== id);
      const nextActive = wasActive
        ? remaining[Math.min(idx, remaining.length - 1)]
        : remaining.find((p) => p.id === s.activePageId)!;
      set({
        pages: remaining,
        activePageId: nextActive.id,
        scene: nextActive.scene,
        selectedIds: new Set(),
        past: [],
        future: [],
        editingId: null,
        pendingArrow: null,
        drag: null,
      });
    },

    duplicatePage: (id) => {
      const target = get().pages.find((p) => p.id === id);
      if (!target) return;
      const newId = cryptoRandomId();
      const newName = `${target.name} (Copy)`;
      const dupScene: Scene = JSON.parse(JSON.stringify(target.scene));
      dupScene.id = cryptoRandomId();
      dupScene.name = newName;

      set((s) => ({
        pages: [...s.pages, { id: newId, name: newName, scene: dupScene }],
        activePageId: newId,
        scene: dupScene,
        selectedIds: new Set(),
        past: [],
        future: [],
        editingId: null,
        pendingArrow: null,
        drag: null,
      }));
    },

    renamePage: (id, name) => {
      set((s) => ({
        pages: s.pages.map((p) =>
          p.id === id ? { ...p, name } : p
        ),
        // If we're renaming the active page, mirror the name onto the scene.
        scene:
          s.activePageId === id
            ? { ...s.scene, name }
            : s.scene,
      }));
    },

    commit: () => commitToHistory(),
    undo: () =>
      set((s) => {
        if (s.past.length === 0) return s;
        const prev = s.past[s.past.length - 1];
        const newPast = s.past.slice(0, -1);
        return {
          past: newPast,
          scene: prev,
          future: [s.scene, ...s.future].slice(0, HISTORY_LIMIT),
          selectedIds: new Set(),
          editingId: null,
          pendingArrow: null,
          drag: null,
        };
      }),
    redo: () =>
      set((s) => {
        if (s.future.length === 0) return s;
        const [next, ...rest] = s.future;
        return {
          past: [...s.past, s.scene].slice(-HISTORY_LIMIT),
          scene: next,
          future: rest,
          selectedIds: new Set(),
          editingId: null,
          pendingArrow: null,
          drag: null,
        };
      }),

    hitTest: (pointer) => {
      const shapes = get().scene.shapes;
      // Iterate top-down so the visually-on-top shape wins.
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        if (isArrow(s)) {
          const a = resolveArrowStart(s, shapes);
          const b = resolveArrowEnd(s, shapes);
          if (!a || !b) continue;
          // Sample along the bezier for tolerance.
          if (distanceToBezier(pointer, a, b, s.points?.[0], s.fromId || s.toId ? 16 : 1) <= 8)
            return s.id;
          continue;
        }
        if (isLine(s)) {
          const a = { x: s.x + s.points[0].x, y: s.y + s.points[0].y };
          const b = { x: s.x + s.points[1].x, y: s.y + s.points[1].y };
          if (distanceToSegment(pointer, a, b) <= 8) return s.id;
          continue;
        }
        if (isFreedraw(s)) {
          // Check a coarse bbox first.
          const bbox = { x: s.x, y: s.y, width: Math.max(1, s.width), height: Math.max(1, s.height) };
          if (!pointInRect(pointer, bbox)) continue;
          // Sample consecutive segments.
          const pts = s.points.map((p) => ({ x: s.x + p.x, y: s.y + p.y }));
          for (let k = 1; k < pts.length; k++) {
            if (distanceToSegment(pointer, pts[k - 1], pts[k]) <= 8) return s.id;
          }
          continue;
        }
        const bbox = { x: s.x, y: s.y, width: Math.max(1, s.width), height: Math.max(1, s.height) };
        if (s.kind === 'ellipse') {
          if (pointInEllipse(pointer, bbox)) return s.id;
        } else {
          if (pointInRect(pointer, bbox)) return s.id;
        }
      }
      return null;
    },
  };
});

function defaultTextFor(kind: ShapeKind): string {
  switch (kind) {
    case 'rectangle': return 'Process';
    case 'ellipse': return 'Start';
    case 'diamond': return 'Decision';
    case 'text': return 'Text';
    case 'sticky': return 'Note';
    default: return '';
  }
}

function defaultFillFor(kind: ShapeKind): string {
  switch (kind) {
    case 'sticky': return '#fef3c7';
    case 'diamond': return '#ffffff';
    case 'ellipse': return '#dcfce7';
    default: return '#ffffff';
  }
}

/**
 * Resize/move a shape from one pointer position to another using a handle.
 * `startPointer` is the pointer position when the drag began; `pointer` is
 * the current position. `handle` indicates which corner/edge is being dragged.
 */
function resizeShapeFromHandle(
  shape: Shape,
  startPointer: Point,
  pointer: Point,
  handle: ResizeHandle
): Shape {
  if (shape.kind === 'arrow' || shape.kind === 'line' || shape.kind === 'freedraw') {
    // These kinds don't support resize from handles yet.
    return shape;
  }
  const sx = startPointer.x - shape.x;
  const sy = startPointer.y - shape.y;
  const ex = pointer.x - shape.x;
  const ey = pointer.y - shape.y;
  let x = shape.x;
  let y = shape.y;
  let w = shape.width;
  let h = shape.height;

  switch (handle) {
    case 'nw': x = shape.x + ex; y = shape.y + ey; w = sx - ex; h = sy - ey; break;
    case 'n':  y = shape.y + ey; h = sy - ey; break;
    case 'ne': y = shape.y + ey; w = ex - sx; h = sy - ey; break;
    case 'w':  x = shape.x + ex; w = sx - ex; break;
    case 'e':  w = ex - sx; break;
    case 'sw': x = shape.x + ex; w = sx - ex; h = ey - sy; break;
    case 's':  h = ey - sy; break;
    case 'se': w = ex - sx; h = ey - sy; break;
  }

  // Normalize (negative width/height means drag went leftward/upward).
  if (w < 2) {
    w = 2;
    if (handle === 'nw' || handle === 'w' || handle === 'sw') x = shape.x + sx - 2;
  }
  if (h < 2) {
    h = 2;
    if (handle === 'nw' || handle === 'n' || handle === 'ne') y = shape.y + sy - 2;
  }

  return { ...shape, x, y, width: w, height: h } as Shape;
}

/**
 * Update a freedraw shape's bounds (x/y/width/height) from its points list.
 * Points are stored relative to (x, y) and the first point is always (0,0).
 */
function updateFreedrawBounds(shape: FreedrawShape): FreedrawShape {
  if (shape.points.length === 0) return shape;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of shape.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  // Translate points so min is at (0,0).
  const translated = shape.points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
  return {
    ...shape,
    x: shape.x + minX,
    y: shape.y + minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    points: translated,
  };
}

/**
 * Resolve the absolute start point of an arrow/connector. Either the center
 * of an anchored shape (with no edge trimming — we keep it simple here) or
 * a free-floating point.
 */
export function resolveArrowStart(
  arrow: ArrowShape,
  shapes: Shape[]
): Point | null {
  if (arrow.fromId) {
    const s = shapes.find((x) => x.id === arrow.fromId);
    if (!s) return arrow.fromPoint ?? null;
    let target: Point = center(s);
    if (arrow.points?.[0]) {
      target = arrow.points[0];
    } else if (arrow.toId) {
      const toShape = shapes.find((x) => x.id === arrow.toId);
      if (toShape) target = center(toShape);
    } else if (arrow.toPoint) {
      target = arrow.toPoint;
    }
    return getShapeIntersection(s, target);
  }
  return arrow.fromPoint ?? null;
}

export function resolveArrowEnd(
  arrow: ArrowShape,
  shapes: Shape[]
): Point | null {
  if (arrow.toId) {
    const s = shapes.find((x) => x.id === arrow.toId);
    if (!s) return arrow.toPoint ?? null;
    let source: Point = center(s);
    if (arrow.points?.[0]) {
      source = arrow.points[0];
    } else if (arrow.fromId) {
      const fromShape = shapes.find((x) => x.id === arrow.fromId);
      if (fromShape) source = center(fromShape);
    } else if (arrow.fromPoint) {
      source = arrow.fromPoint;
    }
    return getShapeIntersection(s, source);
  }
  return arrow.toPoint ?? null;
}

export function getShapeBoundingBox(sh: Shape, shapes: Shape[]): Rect {
  if (sh.kind === 'line' && isLine(sh)) {
    const x1 = sh.x + sh.points[0].x;
    const y1 = sh.y + sh.points[0].y;
    const x2 = sh.x + sh.points[1].x;
    const y2 = sh.y + sh.points[1].y;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  if (sh.kind === 'freedraw' && isFreedraw(sh)) {
    if (!sh.points || sh.points.length === 0) {
      return { x: sh.x, y: sh.y, width: Math.max(1, sh.width), height: Math.max(1, sh.height) };
    }
    const xs = sh.points.map((p) => sh.x + p.x);
    const ys = sh.points.map((p) => sh.y + p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }

  if (sh.kind === 'arrow' && isArrow(sh)) {
    const start = resolveArrowStart(sh, shapes);
    const end = resolveArrowEnd(sh, shapes);
    if (start && end) {
      const minX = Math.min(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxX = Math.max(start.x, end.x);
      const maxY = Math.max(start.y, end.y);
      return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
    }
  }

  return { x: sh.x, y: sh.y, width: Math.max(1, sh.width), height: Math.max(1, sh.height) };
}

/**
 * Compute the bezier control point for a curved connector (FigJam-style).
 * When `points` is set on the arrow, the first entry is treated as a free
 * control point (absolute); otherwise we synthesize one perpendicular to the
 * line, scaled by line length.
 */
export function bezierControlPoint(
  start: Point,
  end: Point,
  override?: Point
): Point {
  if (override) return override;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  // Perpendicular unit vector.
  const px = -dy / len;
  const py = dx / len;
  const offset = Math.max(20, Math.min(120, len * 0.25));
  // Place control point at the midpoint, offset perpendicular.
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  return { x: mid.x + px * offset, y: mid.y + py * offset };
}

/**
 * Approximate distance from a point to a quadratic bezier. Samples `steps`
 * points along the curve and returns the minimum segment distance.
 */
export function distanceToBezier(
  p: Point,
  start: Point,
  end: Point,
  override: Point | undefined,
  steps = 16
): number {
  const c = bezierControlPoint(start, end, override);
  let min = Infinity;
  let prev = start;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * c.x + t * t * end.x;
    const y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * c.y + t * t * end.y;
    const here = { x, y };
    const d = distanceToSegment(p, prev, here);
    if (d < min) min = d;
    prev = here;
  }
  return min;
}

/**
 * Find the topmost shape under a pointer, ignoring arrows/lines/freedraw.
 * Used by connector drag to snap endpoints to shapes.
 */
export function getHitShapeId(scene: Scene, pointer: Point): string | null {
  const shapes = scene.shapes;
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (isArrow(s) || isLine(s) || isFreedraw(s)) continue;
    const bbox = {
      x: s.x,
      y: s.y,
      width: Math.max(1, s.width),
      height: Math.max(1, s.height),
    };
    if (s.kind === 'ellipse') {
      if (pointInEllipse(pointer, bbox)) return s.id;
    } else {
      if (pointInRect(pointer, bbox)) return s.id;
    }
  }
  return null;
}

export { NODE_KINDS, HANDLE_SIZE };
