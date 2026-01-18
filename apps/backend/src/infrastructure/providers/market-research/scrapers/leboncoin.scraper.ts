import type { CheerioAPI } from 'cheerio'
import type {
	Platform,
	ScrapedListing,
	SearchOptions,
} from '../../../../application/interfaces/providers/source-research.provider.interface'
import { BaseScraper } from './base.scraper'

/**
 * Leboncoin scraper implementation
 * Note: Leboncoin has strict anti-bot measures, this scraper may have limited success
 */
export class LeboncoinScraper extends BaseScraper {
	readonly platform: Platform = 'leboncoin'
	protected readonly baseUrl = 'https://www.leboncoin.fr'

	/**
	 * Build Leboncoin search URL
	 */
	protected buildSearchUrl(query: string, options?: SearchOptions): string {
		const params = new URLSearchParams({
			text: query,
			sort: 'relevance',
		})

		if (options?.minPrice) {
			params.set('price_min', options.minPrice.toString())
		}
		if (options?.maxPrice) {
			params.set('price_max', options.maxPrice.toString())
		}

		return `${this.baseUrl}/recherche?${params.toString()}`
	}

	/**
	 * Parse Leboncoin search results
	 * Note: Leboncoin uses heavy JS rendering, scraping may return limited results
	 */
	protected parseListings($: CheerioAPI): ScrapedListing[] {
		const listings: ScrapedListing[] = []

		// Leboncoin selectors - these may change frequently
		const selectors = ['[data-qa-id="aditem_container"]', '.styles_adCard__', 'article.styles_classified__']

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
					$item.find('[data-qa-id="aditem_title"], .styles_title__').text() ||
					$item.find('h2, h3').first().text()

				if (!title) return

				// Get price
				const priceText =
					$item.find('[data-qa-id="aditem_price"], .styles_price__').text() ||
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
					$item.find('[data-qa-id="aditem_image"] img').attr('src')

				// Get location
				const location = $item.find('[data-qa-id="aditem_location"]').text()

				listings.push({
					platform: this.platform,
					title: this.cleanText(title),
					price,
					currency: 'EUR',
					url: this.absoluteUrl(relativeUrl),
					imageUrl: imageUrl || undefined,
					condition: location ? this.cleanText(location) : undefined,
				})
			} catch (error) {
				console.error('[Leboncoin] Failed to parse item:', error)
			}
		})

		return listings
	}

	/**
	 * Check availability - Leboncoin may block requests
	 */
	async isAvailable(): Promise<boolean> {
		// Leboncoin has strict anti-bot, we return true but scraping may fail
		return true
	}

	/**
	 * Get search URL for user reference
	 */
	getSearchUrl(query: string): string {
		return this.buildSearchUrl(query)
	}
}
