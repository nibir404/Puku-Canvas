/**
 * The structured output produced by the AI analyzer.
 * This is the contract between the backend (LLM call) and the frontend (AIPanel).
 */

export interface ConfidenceScore {
  label: string;
  confidence: number; // 0..1
}

export interface ChunkItem {
  id: string;
  title: string;
  /** e.g. "actors" | "components" | "flow" | "architecture" */
  type: string;
  summary: string;
  items: string[];
}

export interface Relationship {
  from: string;
  to: string;
  relationship: string;
}

export interface AnalysisResult {
  title: string;
  canvasType: ConfidenceScore;
  domain: ConfidenceScore;
  concept: ConfidenceScore;
  overallSummary: string;
  chunks: ChunkItem[];
  keyEntities: string[];
  relationships: Relationship[];
  uncertainties: string[];
}

export interface AnalyzeRequest {
  scene: import('./scene').Scene;
}

export interface AnalyzeResponse {
  result: AnalysisResult;
  /** Raw prompt sent to the LLM (for debugging / replay). */
  prompt?: string;
  /** ms */
  latencyMs?: number;
}
