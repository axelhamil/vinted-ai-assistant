import { createId } from '@paralleldrive/cuid2'
import type { MarketPrice, Resale } from '@vinted-ai/shared'
import { inject, injectable } from 'inversify'
import { TYPES } from '../../container/types'
import { AnalysisEntity, type AnalysisProps } from '../../domain/entities/analysis.entity'
import { type AnalysisResponseDTO, toAnalysisResponseDTO } from '../dtos/analysis.dto'
import { type ArticleInputDTO, calculateDaysListed, toVintedArticleData } from '../dtos/article.dto'
import type { IAIProvider } from '../interfaces/providers/ai.provider.interface'
import type { IAnalysisRepository } from '../interfaces/repositories/analysis.repository.interface'

/**
 * Use case for analyzing a Vinted article
 * Orchestrates: photo analysis → opportunity scoring → negotiation generation → save
 */
@injectable()
export class AnalyzeArticleUseCase {
	constructor(
		@inject(TYPES.AIProvider) private readonly aiProvider: IAIProvider,
		@inject(TYPES.AnalysisRepository) private readonly repository: IAnalysisRepository
	) {}

	/**
	 * Execute the analysis pipeline for an article
	 * @param input - Article data from the extension
	 * @returns Complete analysis result
	 */
	async execute(input: ArticleInputDTO): Promise<AnalysisResponseDTO> {
		// Check if we already have a cached analysis
		const existingAnalysis = await this.repository.findByVintedId(input.vintedId)
		if (existingAnalysis && !existingAnalysis.isCacheExpired()) {
			return toAnalysisResponseDTO(existingAnalysis)
		}

		// Convert input to domain format
		const articleData = toVintedArticleData(input)
		const daysListed = calculateDaysListed(articleData.listedAt)

		// Step 1: Analyze photos (quality + authenticity)
		const photoAnalysisResult = await this.aiProvider.analyzePhotos({
			photoUrls: articleData.photos,
			title: articleData.title,
			brand: articleData.brand,
			condition: articleData.condition,
			price: articleData.price,
		})

		// Step 2: Estimate market price (for now, using AI-based estimation)
		const marketPrice = this.estimateMarketPrice(
			articleData.price,
			photoAnalysisResult.detectedBrand
		)

		// Step 3: Score opportunity
		const opportunity = await this.aiProvider.scoreOpportunity({
			price: articleData.price,
			marketPriceLow: marketPrice.low,
			marketPriceHigh: marketPrice.high,
			marketPriceAvg: marketPrice.average,
			photoQualityScore: photoAnalysisResult.photoQuality.score,
			daysListed,
			sellerSalesCount: articleData.seller.salesCount,
			sellerRating: articleData.seller.rating,
			authenticityScore: photoAnalysisResult.authenticityCheck.score,
		})

		// Step 4: Generate negotiation script
		const negotiation = await this.aiProvider.generateNegotiation({
			price: articleData.price,
			marketPriceAvg: marketPrice.average,
			daysListed,
			sellerSalesCount: articleData.seller.salesCount,
			condition: articleData.condition,
		})

		// Step 5: Generate resale recommendation
		const resale = this.generateResaleRecommendation(
			marketPrice.average,
			opportunity.margin,
			articleData.brand
		)

		// Step 6: Create and save the analysis entity
		const now = new Date()
		const analysisProps: AnalysisProps = {
			id: existingAnalysis?.id ?? createId(),
			vintedId: articleData.vintedId,
			url: articleData.url,
			title: articleData.title,
			description: articleData.description,
			price: articleData.price,
			brand: photoAnalysisResult.detectedBrand ?? articleData.brand,
			size: articleData.size,
			condition: photoAnalysisResult.estimatedCondition ?? articleData.condition,

			sellerUsername: articleData.seller.username,
			sellerRating: articleData.seller.rating,
			sellerSalesCount: articleData.seller.salesCount,

			photos: articleData.photos,

			photoQuality: photoAnalysisResult.photoQuality,
			authenticityCheck: photoAnalysisResult.authenticityCheck,
			marketPrice,
			opportunity,
			negotiation,
			resale,

			status: existingAnalysis?.status ?? 'ANALYZED',
			analyzedAt: now,
			updatedAt: now,
		}

		const analysisEntity = AnalysisEntity.create(analysisProps)
		const savedEntity = await this.repository.save(analysisEntity)

		return toAnalysisResponseDTO(savedEntity)
	}

	/**
	 * Estimate market price based on article data
	 * This is a simplified estimation - in production, would use market price provider
	 */
	private estimateMarketPrice(askingPrice: number, brand: string | null): MarketPrice {
		// Simple estimation logic: market price is typically 20-40% higher than asking
		// for good deals, or close to asking for fair prices
		const multiplier = brand ? 1.3 : 1.2 // Branded items have higher market value
		const average = Math.round(askingPrice * multiplier)
		const low = Math.round(average * 0.85)
		const high = Math.round(average * 1.15)

		return {
			low,
			high,
			average,
			sources: [
				{
					name: 'Estimation IA',
					price: average,
				},
			],
			confidence: brand ? 'medium' : 'low',
		}
	}

	/**
	 * Generate resale recommendation based on analysis
	 */
	private generateResaleRecommendation(
		marketPriceAvg: number,
		margin: number,
		brand: string | null
	): Resale {
		// Recommended price: market average + small markup
		const recommendedPrice = Math.round(marketPriceAvg * 1.05)

		// Estimated days based on margin and brand
		const estimatedDays = margin > 20 ? (brand ? 7 : 14) : brand ? 14 : 30

		// Generate tips
		const tips: string[] = []
		if (margin > 30) {
			tips.push('Excellent marge - revente rapide possible')
		}
		if (margin > 0 && margin <= 30) {
			tips.push('Marge correcte - photos de qualité recommandées')
		}
		if (brand) {
			tips.push(`Mentionner la marque ${brand} dans le titre`)
		}
		tips.push('Prendre des photos avec lumière naturelle')
		tips.push("Décrire précisément l'état et les défauts")

		// Platforms based on item type
		const platforms: Resale['platforms'] = [
			{ name: 'Vinted', relevance: 'high' },
			{ name: 'Leboncoin', relevance: 'medium' },
		]

		if (brand) {
			platforms.push({ name: 'Vestiaire Collective', relevance: 'medium' })
		}

		return {
			recommendedPrice,
			estimatedDays,
			tips,
			platforms,
		}
	}
}
