import type { LanguageCode } from "@packages/ai/languages";
import type { Option, Result } from "@packages/ddd-kit";
import type { ListingSuggestionFacts } from "../../domain/listing-suggestion";
import type { StudioAiCode } from "../../errors";

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ListingSuggestionRequest {
  photos: string[];
  language: LanguageCode;
  existingTitle: Option<string>;
}

export interface SuggesterReading {
  facts: ListingSuggestionFacts;
  groundingSources: GroundingSource[];
}

export interface IListingSuggester {
  suggest(
    request: ListingSuggestionRequest,
  ): Promise<Result<SuggesterReading, StudioAiCode>>;
}
