import type { AnalysisResult, Scene } from '@puku/types';
import { describeScene, runHeuristics } from '@puku/core';
import { buildPrompt, SYSTEM_PROMPT } from './prompt.js';
import { validateAnalysis, analysisJsonSchema } from './schema.js';

export interface LLMGenerateOptions {
  /** Override the temperature. Defaults to 0.2 for deterministic labels. */
  temperature?: number;
  /** Provider-specific structured-output schema. */
  schema?: unknown;
}

export interface LLMClient {
  generateJson(system: string, user: string, opts?: LLMGenerateOptions): Promise<unknown>;
}

/**
 * Stub client used in dev / when no API key is configured.
 * Produces a heuristic-only AnalysisResult without calling an LLM.
 *
 * Wire up a real provider (OpenAI, Anthropic, etc.) by implementing
 * LLMClient and passing it to analyze().
 */
export const stubLLM: LLMClient = {
  async generateJson(_system, _user) {
    return null;
  },
};

/**
 * Creates an LLMClient instance based on available environment variables.
 * Supports OpenAI (OPENAI_API_KEY) and Gemini (GEMINI_API_KEY).
 * Falls back to stubLLM (heuristics) if no key is present.
 */
export function createLLMClientFromEnv(): LLMClient {
  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (groqKey) {
    return {
      async generateJson(system, user, opts) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: opts?.temperature ?? 0.2,
            response_format: { type: 'json_object' },
          }),
        });
        if (!res.ok) {
          throw new Error(`Groq API error: ${res.status} ${await res.text()}`);
        }
        const data = (await res.json()) as any;
        const content = data.choices?.[0]?.message?.content;
        return content ? JSON.parse(content) : null;
      },
    };
  }

  if (openAiKey) {
    return {
      async generateJson(system, user, opts) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: opts?.temperature ?? 0.2,
            response_format: { type: 'json_object' },
          }),
        });
        if (!res.ok) {
          throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
        }
        const data = (await res.json()) as any;
        const content = data.choices?.[0]?.message?.content;
        return content ? JSON.parse(content) : null;
      },
    };
  }

  if (geminiKey) {
    return {
      async generateJson(system, user, _opts) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ parts: [{ text: user }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });
        if (!res.ok) {
          throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
        }
        const data = (await res.json()) as any;
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return content ? JSON.parse(content) : null;
      },
    };
  }

  return stubLLM;
}


/**
 * Heuristic-only analyzer — useful for local dev and tests.
 * Runs runHeuristics() + describeScene() to produce a best-effort
 * AnalysisResult without requiring an LLM.
 */
export function analyzeWithoutLLM(scene: Scene): AnalysisResult {
  const hint = runHeuristics(scene);
  const relationships = scene.shapes
    .filter((s) => s.kind === 'arrow')
    .map((a) => {
      const arrow = a as Extract<typeof a, { kind: 'arrow' }>;
      const from = scene.shapes.find((s) => s.id === arrow.fromId);
      const to = scene.shapes.find((s) => s.id === arrow.toId);
      return {
        from: from?.text ?? '(unnamed)',
        to: to?.text ?? '(unnamed)',
        relationship: arrow.label ?? 'connects to',
      };
    });

  const nodeTexts = scene.shapes
    .filter((s) => s.kind !== 'arrow' && s.kind !== 'line' && s.kind !== 'freedraw')
    .map((s) => s.text ?? `${s.kind}`)
    .filter(Boolean);

  const chunks: AnalysisResult['chunks'] = [];
  if (nodeTexts.length > 0) {
    chunks.push({
      id: 'components',
      title: 'Components',
      type: 'components',
      summary: 'The primary nodes/components detected on the canvas.',
      items: nodeTexts,
    });
  }
  if (relationships.length > 0) {
    chunks.push({
      id: 'flow',
      title: 'Primary Flow',
      type: 'flow',
      summary: 'The main sequence of interactions inferred from the arrows.',
      items: relationships.map(
        (r) => `${r.from} ${r.relationship} ${r.to}`
      ),
    });
  }

  const domainLabel = hint.domain ?? 'Unknown';
  const typeLabel = hint.canvasType ?? 'Other';

  const summary = describeScene(scene).trim();

  return validateAnalysis({
    title: `${domainLabel} ${typeLabel}`,
    canvasType: { label: typeLabel, confidence: hint.confidence },
    domain: { label: domainLabel, confidence: hint.confidence },
    concept: {
      label: `${domainLabel} ${typeLabel}`,
      confidence: hint.confidence,
    },
    overallSummary:
      summary ||
      'The canvas is empty or could not be parsed. Try drawing a few connected shapes.',
    chunks,
    keyEntities: nodeTexts,
    relationships,
    uncertainties:
      hint.domain == null
        ? ['Could not confidently detect the domain — falling back to heuristics.']
        : [],
  });
}

/**
 * Full analyzer. By default uses the stub LLM (heuristic-only).
 * Pass a real LLMClient to enable LLM-powered analysis.
 */
export async function analyze(
  scene: Scene,
  client: LLMClient = stubLLM
): Promise<AnalysisResult> {
  // Empty canvas short-circuit.
  if (scene.shapes.length === 0) {
    return validateAnalysis({
      title: 'Empty Canvas',
      overallSummary: 'No shapes have been drawn yet.',
      uncertainties: ['Canvas is empty.'],
    });
  }

  const userPrompt = buildPrompt(scene);
  const started = Date.now();

  try {
    const raw = await client.generateJson(SYSTEM_PROMPT, userPrompt, {
      temperature: 0.2,
      schema: analysisJsonSchema,
    });

    if (raw == null) {
      // Stub mode — fall back to heuristics.
      return analyzeWithoutLLM(scene);
    }
    return validateAnalysis(raw);
  } catch (err) {
    // LLM failure — degrade gracefully to heuristics.
    const fallback = analyzeWithoutLLM(scene);
    fallback.uncertainties.push(
      `LLM call failed: ${(err as Error).message}. Showing heuristic-only result.`
    );
    return fallback;
  } finally {
    void started;
  }
}
