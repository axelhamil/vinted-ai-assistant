import type { Option, Result } from "@packages/ddd-kit";
import type { Analysis, Negotiation } from "../../domain/analysis.aggregate";
import type { AnalysisId } from "../../domain/analysis-id";
import type { AnalysisStatus } from "../../domain/value-objects/analysis-status.vo";
import type { VintedId } from "../../domain/value-objects/vinted-id.vo";

export type AnalysisStoreUnavailable = "ANALYSIS_STORE_UNAVAILABLE";
export type AnalysisRecordIntegrityFailed = "ANALYSIS_RECORD_INTEGRITY_FAILED";
export type AnalysisNotFound = "ANALYSIS_NOT_FOUND";
export type AnalysisStatusConflict = "ANALYSIS_STATUS_CONFLICT";

export interface SavedAnalysis {
  id: AnalysisId;
  status: AnalysisStatus;
  createdAt: Date;
}

export interface PortfolioQuery {
  limit: number;
  offset: number;
  minScore: Option<number>;
  status: Option<AnalysisStatus>;
}

export interface PortfolioPage {
  items: Analysis[];
  total: number;
}

export interface PortfolioStats {
  watching: number;
  bought: number;
  sold: number;
  opportunities: number;
}

export interface IAnalysisRepository {
  save(
    analysis: Analysis,
  ): Promise<
    Result<
      SavedAnalysis,
      AnalysisRecordIntegrityFailed | AnalysisStoreUnavailable
    >
  >;
  findByVintedId(
    vintedId: VintedId,
  ): Promise<
    Result<
      Option<Analysis>,
      AnalysisRecordIntegrityFailed | AnalysisStoreUnavailable
    >
  >;
  list(
    query: PortfolioQuery,
  ): Promise<Result<PortfolioPage, AnalysisStoreUnavailable>>;
  stats(
    minScore: number,
  ): Promise<Result<PortfolioStats, AnalysisStoreUnavailable>>;
  updateStatus(
    id: AnalysisId,
    from: AnalysisStatus,
    to: AnalysisStatus,
  ): Promise<Result<void, AnalysisStatusConflict | AnalysisStoreUnavailable>>;
  updateNegotiation(
    id: AnalysisId,
    expectedAnalyzedAt: Date,
    negotiation: Negotiation,
  ): Promise<Result<void, AnalysisStatusConflict | AnalysisStoreUnavailable>>;
  delete(
    id: AnalysisId,
  ): Promise<Result<void, AnalysisNotFound | AnalysisStoreUnavailable>>;
  deleteByVintedId(
    vintedId: VintedId,
  ): Promise<Result<void, AnalysisNotFound | AnalysisStoreUnavailable>>;
}
