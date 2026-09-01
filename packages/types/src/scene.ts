/**
 * Scene model — the in-memory representation of a Puku Canvas.
 * Everything the user sees on the canvas is one of these shapes.
 */

export type ShapeKind =
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'text'
  | 'sticky'
  | 'line'
  | 'arrow'
  | 'freedraw';

export interface Point {
  x: number;
  y: number;
}

export interface BaseShape {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  text?: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  groupId?: string;
  zIndex?: number;
  createdAt?: number;
  updatedAt?: number;
  /** CSS font-family for the shape's text. */
  fontFamily?: string;
  /** Font size in px. */
  fontSize?: number;
  /** 'normal' | 'bold'. */
  fontWeight?: 'normal' | 'bold';
}

export interface ArrowShape extends BaseShape {
  kind: 'arrow';
  /**
   * Anchored start endpoint (shape id). If null/undefined, `fromPoint` is used
   * as a free-floating start.
   */
  fromId?: string | null;
  /**
   * Anchored end endpoint (shape id). If null/undefined, `toPoint` is used
   * as a free-floating end.
   */
  toId?: string | null;
  /** Free start point when `fromId` is null. World coordinates. */
  fromPoint?: Point;
  /** Free end point when `toId` is null. World coordinates. */
  toPoint?: Point;
  /** Optional label rendered at the midpoint. */
  label?: string;
  /**
   * Optional control point(s) for the bezier path. When omitted, the renderer
   * computes a default curved control point from the start/end tangent.
   */
  points?: Point[];
}

export interface LineShape extends BaseShape {
  kind: 'line';
  points: Point[];
}

export interface FreedrawShape extends BaseShape {
  kind: 'freedraw';
  points: Point[];
}

export type Shape = BaseShape | ArrowShape | LineShape | FreedrawShape;

export interface Group {
  id: string;
  name?: string;
  shapeIds: string[];
}

export interface Scene {
  id: string;
  name: string;
  shapes: Shape[];
  groups: Group[];
  /** ISO timestamp */
  updatedAt: string;
}

/**
 * Helpers for narrowing shape types.
 */
export const isArrow = (s: Shape): s is ArrowShape => s.kind === 'arrow';
export const isLine = (s: Shape): s is LineShape => s.kind === 'line';
export const isFreedraw = (s: Shape): s is FreedrawShape => s.kind === 'freedraw';
export const isNode = (s: Shape): s is BaseShape =>
  s.kind === 'rectangle' || s.kind === 'ellipse' || s.kind === 'diamond' ||
  s.kind === 'text' || s.kind === 'sticky';
