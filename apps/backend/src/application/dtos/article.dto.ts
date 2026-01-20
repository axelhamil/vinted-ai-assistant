import type { VintedArticleData } from '@vinted-ai/shared/article'

/**
 * Seller badge data
 */
export interface SellerBadgeDTO {
	id: string
	label: string
	description: string | null
}

/**
 * DTO for article data received from the extension
 * This matches the VintedArticleData interface from shared package
 */
export interface ArticleInputDTO {
	vintedId: string
	url: string
	title: string
	description: string
	price: number
	/** Shipping cost in euros (null = free shipping or not available) */
	shippingCost: number | null
	brand: string | null
	size: string | null
	condition: string
	photos: string[]
	seller: {
		username: string
		profileUrl: string | null
		avatarUrl: string | null
		rating: number | null
		ratingCount: number | null
		salesCount: number
		responseTime: string | null
		lastSeen: string | null
		location: string | null
		badges: SellerBadgeDTO[]
		// Extended fields from profile fetch
		activeListings: number | null
		memberSince: string | null
		followers: number | null
		verifiedProfile: boolean
		reliability: 'high' | 'medium' | 'low' | 'unknown'
	}
	listedAt: string | null
	views: number | null
	favorites: number | null
	forceRefresh?: boolean
	/** ISO language code for response localization (e.g., 'fr', 'en', 'de') */
	language?: string
}

/**
 * Convert ArticleInputDTO to VintedArticleData
 */
export function toVintedArticleData(dto: ArticleInputDTO): VintedArticleData {
	return {
		...dto,
		listedAt: dto.listedAt ? new Date(dto.listedAt) : null,
	}
}

/**
 * Calculate days listed from listedAt date
 */
export function calculateDaysListed(listedAt: Date | null): number {
	if (!listedAt) {
		return 0
	}
	const now = new Date()
	const diffTime = Math.abs(now.getTime() - listedAt.getTime())
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
	return diffDays
}
