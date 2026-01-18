/**
 * Article data extraction utilities for Vinted pages
 */

import { extractJsonLd } from './json-ld-parser'
import { parseRelativeDate } from './date-utils'

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
