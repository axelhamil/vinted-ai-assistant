/**
 * Market Research Module
 *
 * Provides intelligent source research for market price estimation:
 * - Image analysis for feature extraction
 * - Multi-platform scraping (Vinted, eBay, Vestiaire, Leboncoin, Google Shopping)
 * - AI-powered listing matching
 * - Price aggregation and confidence scoring
 */

// Main provider
export { SourceResearchProvider } from './source-research.provider'

// Sub-providers
export { ImageAnalyzerProvider } from './image-analyzer.provider'
export { AIMatcherProvider } from './ai-matcher.provider'

// Scrapers
export { BaseScraper } from './scrapers/base.scraper'
export { VintedScraper } from './scrapers/vinted.scraper'
export { VestiaireScraper } from './scrapers/vestiaire.scraper'
export { EbayScraper } from './scrapers/ebay.scraper'
export { LeboncoinScraper } from './scrapers/leboncoin.scraper'
export { GoogleShoppingScraper } from './scrapers/google-shopping.scraper'
