import type {
	AuthenticityCheck,
	Negotiation,
	NegotiationTone,
	Opportunity,
	PhotoQuality,
} from '@vinted-ai/shared'

/**
 * Input for complete analysis (single AI call)
 */
export interface CompleteAnalysisInput {
	photoUrls: string[]
	title: string
	brand: string | null
	condition: string
	price: number
	daysListed: number
	/** ISO language code for response localization (e.g., 'fr', 'en', 'de') */
	language?: string
	/** Size of the article (S, M, L, XL, etc.) */
	size?: string
}

/**
 * Complete analysis result (from single AI call)
 */
export interface CompleteAnalysisResult {
	photoQuality: PhotoQuality
	authenticityCheck: AuthenticityCheck
	detectedBrand: string | null
	detectedModel: string | null
	estimatedCondition: string
	marketPriceEstimation: MarketPriceEstimation
	opportunity: Opportunity
	negotiation: Negotiation
}

/**
 * Input for photo analysis
 */
export interface PhotoAnalysisInput {
	photoUrls: string[]
	title: string
	brand: string | null
	condition: string
	price: number
}

/**
 * Input for opportunity scoring
 */
export interface OpportunityScoringInput {
	price: number
	marketPriceLow: number
	marketPriceHigh: number
	marketPriceAvg: number
	photoQualityScore: number
	daysListed: number
	sellerSalesCount: number
	sellerRating: number | null
	authenticityScore: number
}

/**
 * Input for negotiation generation
 */
export interface NegotiationInput {
	price: number
	marketPriceAvg: number
	daysListed: number
	sellerSalesCount: number
	condition: string
	preferredTone?: NegotiationTone
}

/**
 * Market price estimation from AI
 */
/**
 * Source used for market price estimation
 */
export interface MarketPriceSourceEstimation {
	/** Name of the source (e.g., "Vinted FR", "Google Search") */
	name: string
	/** Average price found on this source */
	price: number
	/** Search query used */
	searchQuery?: string
	/** Number of articles found */
	count?: number
}

export interface MarketPriceEstimation {
	/** Estimated minimum market price */
	low: number
	/** Estimated maximum market price */
	high: number
	/** Estimated average market price */
	average: number
	/** Confidence level */
	confidence: 'low' | 'medium' | 'high'
	/** Explanation of the estimation */
	reasoning: string
	/** Estimated retail/new price if applicable */
	retailPrice?: number
	/** Sources used for the estimation */
	sources?: MarketPriceSourceEstimation[]
}

/**
 * Combined photo analysis result
 */
export interface PhotoAnalysisResult {
	photoQuality: PhotoQuality
	authenticityCheck: AuthenticityCheck
	detectedBrand: string | null
	detectedModel: string | null
	estimatedCondition: string
	/** Market price estimation based on visual analysis */
	marketPriceEstimation: MarketPriceEstimation
}

/**
 * AI Provider interface (port)
 * Defines the contract for AI-powered analysis operations
 */
export interface IAIProvider {
	/**
	 * Complete analysis in a single AI call (optimized)
	 * Combines: photo analysis + opportunity scoring + negotiation generation
	 */
	analyzeComplete(input: CompleteAnalysisInput): Promise<CompleteAnalysisResult>

	/**
	 * Analyze photos for quality and authenticity
	 * @deprecated Use analyzeComplete() for better performance
	 */
	analyzePhotos(input: PhotoAnalysisInput): Promise<PhotoAnalysisResult>

	/**
	 * Calculate opportunity score based on multiple factors
	 * @deprecated Use analyzeComplete() for better performance
	 */
	scoreOpportunity(input: OpportunityScoringInput): Promise<Opportunity>

	/**
	 * Generate a negotiation script and suggested offer
	 * @deprecated Use analyzeComplete() for better performance
	 */
	generateNegotiation(input: NegotiationInput): Promise<Negotiation>

	/**
	 * Get the provider name (e.g., "openai", "ollama")
	 */
	getProviderName(): string

	/**
	 * Check if the provider is available and configured
	 */
	isAvailable(): Promise<boolean>
}
