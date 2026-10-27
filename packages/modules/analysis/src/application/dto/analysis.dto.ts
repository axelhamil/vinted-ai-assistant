import type { Analysis } from "../../domain/analysis.aggregate";

export interface SellerDto {
  username: string;
  rating: number | null;
  salesCount: number | null;
}

export interface ListingDto {
  vintedId: string;
  url: string;
  title: string;
  description: string;
  brand: string | null;
  size: string | null;
  condition: string;
  priceCents: number;
  totalPriceCents: number | null;
  shippingCostCents: number | null;
  listedAt: Date | null;
  photos: string[];
  seller: SellerDto;
  language: string;
}

export interface AnalyzeListingInput {
  listing: ListingDto;
  forceRefresh: boolean;
}

export interface AnalysisLookup {
  vintedId: string;
}

export interface ChangeAnalysisStatusInput {
  vintedId: string;
  status: string;
}

export interface RegenerateNegotiationInput {
  vintedId: string;
  tone: string;
}

export interface PortfolioListInput {
  limit?: number;
  offset?: number;
  minScore?: number;
  status?: string;
}

export interface PortfolioStatsInput {
  minScore?: number;
}

export interface PortfolioListing {
  items: Analysis[];
  total: number;
  hasMore: boolean;
}

export interface MarkdownExport {
  filename: string;
  markdown: string;
}
