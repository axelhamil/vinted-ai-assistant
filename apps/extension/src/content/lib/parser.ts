import type { SellerBadge, VintedArticleData, VintedSeller } from '@vinted-ai/shared'

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
 * Detects the language from Vinted domain or browser settings
 * Returns ISO 639-1 language code (e.g., 'fr', 'en', 'de')
 */
export function detectLanguage(): string {
	// Map Vinted TLDs to language codes
	const domainLanguageMap: Record<string, string> = {
		'vinted.fr': 'fr',
		'vinted.de': 'de',
		'vinted.es': 'es',
		'vinted.it': 'it',
		'vinted.nl': 'nl',
		'vinted.be': 'fr', // Belgium uses French/Dutch, default to French
		'vinted.at': 'de', // Austria
		'vinted.pl': 'pl',
		'vinted.pt': 'pt',
		'vinted.cz': 'cs',
		'vinted.sk': 'sk',
		'vinted.hu': 'hu',
		'vinted.ro': 'ro',
		'vinted.lt': 'lt',
		'vinted.hr': 'hr',
		'vinted.co.uk': 'en',
		'vinted.com': 'en',
	}

	// Try to extract from current hostname
	const hostname = window.location.hostname.toLowerCase()

	for (const [domain, lang] of Object.entries(domainLanguageMap)) {
		if (hostname.includes(domain) || hostname.endsWith(domain.replace('vinted.', ''))) {
			return lang
		}
	}

	// Fallback: check document language attribute
	const htmlLang = document.documentElement.lang
	if (htmlLang) {
		// Extract primary language code (e.g., 'fr-FR' -> 'fr')
		const primaryLang = htmlLang.split('-')[0].toLowerCase()
		if (Object.values(domainLanguageMap).includes(primaryLang)) {
			return primaryLang
		}
	}

	// Fallback: use browser language
	const browserLang = navigator.language.split('-')[0].toLowerCase()
	if (Object.values(domainLanguageMap).includes(browserLang)) {
		return browserLang
	}

	// Default to French (most common for Vinted)
	return 'fr'
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
 * Only extracts images from the article photo container
 */
export function extractPhotos(): string[] {
	const photos: string[] = []
	const seen = new Set<string>()

	// Helper to add photo if valid
	const addPhoto = (url: string) => {
		if (url && !seen.has(url) && isValidPhotoUrl(url)) {
			const highResSrc = getHighResolutionUrl(url)
			if (!seen.has(highResSrc)) {
				seen.add(highResSrc)
				photos.push(highResSrc)
			}
		}
	}

	// Helper to extract images from a container
	const extractFromContainer = (container: Element) => {
		const images = container.querySelectorAll<HTMLImageElement>('img')
		for (const img of images) {
			// Try src first
			addPhoto(img.src)
			// Try data-src (lazy loading)
			addPhoto(img.getAttribute('data-src') || '')
			// Try srcset
			const srcset = img.getAttribute('srcset')
			if (srcset) {
				const highestRes = parseHighestResFromSrcset(srcset)
				if (highestRes) addPhoto(highestRes)
			}
		}
	}

	// Primary: Find the item photos container (most specific)
	const photoContainerSelectors = [
		'section.item-photos__container',
		'.item-photos__container',
		'.item-photos',
		'[data-testid="item-photo-gallery"]',
		'[data-testid="item-photos"]',
	]

	for (const selector of photoContainerSelectors) {
		const container = document.querySelector(selector)
		if (container) {
			extractFromContainer(container)
			if (photos.length > 0) {
				console.log('[Vinted AI] Extracted photos from container:', selector, photos.length)
				return photos
			}
		}
	}

	// Secondary: Try specific image selectors within known patterns
	const specificSelectors = [
		'figure.item-photo img.web_ui__Image__content',
		'.item-photo img.web_ui__Image__content',
		'.item-thumbnail img.web_ui__Image__content',
		'[data-testid^="item-photo-"] img',
	]

	for (const selector of specificSelectors) {
		try {
			const images = document.querySelectorAll<HTMLImageElement>(selector)
			for (const img of images) {
				addPhoto(img.src)
				addPhoto(img.getAttribute('data-src') || '')
				const srcset = img.getAttribute('srcset')
				if (srcset) {
					const highestRes = parseHighestResFromSrcset(srcset)
					if (highestRes) addPhoto(highestRes)
				}
			}
		} catch {
			// Selector might be invalid, continue
		}
	}

	if (photos.length > 0) {
		console.log('[Vinted AI] Extracted photos from specific selectors:', photos.length)
		return photos
	}

	// Tertiary: Try to get photos from JSON-LD (usually contains main product images)
	const jsonLd = extractJsonLd()
	if (jsonLd?.image) {
		const images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image]
		for (const imgUrl of images) {
			if (typeof imgUrl === 'string') addPhoto(imgUrl)
		}
	}

	if (photos.length > 0) {
		console.log('[Vinted AI] Extracted photos from JSON-LD:', photos.length)
		return photos
	}

	// Last resort fallback: find the first large image that looks like a product photo
	console.log('[Vinted AI] No photos found with primary selectors, trying fallback...')
	const allImgs = document.querySelectorAll<HTMLImageElement>('img.web_ui__Image__content')
	for (const img of allImgs) {
		// Only consider large images that are likely product photos
		if (img.naturalWidth > 200 && img.naturalHeight > 200) {
			const src = img.src || img.getAttribute('data-src') || ''
			if (src && src.includes('vinted.net')) {
				addPhoto(src)
				// Limit fallback to max 5 images to avoid grabbing unrelated content
				if (photos.length >= 5) break
			}
		}
	}

	console.log('[Vinted AI] Extracted photos (fallback):', photos.length)
	return photos
}

/**
 * Checks if a URL is a valid Vinted photo URL
 */
function isValidPhotoUrl(url: string): boolean {
	// Check if it's a Vinted CDN image
	if (url.includes('vinted.net') || url.includes('vinted.com')) {
		return true
	}
	// Check for common CDN patterns
	if (url.includes('cloudfront') || url.includes('cdn')) {
		return true
	}
	// Exclude small icons, avatars, logos
	if (url.includes('icon') || url.includes('logo') || url.includes('avatar')) {
		return false
	}
	// Accept any https image that looks like a product photo
	return url.startsWith('https://') && /\.(jpg|jpeg|png|webp)/i.test(url)
}

/**
 * Gets highest resolution version of a Vinted image URL
 * Note: Keep the 's' param as it's a signature required by Vinted CDN
 */
function getHighResolutionUrl(url: string): string {
	// Vinted uses URL parameters for image sizing
	// Only remove size params (w, h) but keep signature (s)
	try {
		const urlObj = new URL(url)
		// Only remove actual size parameters, NOT the signature
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
 * Extended seller profile data fetched from profile page
 */
interface SellerProfileData {
	activeListings: number | null
	memberSince: string | null
	followers: number | null
	ratingCount: number | null
	rating: number | null
	verifiedProfile: boolean
}

/**
 * Fetches seller profile data from their profile page
 * Uses browser context (cookies, headers) for natural requests
 * @param username Seller username
 * @returns Profile data or null if fetch fails
 */
export async function fetchSellerProfile(username: string): Promise<SellerProfileData | null> {
	if (!username || username === 'Unknown') {
		return null
	}

	try {
		const profileUrl = `https://www.vinted.fr/member/${encodeURIComponent(username)}`

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 3000) // 3s timeout

		const response = await fetch(profileUrl, {
			credentials: 'include', // Include cookies for session context
			signal: controller.signal,
			headers: {
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
			},
		})

		clearTimeout(timeoutId)

		if (!response.ok) {
			console.warn('[Vinted AI] Failed to fetch seller profile:', response.status)
			return null
		}

		const html = await response.text()
		const parser = new DOMParser()
		const doc = parser.parseFromString(html, 'text/html')

		const profileData: SellerProfileData = {
			activeListings: null,
			memberSince: null,
			followers: null,
			ratingCount: null,
			rating: null,
			verifiedProfile: false,
		}

		// Extract active listings count
		const listingsSelectors = [
			'[data-testid="closet-items-count"]',
			'.closet-count',
			'[data-testid="items-count"]',
		]
		for (const selector of listingsSelectors) {
			const el = doc.querySelector(selector)
			if (el?.textContent) {
				const match = el.textContent.match(/(\d+)/)
				if (match?.[1]) {
					profileData.activeListings = Number.parseInt(match[1], 10)
					break
				}
			}
		}

		// Extract member since date
		const memberSinceSelectors = [
			'[data-testid="member-since"]',
			'.member-since',
			'[class*="member-since"]',
		]
		for (const selector of memberSinceSelectors) {
			const el = doc.querySelector(selector)
			if (el?.textContent?.trim()) {
				// Try to extract date or text like "Membre depuis 2021"
				const text = el.textContent.trim()
				const yearMatch = text.match(/(\d{4})/)
				profileData.memberSince = yearMatch ? yearMatch[1] : text
				break
			}
		}

		// Fallback: search for "membre depuis" text in page
		if (!profileData.memberSince) {
			const allText = doc.body?.textContent || ''
			const memberMatch = allText.match(/membre\s+depuis\s+(\w+\s+\d{4}|\d{4})/i)
			if (memberMatch?.[1]) {
				profileData.memberSince = memberMatch[1]
			}
		}

		// Extract followers count
		const followersSelectors = [
			'[data-testid="followers-count"]',
			'.followers-count',
			'[class*="followers"]',
		]
		for (const selector of followersSelectors) {
			const el = doc.querySelector(selector)
			if (el?.textContent) {
				const match = el.textContent.match(/(\d+)/)
				if (match?.[1]) {
					profileData.followers = Number.parseInt(match[1], 10)
					break
				}
			}
		}

		// Extract rating count
		const ratingCountSelectors = [
			'[data-testid="rating-count"]',
			'[data-testid="reviews-count"]',
			'.rating-count',
			'.reviews-count',
		]
		for (const selector of ratingCountSelectors) {
			const el = doc.querySelector(selector)
			if (el?.textContent) {
				const match = el.textContent.match(/(\d+)\s*(?:avis|évaluation|reviews?)/i)
				if (match?.[1]) {
					profileData.ratingCount = Number.parseInt(match[1], 10)
					break
				}
			}
		}

		// Fallback: look for rating text pattern
		if (!profileData.ratingCount) {
			const allText = doc.body?.textContent || ''
			const ratingMatch = allText.match(/(\d+)\s*(?:avis|évaluation)/i)
			if (ratingMatch?.[1]) {
				profileData.ratingCount = Number.parseInt(ratingMatch[1], 10)
			}
		}

		// Extract rating value
		const ratingSelectors = [
			'[data-testid="user-rating"]',
			'[itemprop="ratingValue"]',
			'.user-rating',
		]
		for (const selector of ratingSelectors) {
			const el = doc.querySelector(selector)
			if (el) {
				const content = el.getAttribute('content')
				if (content) {
					profileData.rating = Number.parseFloat(content)
					break
				}
				const text = el.textContent?.trim() || ''
				const match = text.match(/(\d+[.,]?\d*)/)
				if (match?.[1]) {
					profileData.rating = Number.parseFloat(match[1].replace(',', '.'))
					break
				}
			}
		}

		// Check if profile has photo/bio (verified profile)
		const hasPhoto = !!doc.querySelector('[data-testid="user-photo"] img, .user-photo img, .profile-image img')
		const hasBio = !!(doc.querySelector('[data-testid="user-description"], .user-description')?.textContent?.trim())
		profileData.verifiedProfile = hasPhoto && hasBio

		console.log('[Vinted AI] Seller profile fetched:', profileData)
		return profileData

	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			console.warn('[Vinted AI] Seller profile fetch timeout')
		} else {
			console.warn('[Vinted AI] Error fetching seller profile:', error)
		}
		return null
	}
}

/**
 * Calculates seller reliability based on available data
 */
function calculateSellerReliability(seller: VintedSeller): VintedSeller['reliability'] {
	let score = 0
	let factors = 0

	// Rating factor
	if (seller.rating !== null) {
		factors++
		if (seller.rating >= 4.5) score += 2
		else if (seller.rating >= 4.0) score += 1
	}

	// Rating count factor
	if (seller.ratingCount !== null && seller.ratingCount > 0) {
		factors++
		if (seller.ratingCount >= 50) score += 2
		else if (seller.ratingCount >= 20) score += 1.5
		else if (seller.ratingCount >= 5) score += 1
	}

	// Sales count factor
	if (seller.salesCount > 0) {
		factors++
		if (seller.salesCount >= 50) score += 2
		else if (seller.salesCount >= 20) score += 1.5
		else if (seller.salesCount >= 5) score += 1
	}

	// Member since factor
	if (seller.memberSince) {
		factors++
		const year = Number.parseInt(seller.memberSince, 10)
		if (!Number.isNaN(year)) {
			const yearsActive = new Date().getFullYear() - year
			if (yearsActive >= 3) score += 2
			else if (yearsActive >= 1) score += 1
		}
	}

	// Profile verified factor
	if (seller.verifiedProfile) {
		factors++
		score += 1
	}

	if (factors === 0) return 'unknown'

	const avgScore = score / factors
	if (avgScore >= 1.5) return 'high'
	if (avgScore >= 0.8) return 'medium'
	return 'low'
}

/**
 * Extracts seller badges from the seller card
 */
function extractSellerBadges(): SellerBadge[] {
	const badges: SellerBadge[] = []

	// Find badges container
	const badgesContainer = document.querySelector('[aria-label*="Badges"], [aria-label*="badges"]')
	if (!badgesContainer) return badges

	// Extract each badge cell
	const badgeCells = badgesContainer.querySelectorAll('.web_ui__Cell__cell')
	for (const cell of badgeCells) {
		const titleEl = cell.querySelector('.web_ui__Cell__title')
		const descEl = cell.querySelector('.web_ui__Cell__body span')

		if (titleEl?.textContent?.trim()) {
			const label = titleEl.textContent.trim()
			const description = descEl?.textContent?.trim() || null

			// Generate ID from label
			const id = label
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.replace(/\s+/g, '_')

			badges.push({ id, label, description })
		}
	}

	return badges
}

/**
 * Extracts seller information from the page
 * Uses the seller card structure from Vinted pages
 */
export function extractSeller(): VintedSeller {
	const seller: VintedSeller = {
		username: 'Unknown',
		profileUrl: null,
		avatarUrl: null,
		rating: null,
		ratingCount: null,
		salesCount: 0,
		responseTime: null,
		lastSeen: null,
		location: null,
		badges: [],
		// Extended fields - initially null/unknown
		activeListings: null,
		memberSince: null,
		followers: null,
		verifiedProfile: false,
		reliability: 'unknown',
	}

	// Find the seller card container
	const sellerCard = document.querySelector('.web_ui__Card__card')

	// Extract from seller link (contains avatar, username, rating)
	const sellerLink = sellerCard?.querySelector('a[href*="/member/"]') as HTMLAnchorElement | null
	if (sellerLink) {
		seller.profileUrl = sellerLink.href

		// Extract avatar URL
		const avatarImg = sellerLink.querySelector('img.web_ui__Image__content') as HTMLImageElement | null
		if (avatarImg?.src) {
			seller.avatarUrl = avatarImg.src
		}

		// Extract username from data-testid="profile-username"
		const usernameEl = sellerLink.querySelector('[data-testid="profile-username"]')
		if (usernameEl?.textContent?.trim()) {
			seller.username = usernameEl.textContent.trim()
		}

		// Extract rating from aria-label (e.g., "Le membre est noté 5 sur 5")
		const ratingContainer = sellerLink.querySelector('.web_ui__Rating__rating')
		if (ratingContainer) {
			const ariaLabel = ratingContainer.getAttribute('aria-label') || ''
			const ratingMatch = ariaLabel.match(/noté\s*(\d+(?:[.,]\d+)?)\s*sur\s*(\d+)/i)
			if (ratingMatch?.[1]) {
				seller.rating = Number.parseFloat(ratingMatch[1].replace(',', '.'))
			}

			// Also try to get rating from the label text
			const ratingLabel = ratingContainer.querySelector('.web_ui__Rating__label span')
			if (ratingLabel?.textContent?.trim()) {
				const labelRating = Number.parseFloat(ratingLabel.textContent.trim().replace(',', '.'))
				if (!Number.isNaN(labelRating)) {
					seller.rating = labelRating
				}
			}
		}
	}

	// Fallback: try legacy selectors for username
	if (seller.username === 'Unknown') {
		const usernameSelectors = [
			'[data-testid="seller-username"]',
			'[data-testid="profile-username"]',
			'.user-info__name a',
		]
		for (const selector of usernameSelectors) {
			const element = document.querySelector(selector)
			if (element?.textContent?.trim()) {
				seller.username = element.textContent.trim()
				break
			}
		}
	}

	// Extract badges
	seller.badges = extractSellerBadges()

	// Extract location and last seen from seller card cells
	if (sellerCard) {
		const cells = sellerCard.querySelectorAll('.web_ui__Cell__cell')
		for (const cell of cells) {
			const cellText = cell.textContent || ''

			// Location (has location icon SVG with pin path)
			const locationIcon = cell.querySelector('svg path[d*="M8 0a6.5"]')
			if (locationIcon) {
				// Get the text after the icon
				const locationDiv = cell.querySelector('.web_ui__Cell__body div:not(.web_ui__Spacer__regular)')
				if (locationDiv?.textContent?.trim()) {
					seller.location = locationDiv.textContent.trim()
				}
			}

			// Last seen (has clock icon)
			const clockIcon = cell.querySelector('svg path[d*="M8 0a8 8 0 1 0"]')
			if (clockIcon) {
				const lastSeenMatch = cellText.match(/(?:vu|dernière fois|connecté)[^:]*:\s*(.+)/i)
				if (lastSeenMatch?.[1]) {
					seller.lastSeen = lastSeenMatch[1].trim()
				} else {
					// Try to find any time-related text in the cell
					const timeDiv = cell.querySelector('.web_ui__Cell__body div span, .web_ui__Cell__body > div')
					if (timeDiv?.textContent?.trim()) {
						seller.lastSeen = timeDiv.textContent.trim()
					}
				}
			}
		}
	}

	// Extract sales count from various sources
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

	// Try to extract from page text if not found
	if (seller.salesCount === 0 && sellerCard) {
		const cardText = sellerCard.textContent || ''
		const salesMatch = cardText.match(/(\d+)\s*vente/i)
		if (salesMatch?.[1]) {
			seller.salesCount = Number.parseInt(salesMatch[1], 10)
		}
	}

	// Extract response time
	if (sellerCard) {
		const cardText = sellerCard.textContent || ''
		const responseMatch = cardText.match(/répond\s*(en|sous)\s*(.+?)(?:\.|$)/i)
		if (responseMatch?.[2]) {
			seller.responseTime = responseMatch[2].trim()
		}
	}

	// Calculate initial reliability based on article page data
	seller.reliability = calculateSellerReliability(seller)

	return seller
}

/**
 * Merges fetched profile data into seller object and recalculates reliability
 * @param seller Base seller data from article page
 * @param profileData Extended data from profile page fetch
 * @returns Merged seller with updated reliability
 */
export function mergeSellerWithProfile(
	seller: VintedSeller,
	profileData: SellerProfileData | null
): VintedSeller {
	if (!profileData) {
		return seller
	}

	const merged: VintedSeller = {
		...seller,
		// Prefer profile data when available
		rating: profileData.rating ?? seller.rating,
		ratingCount: profileData.ratingCount ?? seller.ratingCount,
		activeListings: profileData.activeListings,
		memberSince: profileData.memberSince,
		followers: profileData.followers,
		verifiedProfile: profileData.verifiedProfile,
		// Keep existing fields from article page
		profileUrl: seller.profileUrl,
		avatarUrl: seller.avatarUrl,
		location: seller.location,
		badges: seller.badges,
	}

	// Recalculate reliability with enriched data
	merged.reliability = calculateSellerReliability(merged)

	console.log('[Vinted AI] Seller data merged, reliability:', merged.reliability)

	return merged
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
