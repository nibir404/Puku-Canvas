import type { ArrowShape, Point, Scene } from '@puku/types';
import {
  resolveArrowStart,
  resolveArrowEnd,
  bezierControlPoint,
  useCanvasStore,
} from '../../store/canvas-store';

interface ArrowProps {
  arrow: ArrowShape;
  scene: Scene;
  selected: boolean;
  /** Hit handler called when the connector body is clicked. */
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  /** Double click handler for connector label editing. */
  onDoubleClick?: (e: React.MouseEvent, id: string) => void;
  /** Hit handler for the from/to endpoint handles (re-anchoring). */
  onEndpointDown?: (
    e: React.PointerEvent,
    connectorId: string,
    end: 'from' | 'to'
  ) => void;
  /** Hit handler for the bezier curve control handle. */
  onControlPointDown?: (
    e: React.PointerEvent,
    connectorId: string
  ) => void;
}

export function Arrow({
  arrow,
  scene,
  selected,
  onPointerDown,
  onDoubleClick,
  onEndpointDown,
  onControlPointDown,
}: ArrowProps) {
  // Subscribe to the drag state so we re-render on every pointermove while
  // this connector is the active draft.
  const drag = useCanvasStore((s) => s.drag);
  const start = resolveArrowStart(arrow, scene.shapes);

  const freeEnd: Point | null =
    !arrow.toId && !arrow.toPoint &&
    drag &&
    drag.kind === 'connector' &&
    drag.draftId === arrow.id
      ? drag.currentPointer
      : null;
  const end = resolveArrowEnd(arrow, scene.shapes) ?? freeEnd;
  if (!start || !end) return null;

  const ctrl = bezierControlPoint(start, end, arrow.points?.[0]);

  // Build the quadratic bezier path string.
  const path = `M ${start.x} ${start.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;

  // Tangent at t=1 for the arrowhead (derivative of the bezier at endpoint).
  const tangent = { x: end.x - ctrl.x, y: end.y - ctrl.y };
  const angle = Math.atan2(tangent.y, tangent.x);
  const headLen = 10;
  const headAngle = Math.PI / 6;
  const hx1 = end.x - headLen * Math.cos(angle - headAngle);
  const hy1 = end.y - headLen * Math.sin(angle - headAngle);
  const hx2 = end.x - headLen * Math.cos(angle + headAngle);
  const hy2 = end.y - headLen * Math.sin(angle + headAngle);

  const stroke = selected ? 'hsl(var(--primary))' : arrow.stroke ?? 'hsl(var(--foreground))';

  // Midpoint of the curve for label rendering.
  const mid = bezier(0.5, start, ctrl, end);

  return (
    <g className={`connector ${selected ? 'selected' : ''}`}>
      {/* Invisible thick hit-target so the user can grab the curve anywhere */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        strokeLinecap="round"
        pointerEvents="stroke"
        onPointerDown={(e) => onPointerDown?.(e, arrow.id)}
        onDoubleClick={(e) => onDoubleClick?.(e, arrow.id)}
      />
      {/* Visible curve. */}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={selected ? 2 : 1.5}
        strokeLinecap="round"
        pointerEvents="none"
      />
      {/* Arrowhead. */}
      <path
        d={`M ${end.x} ${end.y} L ${hx1} ${hy1} M ${end.x} ${end.y} L ${hx2} ${hy2}`}
        stroke={stroke}
        strokeWidth={selected ? 2 : 1.5}
        fill="none"
        strokeLinecap="round"
        pointerEvents="none"
      />
      {arrow.label && (
        <text
          x={mid.x}
          y={mid.y - 4}
          textAnchor="middle"
          pointerEvents="none"
          className="select-none font-sans text-xs fill-foreground"
        >
          {arrow.label}
        </text>
      )}
      {/* Selection handles (Endpoints & Bezier Control Handle) */}
      {selected && (
        <>
          {/* Dashed guide lines to control point */}
          <path
            d={`M ${start.x} ${start.y} L ${ctrl.x} ${ctrl.y} L ${end.x} ${end.y}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.4}
            pointerEvents="none"
          />

          {/* Bezier control handle (midpoint curve adjustment) */}
          <circle
            className="connector-ctrl-handle"
            cx={ctrl.x}
            cy={ctrl.y}
            r={5}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--background))"
            strokeWidth={2}
            style={{ cursor: 'move' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onControlPointDown?.(e, arrow.id);
            }}
          />

          {onEndpointDown && (
            <>
              <circle
                className="connector-endpoint"
                cx={start.x}
                cy={start.y}
                r={6}
                fill="hsl(var(--background))"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                onPointerDown={(e) => onEndpointDown(e, arrow.id, 'from')}
              />
              <circle
                className="connector-endpoint"
                cx={end.x}
                cy={end.y}
                r={6}
                fill="hsl(var(--background))"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                onPointerDown={(e) => onEndpointDown(e, arrow.id, 'to')}
              />
            </>
          )}
        </>
      )}
    </g>
  );
}

function bezier(t: number, a: Point, c: Point, b: Point): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  };
}