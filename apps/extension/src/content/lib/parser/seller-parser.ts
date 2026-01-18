/**
 * Seller data extraction utilities for Vinted pages
 */

import type { SellerBadge, VintedSeller } from '@vinted-ai/shared/article'
import type { SellerProfileData } from './profile-fetcher'

/**
 * Calculates seller reliability based on available data
 */
export function calculateSellerReliability(seller: VintedSeller): VintedSeller['reliability'] {
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

	return merged
}
