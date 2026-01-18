import type { VintedArticleData } from '@vinted-ai/shared'

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
	brand: string | null
	size: string | null
	condition: string
	photos: string[]
	seller: {
		username: string
		rating: number | null
		salesCount: number
		responseTime: string | null
		lastSeen: string | null
	}
	listedAt: string | null
	views: number | null
	favorites: number | null
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
