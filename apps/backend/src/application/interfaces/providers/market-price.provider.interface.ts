import type { MarketPrice } from '@vinted-ai/shared'

/**
 * Input for market price lookup
 */
export interface MarketPriceLookupInput {
	title: string
	brand: string | null
	size: string | null
	condition: string
	photoUrls: string[]
}

/**
 * Market Price Provider interface (port)
 * Defines the contract for fetching market price data
 */
export interface IMarketPriceProvider {
	/**
	 * Lookup market price for an article
	 */
	lookup(input: MarketPriceLookupInput): Promise<MarketPrice>

	/**
	 * Get the provider name (e.g., "google-lens", "database", "llm-estimation")
	 */
	getProviderName(): string

	/**
	 * Check if the provider is available and configured
	 */
	isAvailable(): Promise<boolean>
}
