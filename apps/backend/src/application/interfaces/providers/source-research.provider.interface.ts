/**
 * Platform identifiers for market research
 */
export type Platform = 'vinted' | 'vestiaire' | 'ebay' | 'leboncoin' | 'google_shopping'

/**
 * Image analysis result from AI
 */
export interface ImageAnalysisResult {
	/** Detected brand from photos */
	brand: string | null
	/** Detected model/product name */
	model: string | null
	/** Category (sneakers, bag, jacket, etc.) */
	category: string
	/** Primary colors detected */
	colors: string[]
	/** Materials detected */
	materials: string[]
	/** Patterns (solid, striped, logo visible, etc.) */
	patterns: string[]
	/** Estimated condition from photos */
	condition: string
	/** Optimized search queries */
	searchQueries: {
		/** Primary search query */
		primary: string
		/** Alternative queries */
		secondary: string[]
		/** Visual features description for matching */
		visualFeatures: string
	}
	/** Estimated retail price if brand is known */
	estimatedRetailPrice?: number
}

/**
 * Individual listing scraped from a platform
 */
export interface ScrapedListing {
	platform: Platform
	title: string
	price: number
	currency: string
	url: string
	imageUrl?: string
	condition?: string
	seller?: {
		name: string
		rating?: number
	}
	/** Relevance score (0-100) from AI matcher */
	relevanceScore?: number
}

/**
 * Options for platform search
 */
export interface SearchOptions {
	/** Maximum number of results to return */
	maxResults?: number
	/** Minimum price filter */
	minPrice?: number
	/** Maximum price filter */
	maxPrice?: number
	/** Condition filter */
	condition?: string
}

/**
 * Match verification result from AI
 */
export interface MatchVerification {
	/** Is this listing a match? */
	isMatch: boolean
	/** Confidence score (0-100) */
	confidence: number
	/** Match details */
	matchDetails: {
		brandMatch: boolean
		modelMatch: boolean
		conditionMatch: boolean
		sizeMatch: boolean
		colorMatch: boolean
	}
	/** Reason for match/non-match */
	reason: string
}

/**
 * Enriched source with aggregated data
 */
export interface EnrichedSource {
	/** Platform name */
	name: string
	/** Average price across listings */
	price: number
	/** Search URL */
	url: string
	/** Number of listings found */
	count: number
	/** Top matched listings */
	listings: ScrapedListing[]
	/** Average price */
	averagePrice: number
	/** Price range */
	priceRange: {
		min: number
		max: number
	}
}

/**
 * Input for source research
 */
export interface SourceResearchInput {
	/** Article photos URLs */
	photos: string[]
	/** Article title */
	title: string
	/** Article brand (if known) */
	brand: string | null
	/** Current asking price */
	price: number
	/** Article condition */
	condition: string
	/** Article size (optional) */
	size?: string
}

/**
 * Complete source research result
 */
export interface SourceResearchResult {
	/** Market price analysis */
	marketPrice: {
		low: number
		high: number
		average: number
		confidence: 'low' | 'medium' | 'high'
	}
	/** Enriched sources with real data */
	sources: EnrichedSource[]
	/** Retail price if found */
	retailPrice?: {
		price: number
		url: string
		brand: string
	}
	/** Total listings analyzed */
	totalListingsAnalyzed: number
	/** Listings that matched the article */
	matchedListings: number
	/** Image analysis result */
	imageAnalysis?: ImageAnalysisResult
}

/**
 * Interface for platform scrapers
 */
export interface IScraper {
	/** Platform name */
	readonly platform: Platform

	/** Search for listings */
	search(query: string, options?: SearchOptions): Promise<ScrapedListing[]>

	/** Check if scraper is available */
	isAvailable(): Promise<boolean>
}

/**
 * Interface for AI-based image analyzer
 */
export interface IImageAnalyzer {
	/** Analyze photos and extract features */
	analyzeImages(photoUrls: string[], context: { title: string; brand: string | null }): Promise<ImageAnalysisResult>
}

/**
 * Interface for AI-based listing matcher
 */
export interface IAIMatcher {
	/** Verify if listings match the original article */
	verifyMatches(
		listings: ScrapedListing[],
		originalContext: {
			title: string
			brand: string | null
			condition: string
			imageAnalysis: ImageAnalysisResult
		}
	): Promise<Array<ScrapedListing & { verification: MatchVerification }>>
}

/**
 * Source Research Provider interface (orchestrator)
 */
export interface ISourceResearchProvider {
	/** Execute full source research pipeline */
	research(input: SourceResearchInput): Promise<SourceResearchResult>

	/** Check if provider is available */
	isAvailable(): Promise<boolean>
}
