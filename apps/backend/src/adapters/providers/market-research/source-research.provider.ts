import PQueue from 'p-queue'
import { inject, injectable } from 'inversify'
import { TYPES } from '../../../application/di-types'
import type {
	EnrichedSource,
	ISourceResearchProvider,
	IScraper,
	ScrapedListing,
	SourceResearchInput,
	SourceResearchResult,
} from '../../../application/interfaces/providers/source-research.provider.interface'
import { AIMatcherProvider } from './ai-matcher.provider'
import { ImageAnalyzerProvider } from './image-analyzer.provider'
import { EbayScraper } from './scrapers/ebay.scraper'
import { GoogleShoppingScraper } from './scrapers/google-shopping.scraper'
import { LeboncoinScraper } from './scrapers/leboncoin.scraper'
import { VestiaireScraper } from './scrapers/vestiaire.scraper'
import { VintedScraper } from './scrapers/vinted.scraper'

/**
 * Platform display names
 */
const PLATFORM_NAMES: Record<string, string> = {
	vinted: 'Vinted',
	vestiaire: 'Vestiaire Collective',
	ebay: 'eBay',
	leboncoin: 'Leboncoin',
	google_shopping: 'Google Shopping',
}

/**
 * Source Research Provider - Orchestrates the full market research pipeline
 *
 * Flow:
 * 1. Analyze images with AI to extract features and generate search queries
 * 2. Search multiple platforms in parallel (with rate limiting)
 * 3. Verify matches with AI
 * 4. Aggregate and calculate market prices
 */
@injectable()
export class SourceResearchProvider implements ISourceResearchProvider {
	private readonly scrapers: IScraper[]
	private readonly imageAnalyzer: ImageAnalyzerProvider
	private readonly aiMatcher: AIMatcherProvider
	private readonly queue: PQueue

	constructor() {
		// Initialize scrapers
		this.scrapers = [
			new VintedScraper(),
			new EbayScraper(),
			new VestiaireScraper(),
			new LeboncoinScraper(),
			new GoogleShoppingScraper(),
		]

		this.imageAnalyzer = new ImageAnalyzerProvider()
		this.aiMatcher = new AIMatcherProvider()

		// Rate limiting: max 3 concurrent requests, 500ms between
		this.queue = new PQueue({ concurrency: 3, interval: 500, intervalCap: 3 })
	}

	/**
	 * Execute full source research pipeline
	 */
	async research(input: SourceResearchInput): Promise<SourceResearchResult> {
		// Step 1: Analyze images to get features and search queries
		const imageAnalysis = await this.imageAnalyzer.analyzeImages(input.photos, {
			title: input.title,
			brand: input.brand,
		})

		// Step 2: Search all platforms in parallel
		const searchPromises = this.scrapers.map((scraper) =>
			this.queue.add(async () => {
				try {
					const listings = await scraper.search(imageAnalysis.searchQueries.primary, {
						maxResults: 20,
					})
					return { platform: scraper.platform, listings }
				} catch {
					return { platform: scraper.platform, listings: [] }
				}
			})
		)

		const searchResults = await Promise.all(searchPromises)
		const allListings = searchResults.flatMap((r) => r?.listings ?? [])

		// Step 3: Verify matches with AI
		const verifiedListings = await this.aiMatcher.verifyMatches(allListings, {
			title: input.title,
			brand: input.brand ?? imageAnalysis.brand,
			condition: input.condition,
			imageAnalysis,
		})

		// Filter to keep only good matches (confidence >= 50)
		const matchedListings = verifiedListings.filter(
			(l) => l.verification.isMatch && l.verification.confidence >= 50
		)

		// Step 4: Aggregate by platform and calculate prices
		const sources = this.aggregateSources(matchedListings, imageAnalysis.searchQueries.primary)

		// Calculate overall market price
		const marketPrice = this.calculateMarketPrice(matchedListings, input.price)

		// Find retail price from Google Shopping
		const retailPrice = await this.findRetailPrice(imageAnalysis)

		return {
			marketPrice,
			sources,
			retailPrice,
			totalListingsAnalyzed: allListings.length,
			matchedListings: matchedListings.length,
			imageAnalysis,
		}
	}

	/**
	 * Aggregate listings by platform
	 */
	private aggregateSources(
		listings: Array<ScrapedListing & { verification: { confidence: number } }>,
		searchQuery: string
	): EnrichedSource[] {
		const platformMap = new Map<string, ScrapedListing[]>()

		for (const listing of listings) {
			const platformListings = platformMap.get(listing.platform) ?? []
			platformListings.push(listing)
			platformMap.set(listing.platform, platformListings)
		}

		const sources: EnrichedSource[] = []

		for (const [platform, platformListings] of platformMap) {
			if (platformListings.length === 0) continue

			const prices = platformListings.map((l) => l.price)
			const averagePrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
			const minPrice = Math.min(...prices)
			const maxPrice = Math.max(...prices)

			// Get top 3 listings by relevance
			const topListings = platformListings
				.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
				.slice(0, 3)

			// Build search URL for the platform
			const searchUrl = this.getSearchUrl(platform, searchQuery)

			sources.push({
				name: PLATFORM_NAMES[platform] ?? platform,
				price: averagePrice,
				url: searchUrl,
				count: platformListings.length,
				listings: topListings,
				averagePrice,
				priceRange: {
					min: minPrice,
					max: maxPrice,
				},
			})
		}

		// Sort by listing count (most listings first)
		return sources.sort((a, b) => b.count - a.count)
	}

	/**
	 * Calculate overall market price from matched listings
	 */
	private calculateMarketPrice(
		listings: ScrapedListing[],
		currentPrice: number
	): SourceResearchResult['marketPrice'] {
		if (listings.length === 0) {
			// Fallback: estimate based on current price
			return {
				low: Math.round(currentPrice * 0.8),
				high: Math.round(currentPrice * 1.4),
				average: Math.round(currentPrice * 1.1),
				confidence: 'low',
			}
		}

		const prices = listings.map((l) => l.price).sort((a, b) => a - b)

		// Safety check
		if (prices.length === 0) {
			return {
				low: Math.round(currentPrice * 0.8),
				high: Math.round(currentPrice * 1.4),
				average: Math.round(currentPrice * 1.1),
				confidence: 'low',
			}
		}

		// Remove outliers (bottom and top 10%)
		const trimStart = Math.floor(prices.length * 0.1)
		const trimEnd = Math.ceil(prices.length * 0.9)
		const trimmedPrices = prices.slice(trimStart, trimEnd || 1)

		const average = Math.round(trimmedPrices.reduce((a, b) => a + b, 0) / trimmedPrices.length)
		const low = Math.round(prices[0] ?? currentPrice * 0.8)
		const high = Math.round(prices[prices.length - 1] ?? currentPrice * 1.4)

		// Determine confidence based on number of listings
		let confidence: 'low' | 'medium' | 'high'
		if (listings.length >= 10) {
			confidence = 'high'
		} else if (listings.length >= 5) {
			confidence = 'medium'
		} else {
			confidence = 'low'
		}

		return { low, high, average, confidence }
	}

	/**
	 * Find retail price from Google Shopping
	 */
	private async findRetailPrice(imageAnalysis: {
		brand: string | null
		searchQueries: { primary: string }
		estimatedRetailPrice?: number
	}): Promise<SourceResearchResult['retailPrice'] | undefined> {
		// If we have an estimated retail price from AI
		if (imageAnalysis.estimatedRetailPrice && imageAnalysis.brand) {
			const googleScraper = new GoogleShoppingScraper()
			const searchUrl = googleScraper.getSearchUrl(`${imageAnalysis.brand} ${imageAnalysis.searchQueries.primary} neuf`)

			return {
				price: imageAnalysis.estimatedRetailPrice,
				url: searchUrl,
				brand: imageAnalysis.brand,
			}
		}

		// Try to find from Google Shopping
		try {
			const googleScraper = new GoogleShoppingScraper()
			const retailListings = await googleScraper.searchRetailPrice(imageAnalysis.searchQueries.primary)

			if (retailListings.length > 0) {
				// Get median price from retail listings
				const prices = retailListings.map((l) => l.price).sort((a, b) => a - b)
				const medianPrice = prices[Math.floor(prices.length / 2)] ?? prices[0] ?? 0
				const firstListing = retailListings[0]

				if (medianPrice > 0 && firstListing) {
					return {
						price: medianPrice,
						url: firstListing.url,
						brand: imageAnalysis.brand ?? 'Marque',
					}
				}
			}
		} catch {
			// Failed to find retail price - not critical
		}

		return undefined
	}

	/**
	 * Get search URL for a platform
	 */
	private getSearchUrl(platform: string, query: string): string {
		const encodedQuery = encodeURIComponent(query)

		switch (platform) {
			case 'vinted':
				return `https://www.vinted.fr/catalog?search_text=${encodedQuery}`
			case 'vestiaire':
				return `https://www.vestiairecollective.com/search/?q=${encodedQuery}`
			case 'ebay':
				return `https://www.ebay.fr/sch/i.html?_nkw=${encodedQuery}`
			case 'leboncoin':
				return `https://www.leboncoin.fr/recherche?text=${encodedQuery}`
			case 'google_shopping':
				return `https://www.google.fr/search?tbm=shop&q=${encodedQuery}`
			default:
				return ''
		}
	}

	/**
	 * Check if the provider is available
	 */
	async isAvailable(): Promise<boolean> {
		// Provider is available if at least one scraper works
		const availabilityChecks = await Promise.all(this.scrapers.map((s) => s.isAvailable()))
		return availabilityChecks.some((available) => available)
	}
}
