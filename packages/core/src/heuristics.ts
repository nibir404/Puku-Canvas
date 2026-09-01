import type { Scene, ArrowShape } from '@puku/types';
import { isArrow, isNode } from '@puku/types';

/**
 * Keyword → domain hints. If a scene contains >= 2 keywords from a domain,
 * we treat that as a strong hint and feed it into the LLM prompt.
 */
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  'Ride Sharing / Transportation': [
    'passenger', 'driver', 'ride', 'trip', 'fare', 'matching',
    'pickup', 'dropoff', 'uber', 'lyft', 'taxi',
  ],
  'FinTech / Payments': [
    'payment', 'wallet', 'transaction', 'kyc', 'ledger',
    'bank', 'card', 'invoice', 'settlement',
  ],
  'E-commerce / Marketplace': [
    'cart', 'checkout', 'order', 'inventory', 'product',
    'catalog', 'merchant', 'shipping',
  ],
  'Healthcare': [
    'patient', 'doctor', 'appointment', 'prescription', 'clinic',
    'hospital', 'diagnosis', 'ehr',
  ],
  'EdTech': [
    'student', 'teacher', 'course', 'lesson', 'enrollment',
    'curriculum', 'lms', 'quiz',
  ],
  'SaaS / Enterprise': [
    'tenant', 'workspace', 'subscription', 'billing', 'org',
    'team', 'permission', 'role',
  ],
  'Social Platform': [
    'post', 'feed', 'follow', 'like', 'comment', 'profile',
    'friend', 'timeline',
  ],
  'Logistics': [
    'shipment', 'warehouse', 'delivery', 'route', 'fleet',
    'carrier', 'dispatch',
  ],
  'Real Estate': [
    'listing', 'property', 'tenant', 'lease', 'agent',
    'mortgage', 'viewing',
  ],
  'Gaming': [
    'player', 'match', 'lobby', 'score', 'level',
    'inventory', 'guild',
  ],
};

export interface HeuristicGuess {
  domain: string | null;
  canvasType: string | null;
  confidence: number;
  matchedKeywords: string[];
}

function sceneText(scene: Scene): string {
  return scene.shapes
    .map((s) => (s.text ?? '').toLowerCase())
    .filter(Boolean)
    .join(' ');
}

/** Guess the domain from keywords in shape text. */
export function guessDomain(scene: Scene): string | null {
  const text = sceneText(scene);
  if (!text) return null;

  let best: { domain: string; hits: string[] } | null = null;
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const hits = keywords.filter((k) => text.includes(k));
    if (hits.length >= 2 && (!best || hits.length > best.hits.length)) {
      best = { domain, hits };
    }
  }
  return best?.domain ?? null;
}

/**
 * Guess the canvas type by counting arrows vs nodes.
 * - Mostly nodes, few arrows → Mind Map / Architecture
 * - Many arrows forming chains → Flow / Sequence
 * - Arrows mostly label "data" or "request" → Data Flow / Architecture
 */
export function guessCanvasType(scene: Scene): string | null {
  const arrows = scene.shapes.filter(isArrow);
  const nodes = scene.shapes.filter(isNode);

  if (nodes.length === 0) return null;

  const ratio = arrows.length / Math.max(nodes.length, 1);

  if (ratio < 0.3) return 'Mind Map';
  if (ratio < 0.7) return 'System Architecture';
  if (ratio < 1.2) return 'Process Flow';
  return 'Data Flow Diagram';
}

/** Build the full heuristic guess in one call. */
export function runHeuristics(scene: Scene): HeuristicGuess {
  const text = sceneText(scene);
  const matched: string[] = [];

  let domain: string | null = null;
  let domainHits = 0;
  for (const [d, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    const hits = kws.filter((k) => text.includes(k));
    if (hits.length > domainHits) {
      domain = d;
      domainHits = hits.length;
      matched.length = 0;
      matched.push(...hits);
    }
  }

  return {
    domain,
    canvasType: guessCanvasType(scene),
    confidence: Math.min(0.9, 0.3 + domainHits * 0.15),
    matchedKeywords: matched,
  };
}

/** Convenience: extract named relationships from arrow labels. */
export function extractRelationships(scene: Scene): Array<{
  from: string; to: string; relationship: string;
}> {
  const out: Array<{ from: string; to: string; relationship: string }> = [];
  const arrows: ArrowShape[] = scene.shapes.filter(isArrow);

  for (const a of arrows) {
    const from = scene.shapes.find((s) => s.id === a.fromId);
    const to = scene.shapes.find((s) => s.id === a.toId);
    if (!from || !to) continue;
    out.push({
      from: from.text ?? '(unnamed)',
      to: to.text ?? '(unnamed)',
      relationship: a.label ?? 'connects to',
    });
  }
  return out;
}
