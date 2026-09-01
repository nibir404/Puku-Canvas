import type { Scene } from '@puku/types';
import { describeScene, runHeuristics } from '@puku/core';

const SYSTEM_PROMPT = `You are Puku AI, an expert diagram interpreter.
You analyze a canvas (nodes + labeled arrows) and return a structured JSON summary.

Rules:
- Identify the canvas TYPE (System Architecture, User Flow, Process Flow, etc.).
- Identify the DOMAIN (Healthcare, FinTech, Ride Sharing, ...).
- Infer the OVERALL CONCEPT (e.g. "Ride-Sharing Platform System Architecture").
- Break the canvas into meaningful CHUNKS (actors, components, flows, ...).
- List KEY ENTITIES (the major nodes/components).
- List RELATIONSHIPS as triples: from, to, relationship.
- List UNCERTAINTIES — anything you had to guess.
- If the canvas is empty or unreadable, say so explicitly.
- Confidence must be in [0, 1]. Be honest — do not inflate confidence.
- Do not invent nodes or arrows that are not in the input.
- Do not include any prose outside the JSON. Return JSON only.`;

/**
 * Build the user-message prompt for the LLM.
 * Combines the structured scene description with heuristic hints.
 */
export function buildPrompt(scene: Scene): string {
  const hint = runHeuristics(scene);
  const description = describeScene(scene);

  const hintBlock = [
    '## Heuristic Hints',
    `domain_hint: ${hint.domain ?? 'none'}`,
    `canvas_type_hint: ${hint.canvasType ?? 'none'}`,
    `matched_keywords: ${hint.matchedKeywords.join(', ') || 'none'}`,
    `heuristic_confidence: ${hint.confidence.toFixed(2)}`,
  ].join('\n');

  return `${hintBlock}\n\n## Canvas Description\n${description}\n\nReturn a single JSON object matching the required schema.`;
}

export { SYSTEM_PROMPT };
