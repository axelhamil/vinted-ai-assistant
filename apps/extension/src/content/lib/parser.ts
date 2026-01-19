/**
 * Vinted page parser - Main entry point
 * Provides high-level parsing functions that orchestrate the modular components
 */

import type { VintedArticleData } from '@vinted-ai/shared/article'
import {
	extractVintedId,
	extractTitle,
	extractPrice,
	extractDescription,
	extractBrand,
	extractSize,
	extractCondition,
	extractListedAt,
	extractViews,
	extractFavorites,
} from './parser/article-parser'
import { extractSeller, mergeSellerWithProfile } from './parser/seller-parser'
import { extractPhotos } from './parser/photo-parser'
import { detectLanguage } from './parser/language-detector'
import { fetchSellerProfile } from './parser/profile-fetcher'

// Re-export utilities for external use
export { detectLanguage, fetchSellerProfile, mergeSellerWithProfile }

/**
 * Main function to parse all article data from the page
 */
export function parseVintedArticle(): VintedArticleData | null {
	const vintedId = extractVintedId()

	if (!vintedId) {
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
