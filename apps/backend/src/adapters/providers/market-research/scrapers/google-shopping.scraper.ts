import type { CheerioAPI } from 'cheerio'
import type {
	Platform,
	ScrapedListing,
	SearchOptions,
} from '../../../../application/interfaces/providers/source-research.provider.interface'
import { BaseScraper } from './base.scraper'

/**
 * Google Shopping scraper implementation
 * Used primarily for finding retail/new prices
 */
export class GoogleShoppingScraper extends BaseScraper {
	readonly platform: Platform = 'google_shopping'
	protected readonly baseUrl = 'https://www.google.fr'

	/**
	 * Build Google Shopping search URL
	 */
	protected buildSearchUrl(query: string, options?: SearchOptions): string {
		const params = new URLSearchParams({
			q: query,
			tbm: 'shop', // Shopping tab
			hl: 'fr',
			gl: 'fr',
		})

		if (options?.minPrice) {
			params.set('tbs', `mr:1,price:1,ppr_min:${options.minPrice}`)
		}
		if (options?.maxPrice) {
			const min = options?.minPrice ?? 0
			params.set('tbs', `mr:1,price:1,ppr_min:${min},ppr_max:${options.maxPrice}`)
		}

		return `${this.baseUrl}/search?${params.toString()}`
	}

	/**
	 * Parse Google Shopping search results
	 */
	protected parseListings($: CheerioAPI): ScrapedListing[] {
		const listings: ScrapedListing[] = []

		// Google Shopping uses various containers
		const selectors = ['.sh-dgr__content', '.sh-dlr__list-result', '.sh-np__click-target', '[data-docid]']

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
					$item.find('.tAxDx, .Xjkr3b, h3').text() ||
					$item.find('[data-sh-item-title]').text() ||
					$item.find('a').first().text()

				if (!title) return

				// Get price
				const priceText =
					$item.find('.a8Pemb, .kHxwFf, [data-sh-item-price]').text() ||
					$item.find('span[aria-label*="€"]').text() ||
					$item.find('b').first().text()

				const price = this.parsePrice(priceText)
				if (price <= 0) return

				// Get URL
				const relativeUrl = $item.find('a').first().attr('href') || ''

				// Get image
				const imageUrl =
					$item.find('img').attr('src') ||
					$item.find('img').attr('data-src') ||
					$item.find('.ArOc1c img').attr('src')

				// Get merchant/seller
				const merchantName =
					$item.find('.aULzUe, .IuHnof, [data-sh-item-seller]').text() || $item.find('.merchant').text()

				listings.push({
					platform: this.platform,
					title: this.cleanText(title),
					price,
					currency: 'EUR',
					url: relativeUrl.startsWith('/') ? this.absoluteUrl(relativeUrl) : relativeUrl || '',
					imageUrl: imageUrl || undefined,
					seller: merchantName
						? {
								name: this.cleanText(merchantName),
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

	/**
	 * Search specifically for retail prices (new items)
	 */
	async searchRetailPrice(query: string): Promise<ScrapedListing[]> {
		// Add "neuf" to prioritize new items
		const retailQuery = `${query} neuf`
		return this.search(retailQuery, { maxResults: 5 })
	}
}
