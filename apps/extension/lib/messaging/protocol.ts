import { defineExtensionMessaging } from "@webext-core/messaging";
import type { InferRequestType, InferResponseType } from "hono/client";
import type { ApiClient } from "@/lib/api/client";
import type { Reply } from "@/lib/api/failure";

type Analyses = ApiClient["api"]["analyses"];
type Portfolio = ApiClient["api"]["portfolio"];
type Studio = ApiClient["api"]["studio"];

export type AnalyzeInput = InferRequestType<Analyses["$post"]>["json"];
export type AnalysisDto = InferResponseType<Analyses["$post"], 201>;
export type AnalysisStatus = AnalysisDto["status"];
export type NegotiationTone = AnalysisDto["negotiation"]["tone"];
export type PortfolioQuery = InferRequestType<Portfolio["$get"]>["query"];
export type PortfolioDto = InferResponseType<Portfolio["$get"], 200>;
export type PortfolioStatsDto = InferResponseType<
  Portfolio["stats"]["$get"],
  200
>;
export type PresetsDto = InferResponseType<Studio["presets"]["$get"], 200>;
export type EditInput = InferRequestType<Studio["edits"]["$post"]>["json"];
export type EditedPhotoDto = InferResponseType<Studio["edits"]["$post"], 200>;
export type SuggestInput = InferRequestType<
  Studio["listing-suggestions"]["$post"]
>["json"];
export type ListingSuggestionDto = InferResponseType<
  Studio["listing-suggestions"]["$post"],
  200
>;

export interface AnalysisExport {
  filename: string;
  markdown: string;
}

export interface ProtocolMap {
  analyze(input: AnalyzeInput): Reply<AnalysisDto>;
  getAnalysis(vintedId: string): Reply<AnalysisDto>;
  changeStatus(input: {
    vintedId: string;
    status: AnalysisStatus;
  }): Reply<AnalysisDto>;
  regenerateNegotiation(input: {
    vintedId: string;
    tone: NegotiationTone;
  }): Reply<AnalysisDto>;
  deleteAnalysis(vintedId: string): Reply<null>;
  exportAnalysis(vintedId: string): Reply<AnalysisExport>;
  listPortfolio(query: PortfolioQuery): Reply<PortfolioDto>;
  portfolioStats(minScore?: number): Reply<PortfolioStatsDto>;
  listPresets(): Reply<PresetsDto>;
  editPhoto(input: EditInput): Reply<EditedPhotoDto>;
  suggestListing(input: SuggestInput): Reply<ListingSuggestionDto>;
  checkBackend(): Reply<null>;
}

export const { sendMessage, onMessage } =
  defineExtensionMessaging<ProtocolMap>();
