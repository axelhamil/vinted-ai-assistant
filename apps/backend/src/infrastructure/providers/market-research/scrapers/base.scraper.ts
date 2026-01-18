import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'
import type {
	IScraper,
	Platform,
	ScrapedListing,
	SearchOptions,
} from '../../../../application/interfaces/providers/source-research.provider.interface'

/**
 * Default headers for web requests
 */
const DEFAULT_HEADERS: Record<string, string> = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
	'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
	'Accept-Encoding': 'gzip, deflate, br',
	Connection: 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'Cache-Control': 'max-age=0',
}

/**
 * Cache entry for scraped results
 */
interface CacheEntry {
	data: ScrapedListing[]
	timestamp: number
}

/**
 * Abstract base class for platform scrapers
 * Provides common functionality for fetching, parsing, and caching
 */
export abstract class BaseScraper implements IScraper {
	abstract readonly platform: Platform
	protected abstract readonly baseUrl: string

	/** Cache duration in milliseconds (1 hour) */
	private readonly cacheDuration = 60 * 60 * 1000
	private readonly cache = new Map<string, CacheEntry>()

	/**
	 * Build search URL for the platform
	 */
	protected abstract buildSearchUrl(query: string, options?: SearchOptions): string

	/**
	 * Parse HTML response into listings
	 */
	protected abstract parseListings($: CheerioAPI): ScrapedListing[]

	/**
	 * Search for listings on the platform
	 */
	async search(query: string, options?: SearchOptions): Promise<ScrapedListing[]> {
		const cacheKey = this.getCacheKey(query, options)

		// Check cache
		const cached = this.cache.get(cacheKey)
		if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
			return cached.data
		}

		try {
			const url = this.buildSearchUrl(query, options)

			const html = await this.fetchPage(url)
			const $ = cheerio.load(html)
			let listings = this.parseListings($)

			// Apply filters
			if (options?.minPrice) {
				listings = listings.filter((l) => l.price >= (options.minPrice ?? 0))
			}
			if (options?.maxPrice) {
				listings = listings.filter((l) => l.price <= (options.maxPrice ?? Number.POSITIVE_INFINITY))
			}
			if (options?.maxResults) {
				listings = listings.slice(0, options.maxResults)
			}

			// Update cache
			this.cache.set(cacheKey, {
				data: listings,
				timestamp: Date.now(),
			})

			return listings
		} catch {
			return []
		}
	}

	/**
	 * Check if scraper is available (can make requests)
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const response = await fetch(this.baseUrl, {
				method: 'HEAD',
				headers: DEFAULT_HEADERS,
			})
			return response.ok
		} catch {
			return false
		}
	}

	/**
	 * Fetch a page with proper headers
	 */
	protected async fetchPage(url: string, additionalHeaders?: Record<string, string>): Promise<string> {
		const response = await fetch(url, {
			headers: {
				...DEFAULT_HEADERS,
				...additionalHeaders,
				Referer: this.baseUrl,
			},
		})

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		return response.text()
	}

	/**
	 * Generate cache key
	 */
	private getCacheKey(query: string, options?: SearchOptions): string {
		return `${this.platform}:${query}:${JSON.stringify(options ?? {})}`
	}

	/**
	 * Parse price from text (handles various formats)
	 */
	protected parsePrice(text: string): number {
		// Remove currency symbols and normalize
		const cleaned = text
			.replace(/[€$£]/g, '')
			.replace(/\s/g, '')
			.replace(',', '.')
			.trim()

		const match = cleaned.match(/[\d.]+/)
		return match ? Number.parseFloat(match[0]) : 0
	}

	/**
	 * Clean text (remove extra whitespace)
	 */
	protected cleanText(text: string): string {
		return text.replace(/\s+/g, ' ').trim()
	}

	/**
	 * Build absolute URL from relative path
	 */
	protected absoluteUrl(path: string): string {
		if (path.startsWith('http')) {
			return path
		}
		return new URL(path, this.baseUrl).toString()
	}
}
