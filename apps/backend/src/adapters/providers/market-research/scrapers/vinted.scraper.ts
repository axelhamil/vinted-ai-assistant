import type { CheerioAPI } from 'cheerio'
import type {
	Platform,
	ScrapedListing,
	SearchOptions,
} from '../../../../application/interfaces/providers/source-research.provider.interface'
import { BaseScraper } from './base.scraper'

/**
 * Vinted scraper implementation
 * Scrapes listings from Vinted France
 */
export class VintedScraper extends BaseScraper {
	readonly platform: Platform = 'vinted'
	protected readonly baseUrl = 'https://www.vinted.fr'

	/**
	 * Build Vinted search URL
	 */
	protected buildSearchUrl(query: string, options?: SearchOptions): string {
		const params = new URLSearchParams({
			search_text: query,
			order: 'relevance',
		})

		if (options?.minPrice) {
			params.set('price_from', options.minPrice.toString())
		}
		if (options?.maxPrice) {
			params.set('price_to', options.maxPrice.toString())
		}

		return `${this.baseUrl}/catalog?${params.toString()}`
	}

	/**
	 * Parse Vinted search results
	 */
	protected parseListings($: CheerioAPI): ScrapedListing[] {
		const listings: ScrapedListing[] = []

		// Vinted uses multiple possible selectors
		const selectors = [
			'.feed-grid__item',
			'[data-testid="grid-item"]',
			'.ItemBox_container__',
			'.new-item-box__container',
		]

		let items: ReturnType<CheerioAPI> | null = null
		for (const selector of selectors) {
			const found = $(selector)
			if (found.length > 0) {
				items = found
				break
			}
		}

		if (!items) return listings

		items.each((_, element) => {
			try {
				const $item = $(element)

				// Get title
				const title =
					$item.find('.new-item-box__title, [data-testid="item-title"], .ItemBox_title__').text() ||
					$item.find('a').attr('title') ||
					$item.find('img').attr('alt') ||
					''

				if (!title) return

				// Get price
				const priceText =
					$item.find('.new-item-box__price, [data-testid="item-price"], .ItemBox_price__').text() ||
					$item.find('[class*="price"]').first().text()

				const price = this.parsePrice(priceText)
				if (price <= 0) return

				// Get URL
				const relativeUrl = $item.find('a').first().attr('href') || ''
				if (!relativeUrl) return

				// Get image
				const imageUrl =
					$item.find('img').attr('src') ||
					$item.find('img').attr('data-src') ||
					$item.find('[style*="background-image"]').attr('style')?.match(/url\(['"]?([^'"]+)['"]?\)/)?.[1]

				// Get seller info if available
				const sellerName = $item.find('.new-item-box__owner, [data-testid="seller-name"]').text()
				const sellerRatingText = $item.find('[class*="rating"]').text()
				const sellerRating = sellerRatingText ? Number.parseFloat(sellerRatingText) : undefined

				listings.push({
					platform: this.platform,
					title: this.cleanText(title),
					price,
					currency: 'EUR',
					url: this.absoluteUrl(relativeUrl),
					imageUrl: imageUrl || undefined,
					seller: sellerName
						? {
								name: this.cleanText(sellerName),
								rating: sellerRating,
							}
						: undefined,
				})
			} catch {
				// Skip malformed items
			}
		})

		return listings
	}

	/**
	 * Get search URL for user reference
	 */
	getSearchUrl(query: string): string {
		return this.buildSearchUrl(query)
	}
}
