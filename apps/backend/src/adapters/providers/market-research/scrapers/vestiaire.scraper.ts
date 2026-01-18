import type { CheerioAPI } from 'cheerio'
import type {
	Platform,
	ScrapedListing,
	SearchOptions,
} from '../../../../application/interfaces/providers/source-research.provider.interface'
import { BaseScraper } from './base.scraper'

/**
 * Vestiaire Collective scraper implementation
 * Better for luxury/designer items
 */
export class VestiaireScraper extends BaseScraper {
	readonly platform: Platform = 'vestiaire'
	protected readonly baseUrl = 'https://www.vestiairecollective.com'

	/**
	 * Build Vestiaire Collective search URL
	 */
	protected buildSearchUrl(query: string, options?: SearchOptions): string {
		const params = new URLSearchParams({
			q: query,
		})

		if (options?.minPrice) {
			params.set('priceMin', options.minPrice.toString())
		}
		if (options?.maxPrice) {
			params.set('priceMax', options.maxPrice.toString())
		}

		return `${this.baseUrl}/search/?${params.toString()}`
	}

	/**
	 * Parse Vestiaire Collective search results
	 */
	protected parseListings($: CheerioAPI): ScrapedListing[] {
		const listings: ScrapedListing[] = []

		// Vestiaire uses various selectors
		const selectors = [
			'.product-card',
			'[data-testid="product-card"]',
			'.catalog-product-item',
			'.ProductCard_container__',
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
				const brand = $item.find('.product-card__brand, [data-testid="product-brand"]').text()
				const name = $item.find('.product-card__name, [data-testid="product-name"]').text()
				const title = brand && name ? `${brand} ${name}` : brand || name

				if (!title) return

				// Get price
				const priceText = $item.find('.product-card__price, [data-testid="product-price"]').text()
				const price = this.parsePrice(priceText)
				if (price <= 0) return

				// Get URL
				const relativeUrl = $item.find('a').first().attr('href') || ''
				if (!relativeUrl) return

				// Get image
				const imageUrl = $item.find('img').attr('src') || $item.find('img').attr('data-src')

				// Get condition if available
				const condition = $item.find('.product-card__condition, [data-testid="product-condition"]').text()

				listings.push({
					platform: this.platform,
					title: this.cleanText(title),
					price,
					currency: 'EUR',
					url: this.absoluteUrl(relativeUrl),
					imageUrl: imageUrl || undefined,
					condition: condition ? this.cleanText(condition) : undefined,
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
