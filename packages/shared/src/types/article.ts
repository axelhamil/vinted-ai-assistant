/**
 * Reliability level for seller data
 */
export type SellerReliability = 'high' | 'medium' | 'low' | 'unknown'

/**
 * Seller badge information
 */
export interface SellerBadge {
	/** Badge identifier (e.g., 'active_publisher') */
	id: string
	/** Display label (e.g., 'Publie activement') */
	label: string
	/** Badge description */
	description: string | null
}

/**
 * Seller information extracted from Vinted page
 */
export interface VintedSeller {
	username: string
	profileUrl: string | null
	avatarUrl: string | null
	rating: number | null
	ratingCount: number | null
	salesCount: number
	responseTime: string | null
	lastSeen: string | null
	location: string | null
	badges: SellerBadge[]
	// Extended fields from profile fetch
	activeListings: number | null
	memberSince: string | null
	followers: number | null
	verifiedProfile: boolean
	reliability: SellerReliability
}

/**
 * Article data extracted from Vinted page via DOM parsing
 */
export interface VintedArticleData {
	vintedId: string
	url: string
	title: string
	description: string
	price: number
	/** Total price including buyer protection (null if not available) */
	totalPrice: number | null
	/** Shipping cost in euros (null = free shipping or not available) */
	shippingCost: number | null
	brand: string | null
	size: string | null
	condition: string
	photos: string[]
	seller: VintedSeller
	listedAt: Date | null
	views: number | null
	favorites: number | null
}
