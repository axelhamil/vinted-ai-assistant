/**
 * Seller information extracted from Vinted page
 */
export interface VintedSeller {
	username: string
	rating: number | null
	salesCount: number
	responseTime: string | null
	lastSeen: string | null
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
	brand: string | null
	size: string | null
	condition: string
	photos: string[]
	seller: VintedSeller
	listedAt: Date | null
	views: number | null
	favorites: number | null
}
