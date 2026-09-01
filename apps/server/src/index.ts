import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import type { AnalyzeRequest, AnalyzeResponse } from '@puku/types';
import { describeScene, runHeuristics } from '@puku/core';
import { analyze, buildPrompt, createLLMClientFromEnv, SYSTEM_PROMPT } from '@puku/ai';

const app = new Hono();

app.use('*', cors());

const llmClient = createLLMClientFromEnv();

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }));

app.post('/api/analyze', async (c) => {
  let body: AnalyzeRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body?.scene || !Array.isArray(body.scene.shapes)) {
    return c.json({ error: 'Missing "scene" with "shapes" array' }, 400);
  }

  const started = Date.now();

  const result = await analyze(body.scene, llmClient);
  const prompt = buildPrompt(body.scene);

  const response: AnalyzeResponse = {
    result,
    prompt,
    latencyMs: Date.now() - started,
  };
  return c.json(response);
});

app.get('/api/preview', (c) => {
  // Diagnostic — returns the prompt that *would* be sent, without calling the LLM.
  const url = new URL(c.req.url);
  const sceneParam = url.searchParams.get('scene');
  if (!sceneParam) return c.text('Missing ?scene=...', 400);
  try {
    const scene = JSON.parse(sceneParam);
    const hint = runHeuristics(scene);
    return c.json({
      summary: describeScene(scene),
      heuristics: hint,
      prompt: buildPrompt(scene),
      systemPrompt: SYSTEM_PROMPT,
    });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400);
  }
});

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[puku-server] listening on http://localhost:${info.port}`);
});
