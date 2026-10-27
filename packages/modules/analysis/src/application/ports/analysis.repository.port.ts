import type { Option, Result } from "@packages/ddd-kit";
import type { Analysis } from "../../domain/analysis.aggregate";
import type { AnalysisStatus } from "../../domain/value-objects/analysis-status.vo";
import type { VintedId } from "../../domain/value-objects/vinted-id.vo";

export type AnalysisStoreUnavailable = "ANALYSIS_STORE_UNAVAILABLE";
export type AnalysisRecordIntegrityFailed = "ANALYSIS_RECORD_INTEGRITY_FAILED";
export type AnalysisNotFound = "ANALYSIS_NOT_FOUND";

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
  save(analysis: Analysis): Promise<Result<void, AnalysisStoreUnavailable>>;
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
    analysis: Analysis,
  ): Promise<Result<void, AnalysisNotFound | AnalysisStoreUnavailable>>;
  delete(
    vintedId: VintedId,
  ): Promise<Result<void, AnalysisNotFound | AnalysisStoreUnavailable>>;
}
