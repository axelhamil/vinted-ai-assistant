import type { CheerioAPI } from 'cheerio'
import type {
	Platform,
	ScrapedListing,
	SearchOptions,
} from '../../../../application/interfaces/providers/source-research.provider.interface'
import { BaseScraper } from './base.scraper'

/**
 * eBay France scraper implementation
 */
export class EbayScraper extends BaseScraper {
	readonly platform: Platform = 'ebay'
	protected readonly baseUrl = 'https://www.ebay.fr'

	/**
	 * Build eBay search URL
	 */
	protected buildSearchUrl(query: string, options?: SearchOptions): string {
		const params = new URLSearchParams({
			_nkw: query,
			_sop: '12', // Sort by best match
			LH_BIN: '1', // Buy It Now only
		})

		if (options?.minPrice) {
			params.set('_udlo', options.minPrice.toString())
		}
		if (options?.maxPrice) {
			params.set('_udhi', options.maxPrice.toString())
		}

		return `${this.baseUrl}/sch/i.html?${params.toString()}`
	}

	/**
	 * Parse eBay search results
	 */
	protected parseListings($: CheerioAPI): ScrapedListing[] {
		const listings: ScrapedListing[] = []

		// eBay selectors
		const selectors = ['.s-item', '.srp-results .s-item__wrapper', '[data-testid="s-item"]']

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

				// Skip placeholder items
				if ($item.hasClass('s-item__pl-on-bottom')) return

				// Get title
				const title =
					$item.find('.s-item__title, [data-testid="item-title"]').text() ||
					$item.find('h3').text() ||
					$item.find('a').attr('title') ||
					''

				if (!title || title.includes('Shop on eBay')) return

				// Get price
				const priceText = $item.find('.s-item__price, [data-testid="item-price"]').first().text()
				const price = this.parsePrice(priceText)
				if (price <= 0) return

				// Get URL
				const url = $item.find('.s-item__link, a').first().attr('href') || ''
				if (!url || !url.includes('ebay')) return

				// Get image
				const imageUrl =
					$item.find('.s-item__image-wrapper img, img').attr('src') ||
					$item.find('img').attr('data-src')

				// Get condition
				const condition = $item.find('.s-item__subtitle, .SECONDARY_INFO').text()

				// Get seller info
				const sellerName = $item.find('.s-item__seller-info-text').text()
				const sellerRatingText = $item.find('.s-item__seller-info .POSITIVE').text()
				const sellerRating = sellerRatingText
					? Number.parseFloat(sellerRatingText.replace('%', ''))
					: undefined

				listings.push({
					platform: this.platform,
					title: this.cleanText(title),
					price,
					currency: 'EUR',
					url,
					imageUrl: imageUrl || undefined,
					condition: condition ? this.cleanText(condition) : undefined,
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
