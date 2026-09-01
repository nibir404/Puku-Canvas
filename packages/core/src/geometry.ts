import type { Point, Shape } from '@puku/types';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Center of a shape's bounding box. */
export function center(s: Shape): Point {
  return { x: s.x + s.width / 2, y: s.y + s.height / 2 };
}

/** Euclidean distance between two points. */
export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Bounding box of all shapes. */
export function sceneBounds(shapes: Shape[]): {
  minX: number; minY: number; maxX: number; maxY: number;
} | null {
  if (shapes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of shapes) {
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x + s.width > maxX) maxX = s.x + s.width;
    if (s.y + s.height > maxY) maxY = s.y + s.height;
  }
  return { minX, minY, maxX, maxY };
}

/** Normalize a rect so width/height are positive. */
export function normalizeRect(r: Rect): Rect {
  const x = Math.min(r.x, r.x + r.width);
  const y = Math.min(r.y, r.y + r.height);
  return { x, y, width: Math.abs(r.width), height: Math.abs(r.height) };
}

/** Is a point inside a rect (inclusive)? */
export function pointInRect(p: Point, r: Rect): boolean {
  const n = normalizeRect(r);
  return p.x >= n.x && p.x <= n.x + n.width && p.y >= n.y && p.y <= n.y + n.height;
}

/** Is a point inside an ellipse inscribed in a bounding rect? */
export function pointInEllipse(p: Point, r: Rect): boolean {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  if (r.width <= 0 || r.height <= 0) return false;
  const dx = (p.x - cx) / (r.width / 2);
  const dy = (p.y - cy) / (r.height / 2);
  return dx * dx + dy * dy <= 1;
}

/** Do two rects overlap (aabb test)? */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  const na = normalizeRect(a);
  const nb = normalizeRect(b);
  return !(
    na.x + na.width < nb.x ||
    nb.x + nb.width < na.x ||
    na.y + na.height < nb.y ||
    nb.y + nb.height < na.y
  );
}

/**
 * Where a ray from shape center toward target (px, py) intersects the rectangle boundary.
 */
export function intersectRectBounds(
  bounds: { x: number; y: number; width: number; height: number },
  px: number,
  py: number
): Point {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const w2 = bounds.width / 2;
  const h2 = bounds.height / 2;
  const scaleX = dx !== 0 ? Math.abs(w2 / dx) : Infinity;
  const scaleY = dy !== 0 ? Math.abs(h2 / dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/**
 * Where a ray from shape center toward target (px, py) intersects the diamond boundary.
 */
export function intersectDiamondBounds(
  bounds: { x: number; y: number; width: number; height: number },
  px: number,
  py: number
): Point {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const w2 = bounds.width / 2;
  const h2 = bounds.height / 2;
  const t = 1 / (Math.abs(dx) / w2 + Math.abs(dy) / h2);
  return { x: cx + dx * t, y: cy + dy * t };
}

/**
 * Where a ray from `from` toward `to` enters the ellipse inscribed in `bounds`.
 * Used to trim arrow endpoints to a shape's edge.
 */
export function intersectEllipseBounds(
  bounds: { x: number; y: number; width: number; height: number },
  px: number,
  py: number
): Point {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = px - cx;
  const dy = py - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const rx = bounds.width / 2;
  const ry = bounds.height / 2;
  const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
  return { x: cx + dx * t, y: cy + dy * t };
}

/**
 * Trim a ray from `shape` center toward target point (px, py) to the shape's outer boundary edge.
 */
export function getShapeIntersection(shape: Shape, target: Point): Point {
  const bbox = {
    x: shape.x,
    y: shape.y,
    width: Math.max(1, shape.width),
    height: Math.max(1, shape.height),
  };
  switch (shape.kind) {
    case 'ellipse':
      return intersectEllipseBounds(bbox, target.x, target.y);
    case 'diamond':
      return intersectDiamondBounds(bbox, target.x, target.y);
    case 'rectangle':
    case 'sticky':
    case 'text':
    default:
      return intersectRectBounds(bbox, target.x, target.y);
  }
}

/**
 * Distance from a point to a line segment (p1 → p2).
 * Useful for hit-testing arrows / lines.
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Clamp a value into [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
