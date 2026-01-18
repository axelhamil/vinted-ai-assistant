import type { AnalysisStatus } from '@vinted-ai/shared'
import { and, count, desc, eq, gte } from 'drizzle-orm'
import { injectable } from 'inversify'
import type {
	FindAllOptions,
	IAnalysisRepository,
} from '../../application/interfaces/repositories/analysis.repository.interface'
import { AnalysisEntity, type AnalysisProps } from '../../domain/entities/analysis.entity'
import { db } from '../database/client'
import { type Analysis, type NewAnalysis, analyses } from '../database/schema'

/**
 * Drizzle implementation of the Analysis repository
 */
@injectable()
export class DrizzleAnalysisRepository implements IAnalysisRepository {
	/**
	 * Save a new analysis or update an existing one
	 */
	async save(analysis: AnalysisEntity): Promise<AnalysisEntity> {
		const record = this.toDbRecord(analysis)

		const existing = await db
			.select()
			.from(analyses)
			.where(eq(analyses.vintedId, analysis.vintedId))
			.get()

		if (existing) {
			await db.update(analyses).set(record).where(eq(analyses.vintedId, analysis.vintedId))
		} else {
			await db.insert(analyses).values(record)
		}

		return analysis
	}

	/**
	 * Find an analysis by its Vinted ID
	 */
	async findByVintedId(vintedId: string): Promise<AnalysisEntity | null> {
		const record = await db.select().from(analyses).where(eq(analyses.vintedId, vintedId)).get()

		if (!record) {
			return null
		}

		return this.toEntity(record)
	}

	/**
	 * Find an analysis by its internal ID
	 */
	async findById(id: string): Promise<AnalysisEntity | null> {
		const record = await db.select().from(analyses).where(eq(analyses.id, id)).get()

		if (!record) {
			return null
		}

		return this.toEntity(record)
	}

	/**
	 * Find all analyses with optional filtering and pagination
	 */
	async findAll(options?: FindAllOptions): Promise<AnalysisEntity[]> {
		const { limit = 50, offset = 0, minScore, status } = options || {}

		const conditions = []

		if (minScore !== undefined) {
			conditions.push(gte(analyses.opportunityScore, minScore))
		}

		if (status !== undefined) {
			conditions.push(eq(analyses.status, status))
		}

		const query = db
			.select()
			.from(analyses)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(desc(analyses.analyzedAt))
			.limit(limit)
			.offset(offset)

		const records = await query.all()

		return records.map((record) => this.toEntity(record))
	}

	/**
	 * Count total analyses matching the filter
	 */
	async count(options?: Omit<FindAllOptions, 'limit' | 'offset'>): Promise<number> {
		const { minScore, status } = options || {}

		const conditions = []

		if (minScore !== undefined) {
			conditions.push(gte(analyses.opportunityScore, minScore))
		}

		if (status !== undefined) {
			conditions.push(eq(analyses.status, status))
		}

		const result = await db
			.select({ count: count() })
			.from(analyses)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.get()

		return result?.count ?? 0
	}

	/**
	 * Update the status of an analysis
	 */
	async updateStatus(vintedId: string, status: AnalysisStatus): Promise<AnalysisEntity | null> {
		const entity = await this.findByVintedId(vintedId)

		if (!entity) {
			return null
		}

		const updatedEntity = entity.updateStatus(status)

		await db
			.update(analyses)
			.set({
				status,
				updatedAt: new Date(),
			})
			.where(eq(analyses.vintedId, vintedId))

		return updatedEntity
	}

	/**
	 * Delete an analysis by its Vinted ID
	 */
	async delete(vintedId: string): Promise<boolean> {
		const result = await db.delete(analyses).where(eq(analyses.vintedId, vintedId))

		return result.changes > 0
	}

	/**
	 * Check if an analysis exists for a given Vinted ID
	 */
	async exists(vintedId: string): Promise<boolean> {
		const result = await db
			.select({ id: analyses.id })
			.from(analyses)
			.where(eq(analyses.vintedId, vintedId))
			.get()

		return result !== undefined
	}

	/**
	 * Map AnalysisEntity to database record
	 */
	private toDbRecord(entity: AnalysisEntity): NewAnalysis {
		const props = entity.toProps()

		return {
			id: props.id,
			vintedId: props.vintedId,
			url: props.url,
			title: props.title,
			description: props.description,
			price: props.price,
			brand: props.brand,
			size: props.size,
			condition: props.condition,

			sellerUsername: props.sellerUsername,
			sellerRating: props.sellerRating,
			sellerSalesCount: props.sellerSalesCount,

			photos: props.photos,

			photoQualityScore: props.photoQuality.score,
			photoAnalysis: {
				hasModel: props.photoQuality.hasModel,
				lighting: props.photoQuality.lighting,
				background: props.photoQuality.background,
				issues: props.photoQuality.issues,
			},

			authenticityScore: props.authenticityCheck.score,
			authenticityFlags: props.authenticityCheck.flags,
			authenticityConfidence: props.authenticityCheck.confidence,

			marketPriceLow: props.marketPrice.low,
			marketPriceHigh: props.marketPrice.high,
			marketPriceAvg: props.marketPrice.average,
			marketPriceSources: props.marketPrice.sources,
			marketPriceConfidence: props.marketPrice.confidence,

			opportunityScore: props.opportunity.score,
			margin: props.opportunity.margin,
			marginPercent: props.opportunity.marginPercent,
			signals: props.opportunity.signals,

			suggestedOffer: props.negotiation.suggestedOffer,
			negotiationScript: props.negotiation.script,
			negotiationArguments: props.negotiation.arguments,
			negotiationTone: props.negotiation.tone,

			resalePrice: props.resale.recommendedPrice,
			resaleEstimatedDays: props.resale.estimatedDays,
			resaleTips: props.resale.tips,
			resalePlatforms: props.resale.platforms,

			status: props.status,
			analyzedAt: props.analyzedAt,
			updatedAt: props.updatedAt,
		}
	}

	/**
	 * Map database record to AnalysisEntity
	 */
	private toEntity(record: Analysis): AnalysisEntity {
		const props: AnalysisProps = {
			id: record.id,
			vintedId: record.vintedId,
			url: record.url,
			title: record.title,
			description: record.description,
			price: record.price,
			brand: record.brand,
			size: record.size,
			condition: record.condition,

			sellerUsername: record.sellerUsername,
			sellerRating: record.sellerRating,
			sellerSalesCount: record.sellerSalesCount,

			photos: record.photos,

			photoQuality: {
				score: record.photoQualityScore,
				hasModel: record.photoAnalysis.hasModel,
				lighting: record.photoAnalysis.lighting,
				background: record.photoAnalysis.background,
				issues: record.photoAnalysis.issues,
			},

			authenticityCheck: {
				score: record.authenticityScore,
				flags: record.authenticityFlags,
				confidence: record.authenticityConfidence,
			},

			marketPrice: {
				low: record.marketPriceLow ?? 0,
				high: record.marketPriceHigh ?? 0,
				average: record.marketPriceAvg ?? 0,
				sources: record.marketPriceSources ?? [],
				confidence: record.marketPriceConfidence ?? 'low',
			},

			opportunity: {
				score: record.opportunityScore,
				margin: record.margin ?? 0,
				marginPercent: record.marginPercent ?? 0,
				signals: record.signals,
			},

			negotiation: {
				suggestedOffer: record.suggestedOffer ?? 0,
				script: record.negotiationScript ?? '',
				arguments: record.negotiationArguments ?? [],
				tone: record.negotiationTone ?? 'friendly',
			},

			resale: {
				recommendedPrice: record.resalePrice ?? 0,
				estimatedDays: record.resaleEstimatedDays ?? 0,
				tips: record.resaleTips ?? [],
				platforms: record.resalePlatforms ?? [],
			},

			status: record.status,
			analyzedAt: record.analyzedAt,
			updatedAt: record.updatedAt,
		}

		return AnalysisEntity.create(props)
	}
}
