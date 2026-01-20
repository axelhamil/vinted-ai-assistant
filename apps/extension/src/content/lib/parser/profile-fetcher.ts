/**
 * Seller profile fetching utilities
 */

/**
 * Extended seller profile data fetched from profile page
 */
export interface SellerProfileData {
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
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
			},
		})

		clearTimeout(timeoutId)

		if (!response.ok) {
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
				profileData.memberSince = yearMatch ? (yearMatch[1] ?? null) : text
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
		const hasPhoto = !!doc.querySelector(
			'[data-testid="user-photo"] img, .user-photo img, .profile-image img'
		)
		const hasBio = !!doc
			.querySelector('[data-testid="user-description"], .user-description')
			?.textContent?.trim()
		profileData.verifiedProfile = hasPhoto && hasBio

		return profileData
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			// Timeout - not critical
		}
		return null
	}
}
