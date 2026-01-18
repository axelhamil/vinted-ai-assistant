import type { VintedArticleData, VintedSeller } from '@vinted-ai/shared'

/**
 * Interface for JSON-LD structured data from Vinted pages
 */
interface VintedJsonLd {
	'@type'?: string
	name?: string
	description?: string
	image?: string | string[]
	offers?: {
		price?: string | number
	}
	brand?: {
		name?: string
	}
	itemCondition?: string
	datePosted?: string
}

/**
 * Extracts the Vinted article ID from the current URL
 */
export function extractVintedId(): string | null {
	const match = window.location.pathname.match(/\/items\/(\d+)/)
	return match?.[1] ?? null
}

/**
 * Extracts the article title from the page
 */
export function extractTitle(): string {
	// Try multiple selectors for title
	const selectors = [
		'[data-testid="item-title"]',
		'[itemprop="name"]',
		'h1.web_ui__Text__text',
		'.item-title h1',
		'h1',
	]

	for (const selector of selectors) {
		const element = document.querySelector(selector)
		if (element?.textContent?.trim()) {
			return element.textContent.trim()
		}
	}

	return 'Unknown Title'
}

/**
 * Extracts the price from the page
 */
export function extractPrice(): number {
	// Try multiple selectors for price
	const selectors = [
		'[data-testid="item-price"]',
		'[itemprop="price"]',
		'.item-price',
		'.web_ui__Text__text.web_ui__Text__heading',
	]

	for (const selector of selectors) {
		const element = document.querySelector(selector)
		if (element) {
			// Check for content attribute first (structured data)
			const content = element.getAttribute('content')
			if (content) {
				const price = Number.parseFloat(content)
				if (!Number.isNaN(price)) return price
			}

			// Parse from text content
			const text = element.textContent?.trim() || ''
			const match = text.match(/(\d+[.,]?\d*)\s*€?/)
			if (match?.[1]) {
				const price = Number.parseFloat(match[1].replace(',', '.'))
				if (!Number.isNaN(price)) return price
			}
		}
	}

	// Try to find price in JSON-LD structured data
	const jsonLd = extractJsonLd()
	if (jsonLd?.offers?.price) {
		return Number.parseFloat(String(jsonLd.offers.price))
	}

	return 0
}

/**
 * Extracts the article description from the page
 */
export function extractDescription(): string {
	const selectors = [
		'[data-testid="item-description"]',
		'[itemprop="description"]',
		'.item-description',
		'.item-page-description',
	]

	for (const selector of selectors) {
		const element = document.querySelector(selector)
		if (element?.textContent?.trim()) {
			return element.textContent.trim()
		}
	}

	return ''
}

/**
 * Extracts photo URLs from the page
 */
export function extractPhotos(): string[] {
	const photos: string[] = []
	const seen = new Set<string>()

	// Try to get photos from image gallery
	const imageSelectors = [
		'[data-testid="item-photo"] img',
		'.item-photos img',
		'.item-slider img',
		'[itemprop="image"]',
		'.web_ui__Image__image',
		'.item-photo img',
		'.carousel img',
	]

	for (const selector of imageSelectors) {
		const images = document.querySelectorAll<HTMLImageElement>(selector)
		for (const img of images) {
			const src = img.src || img.getAttribute('data-src') || ''
			if (src && !seen.has(src) && isValidPhotoUrl(src)) {
				// Get highest resolution version
				const highResSrc = getHighResolutionUrl(src)
				seen.add(highResSrc)
				photos.push(highResSrc)
			}
		}
	}

	// Also check srcset for higher resolution images
	const allImages = document.querySelectorAll<HTMLImageElement>('img[srcset]')
	for (const img of allImages) {
		const srcset = img.getAttribute('srcset')
		if (srcset) {
			const highestRes = parseHighestResFromSrcset(srcset)
			if (highestRes && !seen.has(highestRes) && isValidPhotoUrl(highestRes)) {
				seen.add(highestRes)
				photos.push(highestRes)
			}
		}
	}

	// Try to get photos from JSON-LD
	const jsonLd = extractJsonLd()
	if (jsonLd?.image) {
		const images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image]
		for (const imgUrl of images) {
			if (typeof imgUrl === 'string' && !seen.has(imgUrl) && isValidPhotoUrl(imgUrl)) {
				seen.add(imgUrl)
				photos.push(imgUrl)
			}
		}
	}

	return photos
}

/**
 * Checks if a URL is a valid Vinted photo URL
 */
function isValidPhotoUrl(url: string): boolean {
	return (
		url.includes('vinted') &&
		(url.includes('/photos/') || url.includes('/images/') || url.includes('cloudfront'))
	)
}

/**
 * Gets highest resolution version of a Vinted image URL
 */
function getHighResolutionUrl(url: string): string {
	// Vinted uses URL parameters for image sizing
	// Remove size constraints to get full resolution
	try {
		const urlObj = new URL(url)
		// Remove common size parameters
		urlObj.searchParams.delete('s')
		urlObj.searchParams.delete('w')
		urlObj.searchParams.delete('h')
		return urlObj.toString()
	} catch {
		return url
	}
}

/**
 * Parses srcset to get the highest resolution image URL
 */
function parseHighestResFromSrcset(srcset: string): string | null {
	const entries = srcset.split(',').map((entry) => {
		const parts = entry.trim().split(/\s+/)
		const url = parts[0]
		const descriptor = parts[1] || '1x'
		const width = Number.parseInt(descriptor) || 1
		return { url, width }
	})

	if (entries.length === 0) return null

	// Sort by width descending and return the highest
	entries.sort((a, b) => b.width - a.width)
	return entries[0]?.url ?? null
}

/**
 * Extracts brand from the page
 */
export function extractBrand(): string | null {
	const selectors = [
		'[data-testid="item-brand"]',
		'[itemprop="brand"]',
		'.item-brand',
		'a[href*="/brand/"]',
	]

	for (const selector of selectors) {
		const element = document.querySelector(selector)
		if (element?.textContent?.trim()) {
			return element.textContent.trim()
		}
	}

	// Try JSON-LD
	const jsonLd = extractJsonLd()
	if (jsonLd?.brand?.name) {
		return jsonLd.brand.name
	}

	// Try to find brand in details section
	const detailsText = getItemDetailsText()
	const brandMatch = detailsText.match(/Marque\s*:?\s*(.+?)(?:\n|$)/i)
	if (brandMatch?.[1]) {
		return brandMatch[1].trim()
	}

	return null
}

/**
 * Extracts size from the page
 */
export function extractSize(): string | null {
	const selectors = ['[data-testid="item-size"]', '[itemprop="size"]', '.item-size']

	for (const selector of selectors) {
		const element = document.querySelector(selector)
		if (element?.textContent?.trim()) {
			return element.textContent.trim()
		}
	}

	// Try to find size in details section
	const detailsText = getItemDetailsText()
	const sizeMatch = detailsText.match(/Taille\s*:?\s*(.+?)(?:\n|$)/i)
	if (sizeMatch?.[1]) {
		return sizeMatch[1].trim()
	}

	return null
}

/**
 * Extracts condition from the page
 */
export function extractCondition(): string {
	const selectors = ['[data-testid="item-condition"]', '.item-condition']

	for (const selector of selectors) {
		const element = document.querySelector(selector)
		if (element?.textContent?.trim()) {
			return element.textContent.trim()
		}
	}

	// Try JSON-LD
	const jsonLd = extractJsonLd()
	if (jsonLd?.itemCondition) {
		// Convert schema.org condition to human-readable
		const conditionMap: Record<string, string> = {
			'https://schema.org/NewCondition': 'Neuf avec étiquette',
			'https://schema.org/UsedCondition': 'Bon état',
			NewCondition: 'Neuf avec étiquette',
			UsedCondition: 'Bon état',
		}
		return conditionMap[jsonLd.itemCondition] ?? jsonLd.itemCondition
	}

	// Try to find condition in details section
	const detailsText = getItemDetailsText()
	const conditionMatch = detailsText.match(/État\s*:?\s*(.+?)(?:\n|$)/i)
	if (conditionMatch?.[1]) {
		return conditionMatch[1].trim()
	}

	return 'Unknown'
}

/**
 * Extracts seller information from the page
 */
export function extractSeller(): VintedSeller {
	const seller: VintedSeller = {
		username: 'Unknown',
		rating: null,
		salesCount: 0,
		responseTime: null,
		lastSeen: null,
	}

	// Extract username
	const usernameSelectors = [
		'[data-testid="seller-username"]',
		'.user-info__name a',
		'a[href*="/member/"]',
		'.seller-info a',
	]

	for (const selector of usernameSelectors) {
		const element = document.querySelector(selector)
		if (element?.textContent?.trim()) {
			seller.username = element.textContent.trim()
			break
		}
	}

	// Extract rating
	const ratingSelectors = [
		'[data-testid="seller-rating"]',
		'.user-rating',
		'[itemprop="ratingValue"]',
	]

	for (const selector of ratingSelectors) {
		const element = document.querySelector(selector)
		if (element) {
			const content = element.getAttribute('content')
			if (content) {
				seller.rating = Number.parseFloat(content)
				break
			}
			const text = element.textContent?.trim() || ''
			const match = text.match(/(\d+[.,]?\d*)/)
			if (match?.[1]) {
				seller.rating = Number.parseFloat(match[1].replace(',', '.'))
				break
			}
		}
	}

	// Extract sales count
	const salesSelectors = ['[data-testid="seller-sales-count"]', '.user-sales-count', '.sales-count']

	for (const selector of salesSelectors) {
		const element = document.querySelector(selector)
		if (element?.textContent) {
			const match = element.textContent.match(/(\d+)\s*vente/i)
			if (match?.[1]) {
				seller.salesCount = Number.parseInt(match[1], 10)
				break
			}
		}
	}

	// Try to extract from general seller info block
	const sellerInfoBlock = document.querySelector(
		'.seller-info, .user-info, [data-testid="seller-info"]'
	)
	if (sellerInfoBlock) {
		const text = sellerInfoBlock.textContent || ''

		// Extract sales count from text if not found
		if (seller.salesCount === 0) {
			const salesMatch = text.match(/(\d+)\s*vente/i)
			if (salesMatch?.[1]) {
				seller.salesCount = Number.parseInt(salesMatch[1], 10)
			}
		}

		// Extract response time
		const responseMatch = text.match(/répond\s*(en|sous)\s*(.+)/i)
		if (responseMatch?.[2]) {
			seller.responseTime = responseMatch[2].trim()
		}

		// Extract last seen
		const lastSeenMatch = text.match(/(?:vu|actif|connecté)\s*(.+)/i)
		if (lastSeenMatch?.[1]) {
			seller.lastSeen = lastSeenMatch[1].trim()
		}
	}

	return seller
}

/**
 * Extracts the listing date from the page
 */
export function extractListedAt(): Date | null {
	// Try to find date in JSON-LD
	const jsonLd = extractJsonLd()
	if (jsonLd?.datePosted) {
		return new Date(String(jsonLd.datePosted))
	}

	// Try to find date in page
	const dateSelectors = ['[data-testid="item-date"]', '.item-date', 'time[datetime]']

	for (const selector of dateSelectors) {
		const element = document.querySelector(selector)
		if (element) {
			const datetime = element.getAttribute('datetime')
			if (datetime) {
				return new Date(datetime)
			}
			const text = element.textContent?.trim()
			if (text) {
				const date = parseRelativeDate(text)
				if (date) return date
			}
		}
	}

	return null
}

/**
 * Parses relative date strings like "il y a 2 jours"
 */
function parseRelativeDate(text: string): Date | null {
	const now = new Date()

	const patterns: Array<{
		pattern: RegExp
		unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
	}> = [
		{ pattern: /il y a (\d+)\s*minute/i, unit: 'minutes' },
		{ pattern: /il y a (\d+)\s*heure/i, unit: 'hours' },
		{ pattern: /il y a (\d+)\s*jour/i, unit: 'days' },
		{ pattern: /il y a (\d+)\s*semaine/i, unit: 'weeks' },
		{ pattern: /il y a (\d+)\s*mois/i, unit: 'months' },
	]

	for (const { pattern, unit } of patterns) {
		const match = text.match(pattern)
		if (match?.[1]) {
			const value = Number.parseInt(match[1], 10)
			const date = new Date(now)

			switch (unit) {
				case 'minutes':
					date.setMinutes(date.getMinutes() - value)
					break
				case 'hours':
					date.setHours(date.getHours() - value)
					break
				case 'days':
					date.setDate(date.getDate() - value)
					break
				case 'weeks':
					date.setDate(date.getDate() - value * 7)
					break
				case 'months':
					date.setMonth(date.getMonth() - value)
					break
			}

			return date
		}
	}

	return null
}

/**
 * Extracts view count from the page
 */
export function extractViews(): number | null {
	const selectors = ['[data-testid="item-views"]', '.item-views', '.views-count']

	for (const selector of selectors) {
		const element = document.querySelector(selector)
		if (element?.textContent) {
			const match = element.textContent.match(/(\d+)/)
			if (match?.[1]) {
				return Number.parseInt(match[1], 10)
			}
		}
	}

	return null
}

/**
 * Extracts favorites count from the page
 */
export function extractFavorites(): number | null {
	const selectors = ['[data-testid="item-favorites"]', '.item-favorites', '.favorites-count']

	for (const selector of selectors) {
		const element = document.querySelector(selector)
		if (element?.textContent) {
			const match = element.textContent.match(/(\d+)/)
			if (match?.[1]) {
				return Number.parseInt(match[1], 10)
			}
		}
	}

	return null
}

/**
 * Extracts JSON-LD structured data from the page
 */
function extractJsonLd(): VintedJsonLd | null {
	const scripts = document.querySelectorAll('script[type="application/ld+json"]')

	for (const script of scripts) {
		try {
			const data = JSON.parse(script.textContent || '') as VintedJsonLd | VintedJsonLd[]

			// Check if it's a Product type
			if (!Array.isArray(data) && data['@type'] === 'Product') {
				return data
			}

			// Check if it's an array and find Product
			if (Array.isArray(data)) {
				const product = data.find((item) => item['@type'] === 'Product')
				if (product) return product
			}
		} catch {
			// Invalid JSON, continue to next script
		}
	}

	return null
}

/**
 * Gets the text content of the item details section
 */
function getItemDetailsText(): string {
	const detailsSelectors = ['.item-details', '.item-attributes', '[data-testid="item-details"]']

	for (const selector of detailsSelectors) {
		const element = document.querySelector(selector)
		if (element?.textContent) {
			return element.textContent
		}
	}

	return ''
}

/**
 * Main function to parse all article data from the page
 */
export function parseVintedArticle(): VintedArticleData | null {
	const vintedId = extractVintedId()

	if (!vintedId) {
		console.error('Vinted AI Assistant: Could not extract article ID')
		return null
	}

	const articleData: VintedArticleData = {
		vintedId,
		url: window.location.href,
		title: extractTitle(),
		description: extractDescription(),
		price: extractPrice(),
		brand: extractBrand(),
		size: extractSize(),
		condition: extractCondition(),
		photos: extractPhotos(),
		seller: extractSeller(),
		listedAt: extractListedAt(),
		views: extractViews(),
		favorites: extractFavorites(),
	}

	return articleData
}

/**
 * Waits for the page to be fully loaded before parsing
 */
export function waitForPageLoad(): Promise<void> {
	return new Promise((resolve) => {
		if (document.readyState === 'complete') {
			// Add a small delay to ensure dynamic content is loaded
			setTimeout(resolve, 500)
		} else {
			window.addEventListener('load', () => {
				setTimeout(resolve, 500)
			})
		}
	})
}

/**
 * Observes DOM changes and re-parses when significant changes occur
 */
export function observePageChanges(callback: (data: VintedArticleData) => void): MutationObserver {
	let debounceTimer: ReturnType<typeof setTimeout> | null = null

	const observer = new MutationObserver(() => {
		if (debounceTimer) {
			clearTimeout(debounceTimer)
		}

		debounceTimer = setTimeout(() => {
			const data = parseVintedArticle()
			if (data) {
				callback(data)
			}
		}, 300)
	})

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	})

	return observer
}
