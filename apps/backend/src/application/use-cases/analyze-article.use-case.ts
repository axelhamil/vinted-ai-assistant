import { createId } from '@paralleldrive/cuid2'
import type { MarketPrice, Resale } from '@vinted-ai/shared/analysis'
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
	 * Uses a single AI call for maximum performance
	 * @param input - Article data from the extension
	 * @returns Complete analysis result
	 */
	async execute(input: ArticleInputDTO): Promise<AnalysisResponseDTO> {
		// Check if we already have a cached analysis (skip if forceRefresh)
		const existingAnalysis = await this.repository.findByVintedId(input.vintedId)
		if (existingAnalysis && !existingAnalysis.isCacheExpired() && !input.forceRefresh) {
			return toAnalysisResponseDTO(existingAnalysis)
		}

		// Convert input to domain format
		const articleData = toVintedArticleData(input)
		const daysListed = calculateDaysListed(articleData.listedAt)

		// Single AI call for complete analysis (photos + opportunity + negotiation)
		const analysisResult = await this.aiProvider.analyzeComplete({
			photoUrls: articleData.photos,
			title: articleData.title,
			brand: articleData.brand,
			condition: articleData.condition,
			price: articleData.price,
			daysListed,
			language: input.language,
			size: articleData.size ?? undefined,
		})

		// Extract results from unified analysis
		const aiEstimation = analysisResult.marketPriceEstimation

		// Build sources from AI estimation or fallback to default
		const sources = aiEstimation.sources && aiEstimation.sources.length > 0
			? aiEstimation.sources.map((s) => ({
					name: s.name,
					price: s.price,
					searchQuery: s.searchQuery,
					count: s.count,
				}))
			: [
					{
						name: 'Estimation IA',
						price: aiEstimation.average,
					},
				]

		const marketPrice: MarketPrice = {
			low: aiEstimation.low,
			high: aiEstimation.high,
			average: aiEstimation.average,
			confidence: aiEstimation.confidence,
			reasoning: aiEstimation.reasoning,
			sources,
			...(aiEstimation.retailPrice && {
				retailPrice: {
					price: aiEstimation.retailPrice,
					url: '',
					brand: analysisResult.detectedBrand ?? articleData.brand ?? 'Marque',
				},
			}),
		}

		// Generate resale recommendation (no AI needed)
		const resale = this.generateResaleRecommendation(
			marketPrice.average,
			analysisResult.opportunity.margin,
			articleData.brand
		)

		// Create and save the analysis entity
		const now = new Date()
		const analysisProps: AnalysisProps = {
			id: existingAnalysis?.id ?? createId(),
			vintedId: articleData.vintedId,
			url: articleData.url,
			title: articleData.title,
			description: articleData.description,
			price: articleData.price,
			brand: analysisResult.detectedBrand ?? articleData.brand,
			size: articleData.size,
			condition: analysisResult.estimatedCondition ?? articleData.condition,
			detectedModel: analysisResult.detectedModel,

			sellerUsername: articleData.seller.username,
			sellerRating: articleData.seller.rating,
			sellerSalesCount: articleData.seller.salesCount,

			photos: articleData.photos,

			photoQuality: analysisResult.photoQuality,
			authenticityCheck: analysisResult.authenticityCheck,
			marketPrice,
			opportunity: analysisResult.opportunity,
			negotiation: analysisResult.negotiation,
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
