import type { ResizeHandle } from '../../store/canvas-store';

interface ResizeHandlesProps {
  /** Bounding box of the selected shape in canvas (world) coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  size: number;
  /** Called when a handle is grabbed. */
  onHandleDown: (handle: ResizeHandle, e: React.PointerEvent) => void;
}

const HANDLES: { id: ResizeHandle; cx: 0 | 0.5 | 1; cy: 0 | 0.5 | 1 }[] = [
  { id: 'nw', cx: 0, cy: 0 },
  { id: 'n', cx: 0.5, cy: 0 },
  { id: 'ne', cx: 1, cy: 0 },
  { id: 'w', cx: 0, cy: 0.5 },
  { id: 'e', cx: 1, cy: 0.5 },
  { id: 'sw', cx: 0, cy: 1 },
  { id: 's', cx: 0.5, cy: 1 },
  { id: 'se', cx: 1, cy: 1 },
];

/**
 * Renders 8 resize handles on the bounding box of a single selected shape.
 * Multi-select resize would need a different shape — for now this assumes
 * a single-shape selection.
 */
export function ResizeHandles({ x, y, width, height, size, onHandleDown }: ResizeHandlesProps) {
  const r = size / 2;
  return (
    <g className="resize-handles" pointerEvents="all">
      {HANDLES.map((h) => {
        const cx = x + width * h.cx;
        const cy = y + height * h.cy;
        return (
          <rect
            key={h.id}
            className={`resize-handle handle-${h.id}`}
            x={cx - r}
            y={cy - r}
            width={size}
            height={size}
            onPointerDown={(e) => {
              e.stopPropagation();
              onHandleDown(h.id, e);
            }}
          />
        );
      })}
    </g>
  );
}
