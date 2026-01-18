import type { AnalysisStatus } from '@vinted-ai/shared'
import type { Container } from 'inversify'
import type {
	AnalysisListResponseDTO,
	AnalysisResponseDTO,
	AnalysisStatsDTO,
	ListAnalysesQueryDTO,
} from '../../application/dtos/analysis.dto'
import type { ArticleInputDTO } from '../../application/dtos/article.dto'
import type { IAnalysisRepository } from '../../application/interfaces/repositories/analysis.repository.interface'
import type { AnalyzeArticleUseCase } from '../../application/use-cases/analyze-article.use-case'
import type {
	ExportMarkdownResult,
	ExportMarkdownUseCase,
} from '../../application/use-cases/export-markdown.use-case'
import type { GetAnalysisUseCase } from '../../application/use-cases/get-analysis.use-case'
import { TYPES } from '../../container/types'
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

	constructor(container: Container) {
		this.analyzeArticleUseCase = container.get<AnalyzeArticleUseCase>(TYPES.AnalyzeArticleUseCase)
		this.getAnalysisUseCase = container.get<GetAnalysisUseCase>(TYPES.GetAnalysisUseCase)
		this.exportMarkdownUseCase = container.get<ExportMarkdownUseCase>(TYPES.ExportMarkdownUseCase)
		this.analysisRepository = container.get<IAnalysisRepository>(TYPES.AnalysisRepository)
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
			brand: entity.brand,
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
}
