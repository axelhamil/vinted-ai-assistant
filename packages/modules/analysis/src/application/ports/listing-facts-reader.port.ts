import type { Result } from "@packages/ddd-kit";
import type { GroundingSource } from "../../domain/analysis.aggregate";
import type { Listing } from "../../domain/listing";
import type { ListingFacts } from "../../domain/listing-facts";

export type AnalysisAiFailure =
  | "ANALYSIS_AI_RATE_LIMITED"
  | "ANALYSIS_AI_UNAVAILABLE"
  | "ANALYSIS_AI_TIMEOUT"
  | "ANALYSIS_AI_PROVIDER_FAILURE";

export type AnalysisPhotoFailure =
  | "ANALYSIS_PHOTO_INVALID"
  | "ANALYSIS_PHOTO_PROVIDER_FAILURE";

export interface ListingFactsReading {
  facts: ListingFacts;
  groundingSources: GroundingSource[];
}

export interface IListingFactsReader {
  read(
    listing: Listing,
  ): Promise<
    Result<ListingFactsReading, AnalysisAiFailure | AnalysisPhotoFailure>
  >;
}
