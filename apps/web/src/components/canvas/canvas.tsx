import { useRef, useCallback, useEffect } from 'react';
import type { ArrowShape, Shape } from '@puku/types';
import { isArrow } from '@puku/types';
import {
  useCanvasStore,
  NODE_KINDS,
  HANDLE_SIZE,
  type ResizeHandle,
} from '../../store/canvas-store';
import { ShapeNode } from './shape-node';
import { Arrow } from './arrow';
import { Marquee } from './marquee';
import { ResizeHandles } from './resize-handles';

export function Canvas() {
  const scene = useCanvasStore((s) => s.scene);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const tool = useCanvasStore((s) => s.tool);
  const viewport = useCanvasStore((s) => s.viewport);
  const spaceDown = useCanvasStore((s) => s.spaceDown);
  const drag = useCanvasStore((s) => s.drag);
  const pendingArrow = useCanvasStore((s) => s.pendingArrow);

  const beginCreate = useCanvasStore((s) => s.beginCreate);
  const beginFreedraw = useCanvasStore((s) => s.beginFreedraw);
  const beginLine = useCanvasStore((s) => s.beginLine);
  const beginMove = useCanvasStore((s) => s.beginMove);
  const beginMarquee = useCanvasStore((s) => s.beginMarquee);
  const beginResize = useCanvasStore((s) => s.beginResize);
  const updateDrag = useCanvasStore((s) => s.updateDrag);
  const endDrag = useCanvasStore((s) => s.endDrag);
  const cancelDraft = useCanvasStore((s) => s.cancelDraft);
  const setSelected = useCanvasStore((s) => s.setSelected);
  const toggleSelected = useCanvasStore((s) => s.toggleSelected);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const setTool = useCanvasStore((s) => s.setTool);
  const setEditing = useCanvasStore((s) => s.setEditing);
  const beginConnectorDraft = useCanvasStore((s) => s.beginConnectorDraft);
  const beginReanchorEndpoint = useCanvasStore((s) => s.beginReanchorEndpoint);
  const updateArrowControlPoint = useCanvasStore((s) => s.updateArrowControlPoint);
  const setArrowLabel = useCanvasStore((s) => s.setArrowLabel);
  const zoomAt = useCanvasStore((s) => s.zoomAt);
  const panBy = useCanvasStore((s) => s.panBy);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const toWorldPoint = useCallback(
    (clientX: number, clientY: number) => {
      return {
        x: (clientX - viewport.x) / viewport.zoom,
        y: (clientY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Ctrl/Cmd + wheel or pinch-to-zoom -> Zoom
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 0.0015);
        zoomAt(sx, sy, factor);
      } else {
        // Regular mouse scroll or trackpad drag -> Pan canvas
        panBy(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt, panBy]);

  /**
   * Pointer-down on the SVG background. Dispatches based on the active tool.
   */
  const handleBackgroundDown = (e: React.PointerEvent) => {
    if (e.target !== svgRef.current) return;
    e.preventDefault();
    const p = toWorldPoint(e.clientX, e.clientY);

    clearSelection();

    // Pan tool, or spacebar held, or middle mouse → pan
    if (tool === 'pan' || spaceDown || e.button === 1) {
      let lastX = e.clientX;
      let lastY = e.clientY;
      const onMove = (ev: PointerEvent) => {
        panBy(ev.clientX - lastX, ev.clientY - lastY);
        lastX = ev.clientX;
        lastY = ev.clientY;
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return;
    }

    // Shape tools → start drag-to-create
    if (NODE_KINDS.includes(tool as any)) {
      beginCreate(tool as any, p);
      attachPointerTracking();
      return;
    }

    if (tool === 'freedraw') {
      beginFreedraw(p);
      attachPointerTracking();
      return;
    }

    if (tool === 'line') {
      beginLine(p);
      attachPointerTracking();
      return;
    }

    if (tool === 'connector') {
      beginConnectorDraft(p, null);
      attachPointerTracking();
      return;
    }

    // Default selection tool on blank canvas click → start marquee select.
    setTool('select');
    beginMarquee(p);
    attachPointerTracking();
  };

  /**
   * Pointer-down on a shape. Handles connector creation, multi-select
   * toggling, and initiates move drag.
   */
  const handleShapeDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const p = toWorldPoint(e.clientX, e.clientY);

    if (tool === 'connector') {
      beginConnectorDraft(p, id);
      attachPointerTracking();
      return;
    }

    if (tool !== 'select') {
      return;
    }

    if (e.shiftKey) {
      toggleSelected(id);
    } else if (!selectedIds.has(id)) {
      setSelected([id]);
    }

    beginMove(p);
    attachPointerTracking();
  };

  /**
   * Pointer-down on a FigJam-style connection handle on a shape.
   */
  const handleConnectionPointDown = (
    e: React.PointerEvent,
    shapeId: string,
    point: { x: number; y: number }
  ) => {
    e.stopPropagation();
    beginConnectorDraft(point, shapeId);
    attachPointerTracking();
  };

  /**
   * Pointer-down on a bezier curve control point — drag to curve/bend connector.
   */
  const handleControlPointDown = (e: React.PointerEvent, connectorId: string) => {
    e.stopPropagation();
    const onMove = (ev: PointerEvent) => {
      const p = toWorldPoint(ev.clientX, ev.clientY);
      updateArrowControlPoint(connectorId, p);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  /**
   * Double-click an arrow → prompt for connector label.
   */
  const handleArrowDoubleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelected([id]);
    const current = scene.shapes.find((s) => s.id === id);
    if (current && current.kind === 'arrow') {
      const label = prompt('Connector label:', (current as ArrowShape).label ?? '');
      if (label !== null) {
        setArrowLabel(id, label);
      }
    }
  };

  /**
   * Pointer-down on a resize handle — start a resize drag.
   */
  const handleResizeHandleDown = (handle: ResizeHandle, e: React.PointerEvent) => {
    const p = toWorldPoint(e.clientX, e.clientY);
    beginResize(handle, p);
    attachPointerTracking();
  };

  /**
   * Pointer-down on a connector endpoint handle — re-anchor that endpoint.
   */
  const handleEndpointDown = (
    e: React.PointerEvent,
    connectorId: string,
    end: 'from' | 'to'
  ) => {
    e.stopPropagation();
    const p = toWorldPoint(e.clientX, e.clientY);
    beginReanchorEndpoint(connectorId, end, p);
    attachPointerTracking();
  };

  /**
   * Double-click a shape → begin editing its text inline.
   */
  const handleShapeDoubleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelected([id]);
    setEditing(id);
  };

  /**
   * Wire up window-level pointermove/pointerup so we keep tracking after
   * the pointer leaves the SVG.
   */
  function attachPointerTracking() {
    const onMove = (e: PointerEvent) => {
      const p = toWorldPoint(e.clientX, e.clientY);
      updateDrag(p);
    };
    const onUp = () => {
      endDrag();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Escape cancels in-progress drafts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drag && (drag.kind === 'create' || drag.kind === 'freedraw' || drag.kind === 'line' || drag.kind === 'connector')) {
        cancelDraft();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drag, cancelDraft]);

  const arrowStartShape = pendingArrow
    ? scene.shapes.find((s) => s.id === pendingArrow.fromId)
    : null;

  // First selected shape — drives resize handles.
  const firstSelected: Shape | undefined = (() => {
    if (selectedIds.size !== 1) return undefined;
    const id = [...selectedIds][0];
    const sh = scene.shapes.find((s) => s.id === id);
    if (!sh || isArrow(sh)) return undefined;
    if (sh.kind === 'line' || sh.kind === 'freedraw') return undefined;
    return sh;
  })();

  const className = `canvas-svg tool-${tool}${drag?.kind === 'create' ? ' is-dragging' : ''}${
    tool === 'pan' || spaceDown ? ' is-panning' : ''
  }`;

  const gridStep = 20 * viewport.zoom;

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <svg
        ref={svgRef}
        className={className}
        style={{
          ['--grid-x' as any]: `${viewport.x}px`,
          ['--grid-y' as any]: `${viewport.y}px`,
          ['--grid-step' as any]: `${gridStep}px`,
        }}
        onPointerDown={handleBackgroundDown}
      >
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
          {scene.shapes.map((s) =>
            isArrow(s) ? (
              <Arrow
                key={s.id}
                arrow={s as ArrowShape}
                scene={scene}
                selected={selectedIds.has(s.id)}
                onPointerDown={handleShapeDown}
                onDoubleClick={handleArrowDoubleClick}
                onEndpointDown={handleEndpointDown}
                onControlPointDown={handleControlPointDown}
              />
            ) : (
              <ShapeNode
                key={s.id}
                shape={s}
                selected={selectedIds.has(s.id)}
                onPointerDown={handleShapeDown}
                onDoubleClick={handleShapeDoubleClick}
                onConnectionPointDown={handleConnectionPointDown}
              />
            )
          )}

          {/* Resize handles for a single selected shape */}
          {firstSelected && (
            <ResizeHandles
              x={firstSelected.x}
              y={firstSelected.y}
              width={firstSelected.width}
              height={firstSelected.height}
              size={HANDLE_SIZE}
              onHandleDown={handleResizeHandleDown}
            />
          )}

          {/* Live marquee */}
          {drag?.kind === 'marquee' && (
            <Marquee
              startX={drag.startPointer.x}
              startY={drag.startPointer.y}
              currentX={drag.currentPointer.x}
              currentY={drag.currentPointer.y}
            />
          )}

          {/* Arrow-in-progress indicator (legacy two-step UX, kept as no-op
              fallback — connector UX has moved to drag-to-create). */}
          {arrowStartShape && (
            <circle
              cx={arrowStartShape.x + arrowStartShape.width / 2}
              cy={arrowStartShape.y + arrowStartShape.height / 2}
              r={6}
              fill="hsl(var(--primary))"
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
      <div
        onContextMenu={(e) => e.preventDefault()}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}