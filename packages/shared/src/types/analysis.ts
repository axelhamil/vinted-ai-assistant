/**
 * Photo quality analysis result
 */
export interface PhotoQuality {
	score: number
	hasModel: boolean
	lighting: 'poor' | 'average' | 'good'
	background: 'messy' | 'neutral' | 'professional'
	issues: string[]
}

/**
 * Authenticity check result
 */
export interface AuthenticityCheck {
	score: number
	flags: string[]
	confidence: ConfidenceLevel
}

/**
 * Individual listing in a source
 */
export interface SourceListing {
	title: string
	price: number
	url: string
	imageUrl?: string
}

/**
 * Market price source
 */
export interface MarketPriceSource {
	name: string
	price: number
	url?: string
	count?: number // Number of articles found
	searchQuery?: string // The search query used
	listings?: SourceListing[] // Top listings from this source
	priceRange?: {
		min: number
		max: number
	}
}

/**
 * Retail price information
 */
export interface RetailPrice {
	price: number
	url: string
	brand: string
}

/**
 * Market price estimation
 */
export interface MarketPrice {
	low: number
	high: number
	average: number
	sources: MarketPriceSource[]
	confidence: ConfidenceLevel
	/** Retail price if found */
	retailPrice?: RetailPrice
	/** AI reasoning for the price estimation */
	reasoning?: string
}

/**
 * Signal type for opportunity analysis
 */
export type SignalType = 'positive' | 'negative' | 'neutral'

/**
 * Individual signal in opportunity analysis
 */
export interface OpportunitySignal {
	type: SignalType
	label: string
	detail: string
}

/**
 * Opportunity analysis result
 */
export interface Opportunity {
	score: number
	margin: number
	marginPercent: number
	signals: OpportunitySignal[]
}

/**
 * Negotiation tone options
 */
export type NegotiationTone = 'friendly' | 'direct' | 'urgent'

/**
 * Negotiation recommendation
 */
export interface Negotiation {
	suggestedOffer: number
	script: string
	arguments: string[]
	tone: NegotiationTone
}

/**
 * Platform relevance for resale
 */
export type PlatformRelevance = 'high' | 'medium' | 'low'

/**
 * Resale platform recommendation
 */
export interface ResalePlatform {
	name: string
	relevance: PlatformRelevance
}

/**
 * Resale recommendation
 */
export interface Resale {
	recommendedPrice: number
	estimatedDays: number
	tips: string[]
	platforms: ResalePlatform[]
}

/**
 * Analysis status
 */
export type AnalysisStatus = 'ANALYZED' | 'WATCHING' | 'BOUGHT' | 'SOLD' | 'ARCHIVED'

/**
 * Confidence level for estimations
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high'

/**
 * AI detection summary
 */
export interface AIDetection {
	/** Brand detected by AI (may differ from seller's claim) */
	detectedBrand: string | null
	/** Model detected by AI (e.g., "Air Max 90", "Speedy 30") */
	detectedModel: string | null
	/** Condition estimated by AI */
	estimatedCondition: string | null
}

/**
 * Complete analysis result returned by the backend
 */
export interface AnalysisResult {
	id: string
	vintedId: string
	url: string
	title: string
	price: number
	brand: string | null

	/** AI detection results */
	aiDetection: AIDetection

	photoQuality: PhotoQuality
	authenticityCheck: AuthenticityCheck
	marketPrice: MarketPrice
	opportunity: Opportunity
	negotiation: Negotiation
	resale: Resale

	status: AnalysisStatus
	analyzedAt: Date
	cachedUntil: Date
}
