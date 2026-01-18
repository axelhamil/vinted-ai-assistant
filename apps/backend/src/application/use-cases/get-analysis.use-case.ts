import { inject, injectable } from 'inversify'
import { TYPES } from '../../container/types'
import { AnalysisNotFoundError } from '../../domain/errors/domain.error'
import {
	type AnalysisListResponseDTO,
	type AnalysisResponseDTO,
	type AnalysisStatsDTO,
	type ListAnalysesQueryDTO,
	toAnalysisResponseDTO,
} from '../dtos/analysis.dto'
import type { IAnalysisRepository } from '../interfaces/repositories/analysis.repository.interface'

/**
 * Use case for retrieving analyses
 * Provides methods for getting single analysis, listing with pagination, and stats
 */
@injectable()
export class GetAnalysisUseCase {
	constructor(@inject(TYPES.AnalysisRepository) private readonly repository: IAnalysisRepository) {}

	/**
	 * Get an analysis by its Vinted ID
	 * @param vintedId - The Vinted article ID
	 * @returns The analysis response DTO
	 * @throws AnalysisNotFoundError if no analysis exists for the given ID
	 */
	async getByVintedId(vintedId: string): Promise<AnalysisResponseDTO> {
		const analysis = await this.repository.findByVintedId(vintedId)

		if (!analysis) {
			throw new AnalysisNotFoundError(vintedId)
		}

		return toAnalysisResponseDTO(analysis)
	}

	/**
	 * Get all analyses with pagination and filtering
	 * @param query - Query parameters for filtering and pagination
	 * @returns Paginated list of analyses
	 */
	async getAll(query: ListAnalysesQueryDTO = {}): Promise<AnalysisListResponseDTO> {
		const { limit = 50, offset = 0, minScore, status } = query

		// Get analyses and total count in parallel
		const [analyses, total] = await Promise.all([
			this.repository.findAll({ limit, offset, minScore, status }),
			this.repository.count({ minScore, status }),
		])

		const data = analyses.map(toAnalysisResponseDTO)

		return {
			data,
			pagination: {
				total,
				limit,
				offset,
				hasMore: offset + data.length < total,
			},
		}
	}

	/**
	 * Get statistics about analyses
	 * @returns Stats including today's count, opportunities, bought, and sold
	 */
	async getStats(): Promise<AnalysisStatsDTO> {
		// Get today's start timestamp for filtering
		const todayStart = new Date()
		todayStart.setHours(0, 0, 0, 0)

		// Get all counts in parallel
		const [allAnalyses, opportunityCount, boughtCount, soldCount] = await Promise.all([
			this.repository.findAll({}),
			this.repository.count({ minScore: 7 }),
			this.repository.count({ status: 'BOUGHT' }),
			this.repository.count({ status: 'SOLD' }),
		])

		// Filter for today's analyses
		const todayCount = allAnalyses.filter((analysis) => analysis.analyzedAt >= todayStart).length

		return {
			today: todayCount,
			opportunities: opportunityCount,
			bought: boughtCount,
			sold: soldCount,
		}
	}
}
