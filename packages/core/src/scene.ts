import type { Scene, Shape, ArrowShape } from '@puku/types';
import { isArrow } from '@puku/types';

/** Build an empty scene. */
export function createEmptyScene(name = 'Untitled canvas'): Scene {
  return {
    id: cryptoRandomId(),
    name,
    shapes: [],
    groups: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Generate a short, URL-safe id. */
export function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Find a shape by id (O(n) — fine for canvas-scale scenes). */
export function findShape(scene: Scene, id: string): Shape | undefined {
  return scene.shapes.find((s) => s.id === id);
}

/** All arrow connections as triples. */
export function getArrows(scene: Scene): ArrowShape[] {
  return scene.shapes.filter(isArrow);
}

/** A quick textual description of the scene, for the AI prompt. */
export function describeScene(scene: Scene): string {
  const lines: string[] = [];
  lines.push(`# Scene: ${scene.name}`);
  lines.push('');
  lines.push(`## Nodes (${scene.shapes.length} total)`);
  for (const s of scene.shapes) {
    if (isArrow(s)) continue;
    lines.push(`- [${s.kind}] "${s.text ?? '(no text)'}" @ (${Math.round(s.x)}, ${Math.round(s.y)})`);
  }

  const arrows = getArrows(scene);
  lines.push('');
  lines.push(`## Connections (${arrows.length} total)`);
  for (const a of arrows) {
    const from = a.fromId ? findShape(scene, a.fromId) : undefined;
    const to = a.toId ? findShape(scene, a.toId) : undefined;
    const fromLabel =
      from?.text ??
      (a.fromId ? `(${a.fromId.slice(0, 4)})` : '(free)');
    const toLabel =
      to?.text ??
      (a.toId ? `(${a.toId.slice(0, 4)})` : '(free)');
    const label = a.label ? ` (${a.label})` : '';
    lines.push(`- ${fromLabel} → ${toLabel}${label}`);
  }

  if (scene.groups.length > 0) {
    lines.push('');
    lines.push(`## Groups (${scene.groups.length})`);
    for (const g of scene.groups) {
      lines.push(`- ${g.name ?? g.id}: ${g.shapeIds.length} shapes`);
    }
  }

  return lines.join('\n');
}
