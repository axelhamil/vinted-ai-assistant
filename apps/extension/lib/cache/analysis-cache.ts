import { ANALYSIS_FRESH_FOR_MS } from "@packages/analysis/contract";
import Dexie from "dexie";
import type { AnalysisDto } from "@/lib/messaging/protocol";

interface CachedAnalysis {
  vintedId: string;
  analysis: AnalysisDto;
  expiresAt: number;
}

const SCHEMA = { analyses: "vintedId, expiresAt" };

const db = new Dexie("vinted-ai-cache");
db.version(1).stores(SCHEMA);
db.version(2)
  .stores(SCHEMA)
  .upgrade((tx) => tx.table("analyses").clear());

const analyses = db.table<CachedAnalysis, string>("analyses");

export const analysisCache = {
  async get(vintedId: string): Promise<AnalysisDto | null> {
    const cached = await analyses.get(vintedId);
    if (!cached) return null;

    if (cached.expiresAt > Date.now()) return cached.analysis;

    await analyses.delete(vintedId);

    return null;
  },

  async put(analysis: AnalysisDto): Promise<void> {
    await analyses.put({
      vintedId: analysis.vintedId,
      analysis,
      expiresAt: Date.now() + ANALYSIS_FRESH_FOR_MS,
    });
  },

  async remove(vintedId: string): Promise<void> {
    await analyses.delete(vintedId);
  },
};

export type AnalysisCache = typeof analysisCache;
