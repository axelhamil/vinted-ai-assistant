import type { AnalysisStatus } from '@vinted-ai/shared'
import type { AnalysisEntity } from '../../../domain/entities/analysis.entity'

/**
 * Query options for listing analyses
 */
export interface FindAllOptions {
	limit?: number
	offset?: number
	minScore?: number
	status?: AnalysisStatus
}

/**
 * Analysis repository interface (port)
 * Defines the contract for persistence operations on Analysis entities
 */
export interface IAnalysisRepository {
	/**
	 * Save a new analysis or update an existing one
	 */
	save(analysis: AnalysisEntity): Promise<AnalysisEntity>

	/**
	 * Find an analysis by its Vinted ID
	 */
	findByVintedId(vintedId: string): Promise<AnalysisEntity | null>

	/**
	 * Find an analysis by its internal ID
	 */
	findById(id: string): Promise<AnalysisEntity | null>

	/**
	 * Find all analyses with optional filtering and pagination
	 */
	findAll(options?: FindAllOptions): Promise<AnalysisEntity[]>

	/**
	 * Count total analyses matching the filter
	 */
	count(options?: Omit<FindAllOptions, 'limit' | 'offset'>): Promise<number>

	/**
	 * Update the status of an analysis
	 */
	updateStatus(vintedId: string, status: AnalysisStatus): Promise<AnalysisEntity | null>

	/**
	 * Delete an analysis by its Vinted ID
	 */
	delete(vintedId: string): Promise<boolean>

	/**
	 * Check if an analysis exists for a given Vinted ID
	 */
	exists(vintedId: string): Promise<boolean>
}
