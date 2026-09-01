import { useEffect, useRef, useState } from 'react';
import type { Point, Shape } from '@puku/types';
import { isLine, isFreedraw } from '@puku/types';
import { useCanvasStore } from '../../store/canvas-store';

interface ShapeNodeProps {
  shape: Shape;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onDoubleClick?: (e: React.MouseEvent, id: string) => void;
  onConnectionPointDown?: (e: React.PointerEvent, id: string, point: Point) => void;
}

export function ShapeNode({
  shape,
  selected,
  onPointerDown,
  onDoubleClick,
  onConnectionPointDown,
}: ShapeNodeProps) {
  const [hovered, setHovered] = useState(false);
  const editingId = useCanvasStore((s) => s.editingId);
  const commitText = useCanvasStore((s) => s.commitText);
  const setEditing = useCanvasStore((s) => s.setEditing);

  const isEditing = editingId === shape.id;

  // Text shapes don't render a visible stroke — fill is the only color that
  // matters. We still pass `transparent` so the geometry doesn't paint a
  // default black outline under any selection-ring logic.
  const isTextOnly = shape.kind === 'text';

  const common = {
    stroke: selected
      ? 'hsl(var(--primary))'
      : isTextOnly
      ? 'transparent'
      : shape.stroke ?? 'hsl(var(--foreground))',
    strokeWidth: selected ? 2 : isTextOnly ? 0 : shape.strokeWidth ?? 1.5,
    fill: shape.fill ?? (shape.kind === 'sticky' ? '#fef08a' : 'hsl(var(--card))'),
    onPointerDown: (e: React.PointerEvent) => onPointerDown(e, shape.id),
    onDoubleClick: (e: React.MouseEvent) => onDoubleClick?.(e, shape.id),
  };

  // Typography for the rendered text (and the inline editor input).
  const fontFamily =
    (shape as any).fontFamily ??
    '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
  const fontSize = (shape as any).fontSize ?? 14;
  const fontWeight = (shape as any).fontWeight ?? 'normal';
  const textStyle = { fontFamily, fontSize, fontWeight };

  let geometry: React.ReactNode = null;

  switch (shape.kind) {
    case 'rectangle':
    case 'sticky':
    case 'text':
      geometry = (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.kind === 'sticky' ? 4 : 6}
          {...common}
        />
      );
      break;
    case 'ellipse':
      geometry = (
        <ellipse
          cx={shape.x + shape.width / 2}
          cy={shape.y + shape.height / 2}
          rx={shape.width / 2}
          ry={shape.height / 2}
          {...common}
        />
      );
      break;
    case 'diamond': {
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      const points = [
        `${cx},${shape.y}`,
        `${shape.x + shape.width},${cy}`,
        `${cx},${shape.y + shape.height}`,
        `${shape.x},${cy}`,
      ].join(' ');
      geometry = <polygon points={points} {...common} />;
      break;
    }
    case 'line': {
      if (!isLine(shape)) return null;
      const a = { x: shape.x + shape.points[0].x, y: shape.y + shape.points[0].y };
      const b = { x: shape.x + shape.points[1].x, y: shape.y + shape.points[1].y };
      const visibleStroke = selected ? 2 : shape.strokeWidth ?? 1.5;
      geometry = (
        <g className="line-shape">
          {/* Invisible thick hit-target */}
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="transparent"
            strokeWidth={20}
            strokeLinecap="round"
            pointerEvents="stroke"
            onPointerDown={common.onPointerDown}
            onDoubleClick={common.onDoubleClick}
          />
          <line
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={common.stroke}
            strokeWidth={visibleStroke}
            strokeLinecap="round"
            pointerEvents="none"
          />
        </g>
      );
      break;
    }
    case 'freedraw': {
      if (!isFreedraw(shape)) return null;
      const d = pointsToPath(shape.points, shape.x, shape.y);
      const visibleStroke = selected ? 2 : shape.strokeWidth ?? 1.5;
      geometry = (
        <g className="freedraw-shape">
          <path
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={20}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="stroke"
            onPointerDown={common.onPointerDown}
            onDoubleClick={common.onDoubleClick}
          />
          <path
            d={d}
            fill="none"
            stroke={common.stroke}
            strokeWidth={visibleStroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        </g>
      );
      break;
    }
    case 'arrow':
      // Arrows are rendered separately by <Arrow /> — they don't go through ShapeNode.
      return null;
    default:
      return null;
  }

  const showText =
    shape.kind !== 'line' &&
    shape.kind !== 'freedraw';

  const connectionPoints = [
    { id: 'top', x: shape.x + shape.width / 2, y: shape.y },
    { id: 'right', x: shape.x + shape.width, y: shape.y + shape.height / 2 },
    { id: 'bottom', x: shape.x + shape.width / 2, y: shape.y + shape.height },
    { id: 'left', x: shape.x, y: shape.y + shape.height / 2 },
  ];

  return (
    <g
      className={`shape-node ${selected ? 'selected' : ''}`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {geometry}
      {showText && isEditing && (
        <foreignObject
          x={shape.x + 2}
          y={shape.y + 2}
          width={Math.max(20, shape.width - 4)}
          height={Math.max(20, shape.height - 4)}
        >
          <TextEditorInput
            initial={shape.text ?? ''}
            onCommit={(text) => commitText(shape.id, text)}
            onCancel={() => setEditing(null)}
            textStyle={textStyle}
          />
        </foreignObject>
      )}
      {showText && !isEditing && shape.text && (
        <text
          x={shape.x + shape.width / 2}
          y={shape.y + shape.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontWeight={fontWeight}
          style={textStyle as any}
        >
          {shape.text}
        </text>
      )}

      {/* FigJam-style 4 Connection Point Handles (top, right, bottom, left) */}
      {(hovered || selected) && showText && !isEditing && (
        <g className="connection-handles">
          {connectionPoints.map((cp) => (
            <circle
              key={cp.id}
              cx={cp.x}
              cy={cp.y}
              r={5}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
              style={{ cursor: 'crosshair' }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onConnectionPointDown?.(e, shape.id, { x: cp.x, y: cp.y });
              }}
            />
          ))}
        </g>
      )}
    </g>
  );
}

function pointsToPath(points: { x: number; y: number }[], ox: number, oy: number): string {
  if (points.length === 0) return '';
  const cmds: string[] = [];
  cmds.push(`M ${ox + points[0].x} ${oy + points[0].y}`);
  for (let i = 1; i < points.length; i++) {
    cmds.push(`L ${ox + points[i].x} ${oy + points[i].y}`);
  }
  return cmds.join(' ');
}

/**
 * Inline text editor — appears inside the shape via foreignObject.
 * Commits on blur or Enter, cancels on Escape.
 */
function TextEditorInput({
  initial,
  onCommit,
  onCancel,
  textStyle,
}: {
  initial: string;
  onCommit: (text: string) => void;
  onCancel: () => void;
  textStyle: { fontFamily: string; fontSize: number; fontWeight: string };
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      defaultValue={initial}
      className="text-editor-input"
      style={textStyle as any}
      onBlur={(e) => onCommit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(e.currentTarget.value);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
    />
  );
}
