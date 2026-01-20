import type { AnalysisStatus, Negotiation, NegotiationTone } from '@vinted-ai/shared/analysis'
import type { Container } from 'inversify'
import { TYPES } from '../../application/di-types'
import type {
	AnalysisListResponseDTO,
	AnalysisResponseDTO,
	AnalysisStatsDTO,
	ListAnalysesQueryDTO,
	PortfolioListResponseDTO,
	PortfolioStatsDTO,
} from '../../application/dtos/analysis.dto'
import { toPortfolioItemDTO } from '../../application/dtos/analysis.dto'
import type { ArticleInputDTO } from '../../application/dtos/article.dto'
import type { IAIProvider } from '../../application/interfaces/providers/ai.provider.interface'
import type { IAnalysisRepository } from '../../application/interfaces/repositories/analysis.repository.interface'
import type { AnalyzeArticleUseCase } from '../../application/use-cases/analyze-article.use-case'
import type {
	ExportMarkdownResult,
	ExportMarkdownUseCase,
} from '../../application/use-cases/export-markdown.use-case'
import type { GetAnalysisUseCase } from '../../application/use-cases/get-analysis.use-case'
import { buildNegotiationMessage } from '../../application/use-cases/prompts/negotiation.prompt'
import { negotiationSchema } from '../../application/use-cases/prompts/schemas/article-analysis.schema'
import { AnalysisNotFoundError } from '../../domain/errors/domain.error'

/**
 * Controller for analysis-related endpoints
 * Handles HTTP-specific logic and delegates to use cases
 */
export class AnalysisController {
	private readonly analyzeArticleUseCase: AnalyzeArticleUseCase
	private readonly getAnalysisUseCase: GetAnalysisUseCase
	private readonly exportMarkdownUseCase: ExportMarkdownUseCase
	private readonly analysisRepository: IAnalysisRepository
	private readonly aiProvider: IAIProvider

	constructor(container: Container) {
		this.analyzeArticleUseCase = container.get<AnalyzeArticleUseCase>(TYPES.AnalyzeArticleUseCase)
		this.getAnalysisUseCase = container.get<GetAnalysisUseCase>(TYPES.GetAnalysisUseCase)
		this.exportMarkdownUseCase = container.get<ExportMarkdownUseCase>(TYPES.ExportMarkdownUseCase)
		this.analysisRepository = container.get<IAnalysisRepository>(TYPES.AnalysisRepository)
		this.aiProvider = container.get<IAIProvider>(TYPES.AIProvider)
	}

	/**
	 * POST /api/analyze
	 * Analyze a Vinted article
	 */
	async analyze(input: ArticleInputDTO): Promise<AnalysisResponseDTO> {
		return this.analyzeArticleUseCase.execute(input)
	}

	/**
	 * GET /api/analyses
	 * List analyses with pagination and filtering
	 */
	async getAnalyses(query: ListAnalysesQueryDTO): Promise<AnalysisListResponseDTO> {
		return this.getAnalysisUseCase.getAll(query)
	}

	/**
	 * GET /api/analyses/:vintedId
	 * Get a single analysis by Vinted ID
	 */
	async getAnalysisByVintedId(vintedId: string): Promise<AnalysisResponseDTO> {
		return this.getAnalysisUseCase.getByVintedId(vintedId)
	}

	/**
	 * PATCH /api/analyses/:vintedId/status
	 * Update the status of an analysis
	 */
	async updateStatus(vintedId: string, status: AnalysisStatus): Promise<AnalysisResponseDTO> {
		const entity = await this.analysisRepository.updateStatus(vintedId, status)

		if (!entity) {
			throw new AnalysisNotFoundError(vintedId)
		}

		// Convert entity to DTO
		return {
			id: entity.id,
			vintedId: entity.vintedId,
			url: entity.url,
			title: entity.title,
			price: entity.askingPrice.value,
			totalPrice: entity.toProps().totalPrice,
			brand: entity.brand,
			aiDetection: {
				detectedBrand: entity.brand,
				detectedModel: entity.detectedModel,
				estimatedCondition: entity.condition,
			},
			photoQuality: entity.photoQuality,
			authenticityCheck: entity.authenticityCheck,
			marketPrice: entity.marketPrice,
			opportunity: entity.opportunity,
			negotiation: entity.negotiation,
			resale: entity.resale,
			status: entity.status,
			analyzedAt: entity.analyzedAt.toISOString(),
			cachedUntil: entity.getCachedUntil().toISOString(),
		}
	}

	/**
	 * GET /api/analyses/:vintedId/export
	 * Export an analysis to markdown
	 */
	async exportMarkdown(vintedId: string): Promise<ExportMarkdownResult> {
		return this.exportMarkdownUseCase.execute(vintedId)
	}

	/**
	 * GET /api/stats
	 * Get analysis statistics
	 */
	async getStats(): Promise<AnalysisStatsDTO> {
		return this.getAnalysisUseCase.getStats()
	}

	/**
	 * POST /api/analyses/:vintedId/regenerate-negotiation
	 * Regenerate negotiation script with specified tone
	 */
	async regenerateNegotiation(vintedId: string, tone: NegotiationTone): Promise<Negotiation> {
		// Get existing analysis to extract required data
		const entity = await this.analysisRepository.findByVintedId(vintedId)

		if (!entity) {
			throw new AnalysisNotFoundError(vintedId)
		}

		// Calculate days listed from analyzedAt (approximation)
		const daysListed = Math.floor(
			(Date.now() - entity.analyzedAt.getTime()) / (1000 * 60 * 60 * 24)
		)

		// Build the negotiation prompt
		const message = buildNegotiationMessage({
			price: entity.askingPrice.value,
			marketPriceAvg: entity.marketPrice.average,
			daysListed,
			sellerSalesCount: entity.sellerSalesCount ?? 0,
			condition: entity.condition ?? 'Non spécifié',
			preferredTone: tone,
		})

		// Generate negotiation using the generic AI interface
		const result = await this.aiProvider.generateText({
			messages: [message],
			schema: negotiationSchema,
		})

		if (!result.output) {
			throw new Error('Failed to generate negotiation')
		}

		return result.output
	}

	/**
	 * GET /api/portfolio
	 * List items for the portfolio view
	 */
	async getPortfolio(query: ListAnalysesQueryDTO): Promise<PortfolioListResponseDTO> {
		const { limit = 50, offset = 0, minScore, status } = query

		const [analyses, total] = await Promise.all([
			this.analysisRepository.findAll({ limit, offset, minScore, status }),
			this.analysisRepository.count({ minScore, status }),
		])

		const items = analyses.map(toPortfolioItemDTO)

		return {
			items,
			total,
		}
	}

	/**
	 * GET /api/portfolio/stats
	 * Get portfolio statistics
	 */
	async getPortfolioStats(): Promise<PortfolioStatsDTO> {
		const [watchingCount, boughtCount, soldCount, opportunitiesCount] = await Promise.all([
			this.analysisRepository.count({ status: 'WATCHING' }),
			this.analysisRepository.count({ status: 'BOUGHT' }),
			this.analysisRepository.count({ status: 'SOLD' }),
			this.analysisRepository.count({ minScore: 7 }),
		])

		return {
			watching: watchingCount,
			bought: boughtCount,
			sold: soldCount,
			opportunities: opportunitiesCount,
		}
	}

	/**
	 * DELETE /api/portfolio/:vintedId
	 * Delete an article from the portfolio
	 */
	async deletePortfolioItem(vintedId: string): Promise<void> {
		const deleted = await this.analysisRepository.delete(vintedId)

		if (!deleted) {
			throw new AnalysisNotFoundError(vintedId)
		}
	}
}
