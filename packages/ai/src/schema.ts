import type { AnalysisResult } from '@puku/types';

/**
 * JSON schema describing the structured output the LLM must produce.
 * Pass this to your LLM provider's structured-output / JSON-mode endpoint.
 */
export const analysisJsonSchema = {
  type: 'object',
  required: [
    'title',
    'canvasType',
    'domain',
    'concept',
    'overallSummary',
    'chunks',
    'keyEntities',
    'relationships',
    'uncertainties',
  ],
  additionalProperties: false,
  properties: {
    title: { type: 'string', description: 'A concise descriptive title for the canvas.' },
    canvasType: {
      type: 'object',
      required: ['label', 'confidence'],
      additionalProperties: false,
      properties: {
        label: {
          type: 'string',
          enum: [
            'System Architecture',
            'User Flow',
            'User Journey',
            'Process Flow',
            'Product Flow',
            'Mind Map',
            'Business Model',
            'Service Blueprint',
            'Data Flow Diagram',
            'Workflow Diagram',
            'Feature Architecture',
            'Organization Structure',
            'Technical Architecture',
            'Other',
          ],
        },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    domain: {
      type: 'object',
      required: ['label', 'confidence'],
      additionalProperties: false,
      properties: {
        label: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    concept: {
      type: 'object',
      required: ['label', 'confidence'],
      additionalProperties: false,
      properties: {
        label: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    overallSummary: { type: 'string' },
    chunks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'type', 'summary', 'items'],
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          type: { type: 'string' },
          summary: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    keyEntities: { type: 'array', items: { type: 'string' } },
    relationships: {
      type: 'array',
      items: {
        type: 'object',
        required: ['from', 'to', 'relationship'],
        additionalProperties: false,
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          relationship: { type: 'string' },
        },
      },
    },
    uncertainties: { type: 'array', items: { type: 'string' } },
  },
} as const;

/** Runtime validator — drops unknown fields, fills in safe defaults. */
export function validateAnalysis(raw: unknown): AnalysisResult {
  const r = (raw ?? {}) as Partial<AnalysisResult>;
  return {
    title: r.title ?? 'Untitled Canvas',
    canvasType: {
      label: r.canvasType?.label ?? 'Other',
      confidence: clamp01(r.canvasType?.confidence ?? 0),
    },
    domain: {
      label: r.domain?.label ?? 'Unknown',
      confidence: clamp01(r.domain?.confidence ?? 0),
    },
    concept: {
      label: r.concept?.label ?? 'Unknown',
      confidence: clamp01(r.concept?.confidence ?? 0),
    },
    overallSummary: r.overallSummary ?? '',
    chunks: Array.isArray(r.chunks)
      ? r.chunks.map((c, i) => ({
          id: c.id ?? `chunk-${i}`,
          title: c.title ?? 'Chunk',
          type: c.type ?? 'general',
          summary: c.summary ?? '',
          items: Array.isArray(c.items) ? c.items : [],
        }))
      : [],
    keyEntities: Array.isArray(r.keyEntities) ? r.keyEntities : [],
    relationships: Array.isArray(r.relationships)
      ? r.relationships.map((rel) => ({
          from: rel.from ?? '?',
          to: rel.to ?? '?',
          relationship: rel.relationship ?? 'connects to',
        }))
      : [],
    uncertainties: Array.isArray(r.uncertainties) ? r.uncertainties : [],
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
