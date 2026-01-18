import type {
	AuthenticityCheck,
	Negotiation,
	NegotiationTone,
	Opportunity,
	PhotoQuality,
} from '@vinted-ai/shared'

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
 * Combined photo analysis result
 */
export interface PhotoAnalysisResult {
	photoQuality: PhotoQuality
	authenticityCheck: AuthenticityCheck
	detectedBrand: string | null
	detectedModel: string | null
	estimatedCondition: string
}

/**
 * AI Provider interface (port)
 * Defines the contract for AI-powered analysis operations
 */
export interface IAIProvider {
	/**
	 * Analyze photos for quality and authenticity
	 */
	analyzePhotos(input: PhotoAnalysisInput): Promise<PhotoAnalysisResult>

	/**
	 * Calculate opportunity score based on multiple factors
	 */
	scoreOpportunity(input: OpportunityScoringInput): Promise<Opportunity>

	/**
	 * Generate a negotiation script and suggested offer
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
