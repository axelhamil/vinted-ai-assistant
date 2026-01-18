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
 * Market price source
 */
export interface MarketPriceSource {
	name: string
	price: number
	url?: string
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
 * Complete analysis result returned by the backend
 */
export interface AnalysisResult {
	id: string
	vintedId: string
	url: string
	title: string
	price: number
	brand: string | null

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
