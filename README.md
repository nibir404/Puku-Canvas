# Puku Canvas

An infinite, AI-aware canvas for diagramming — like Excalidraw, with a built-in analyst that summarizes what you draw.

## Structure

```
puku-canvas/
├── apps/
│   ├── web/         # React + Vite frontend (the canvas UI)
│   └── server/      # Node + Hono backend (AI analyze endpoint)
├── packages/
│   ├── types/       # Shared TypeScript types (Scene, Shape, AnalysisResult)
│   ├── core/        # Scene engine: geometry, serialization, heuristics
│   └── ai/          # Prompt builder + LLM client + analysis schema
└── turbo.json
```

## Quick Start

```bash
pnpm install
pnpm dev          # runs web + server in parallel
```

- Web: http://localhost:5173
- Server: http://localhost:3001

## Architecture

```
User draws on canvas
        ↓
Scene serialized to JSON
        ↓
POST /api/analyze (apps/server)
        ↓
packages/ai builds prompt + calls LLM
        ↓
Heuristic pre-filter boosts confidence
        ↓
Structured AnalysisResult returned to UI
        ↓
AIPanel renders chunks, entities, relationships
```

## Tasks

- `pnpm dev` — run all apps in dev mode
- `pnpm build` — build all packages
- `pnpm typecheck` — type-check everything
- `pnpm lint` — lint everything
