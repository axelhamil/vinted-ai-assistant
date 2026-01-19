import type {
	AIDetection,
	AnalysisStatus,
	AuthenticityCheck,
	MarketPrice,
	Negotiation,
	Opportunity,
	PhotoQuality,
	Resale,
} from '@vinted-ai/shared/analysis'
import type { AnalysisEntity } from '../../domain/entities/analysis.entity'

/**
 * DTO for analysis response sent to the client
 */
export interface AnalysisResponseDTO {
	id: string
	vintedId: string
	url: string
	title: string
	price: number
	brand: string | null

	aiDetection: AIDetection

	photoQuality: PhotoQuality
	authenticityCheck: AuthenticityCheck
	marketPrice: MarketPrice
	opportunity: Opportunity
	negotiation: Negotiation
	resale: Resale

	status: AnalysisStatus
	analyzedAt: string
	cachedUntil: string
}

/**
 * Convert AnalysisEntity to AnalysisResponseDTO
 */
export function toAnalysisResponseDTO(entity: AnalysisEntity): AnalysisResponseDTO {
	return {
		id: entity.id,
		vintedId: entity.vintedId,
		url: entity.url,
		title: entity.title,
		price: entity.askingPrice.value,
		brand: entity.brand,

		aiDetection: {
			detectedBrand: entity.brand,
			detectedModel: entity.detectedModel,
			estimatedCondition: entity.condition,
		},

		photoQuality: entity.photoQuality,
		authenticityCheck: entity.authenticityCheck,
		marketPrice: entity.marketPrice,
		opportunity: entity.opportunity,
		negotiation: entity.negotiation,
		resale: entity.resale,

		status: entity.status,
		analyzedAt: entity.analyzedAt.toISOString(),
		cachedUntil: entity.getCachedUntil().toISOString(),
	}
}

/**
 * DTO for analysis list response
 */
export interface AnalysisListResponseDTO {
	data: AnalysisResponseDTO[]
	pagination: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
	}
}

/**
 * DTO for analysis stats
 */
export interface AnalysisStatsDTO {
	today: number
	opportunities: number
	bought: number
	sold: number
}

/**
 * DTO for portfolio item
 */
export interface PortfolioItemDTO {
	id: string
	vintedId: string
	title: string
	price: number
	score: number
	status: AnalysisStatus
	imageUrl: string | null
	analyzedAt: string
	marginPercent: number
	url: string
}

/**
 * DTO for portfolio list response
 */
export interface PortfolioListResponseDTO {
	items: PortfolioItemDTO[]
	total: number
}

/**
 * DTO for portfolio stats
 */
export interface PortfolioStatsDTO {
	watching: number
	bought: number
	sold: number
	opportunities: number
}

/**
 * Convert AnalysisEntity to PortfolioItemDTO
 */
export function toPortfolioItemDTO(entity: AnalysisEntity): PortfolioItemDTO {
	return {
		id: entity.id,
		vintedId: entity.vintedId,
		title: entity.title,
		price: entity.askingPrice.value,
		score: entity.opportunity.score,
		status: entity.status,
		imageUrl: entity.photos[0] ?? null,
		analyzedAt: entity.analyzedAt.toISOString(),
		marginPercent: entity.opportunity.marginPercent,
		url: entity.url,
	}
}

/**
 * DTO for status update request
 */
export interface UpdateStatusDTO {
	status: AnalysisStatus
}

/**
 * DTO for list query parameters
 */
export interface ListAnalysesQueryDTO {
	limit?: number
	offset?: number
	minScore?: number
	status?: AnalysisStatus
}
