/**
 * IndexedDB cache layer using Dexie
 * Caches analysis results locally with TTL support
 */

import type { AnalysisResult } from '@vinted-ai/shared/analysis'
import Dexie, { type EntityTable } from 'dexie'

// ============================================================================
// Types
// ============================================================================

/**
 * Cached analysis record with TTL metadata
 */
export interface CachedAnalysis {
	/** Vinted article ID (primary key) */
	vintedId: string
	/** Full analysis result from backend */
	analysis: AnalysisResult
	/** Timestamp when the cache entry was created */
	cachedAt: number
	/** Timestamp when the cache entry expires */
	expiresAt: number
}

// ============================================================================
// Constants
// ============================================================================

/** Cache TTL in milliseconds (1 hour) */
export const CACHE_TTL_MS = 60 * 60 * 1000

/** Database name */
const DB_NAME = 'vinted-ai-cache'

/** Database version */
const DB_VERSION = 1

// ============================================================================
// Database
// ============================================================================

/**
 * Dexie database instance for caching analyses
 */
class AnalysisCacheDb extends Dexie {
	analyses!: EntityTable<CachedAnalysis, 'vintedId'>

	constructor() {
		super(DB_NAME)
		this.version(DB_VERSION).stores({
			// Primary key is vintedId, index on expiresAt for cleanup queries
			analyses: 'vintedId, expiresAt',
		})
	}
}

/** Singleton database instance */
const db = new AnalysisCacheDb()

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get a cached analysis by Vinted ID
 * Returns null if not found or expired
 */
export async function getCachedAnalysis(vintedId: string): Promise<AnalysisResult | null> {
	try {
		const cached = await db.analyses.get(vintedId)

		if (!cached) {
			return null
		}

		// Check if cache is expired
		if (Date.now() > cached.expiresAt) {
			// Delete expired entry
			await db.analyses.delete(vintedId)
			return null
		}

		// Convert date strings back to Date objects
		return {
			...cached.analysis,
			analyzedAt: new Date(cached.analysis.analyzedAt),
			cachedUntil: new Date(cached.analysis.cachedUntil),
		}
	} catch (error) {
		console.error('[Vinted AI Cache] Error getting cached analysis:', error)
		return null
	}
}

/**
 * Cache an analysis result
 */
export async function cacheAnalysis(analysis: AnalysisResult): Promise<void> {
	try {
		const now = Date.now()
		const cached: CachedAnalysis = {
			vintedId: analysis.vintedId,
			analysis: {
				...analysis,
				// Ensure dates are serializable
				analyzedAt:
					analysis.analyzedAt instanceof Date ? analysis.analyzedAt : new Date(analysis.analyzedAt),
				cachedUntil:
					analysis.cachedUntil instanceof Date
						? analysis.cachedUntil
						: new Date(analysis.cachedUntil),
			},
			cachedAt: now,
			expiresAt: now + CACHE_TTL_MS,
		}

		await db.analyses.put(cached)
		console.log('[Vinted AI Cache] Analysis cached:', analysis.vintedId)
	} catch (error) {
		console.error('[Vinted AI Cache] Error caching analysis:', error)
	}
}

/**
 * Invalidate (delete) a cached analysis
 */
export async function invalidateCache(vintedId: string): Promise<void> {
	try {
		await db.analyses.delete(vintedId)
		console.log('[Vinted AI Cache] Cache invalidated:', vintedId)
	} catch (error) {
		console.error('[Vinted AI Cache] Error invalidating cache:', error)
	}
}

/**
 * Clear all expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
	try {
		const now = Date.now()
		const expiredCount = await db.analyses.where('expiresAt').below(now).delete()
		console.log('[Vinted AI Cache] Cleared expired entries:', expiredCount)
		return expiredCount
	} catch (error) {
		console.error('[Vinted AI Cache] Error clearing expired cache:', error)
		return 0
	}
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(): Promise<void> {
	try {
		await db.analyses.clear()
		console.log('[Vinted AI Cache] All cache cleared')
	} catch (error) {
		console.error('[Vinted AI Cache] Error clearing all cache:', error)
	}
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
	totalEntries: number
	expiredEntries: number
	validEntries: number
}> {
	try {
		const now = Date.now()
		const totalEntries = await db.analyses.count()
		const expiredEntries = await db.analyses.where('expiresAt').below(now).count()
		const validEntries = totalEntries - expiredEntries

		return { totalEntries, expiredEntries, validEntries }
	} catch (error) {
		console.error('[Vinted AI Cache] Error getting cache stats:', error)
		return { totalEntries: 0, expiredEntries: 0, validEntries: 0 }
	}
}

/**
 * Check if an analysis is cached and valid
 */
export async function isCached(vintedId: string): Promise<boolean> {
	const analysis = await getCachedAnalysis(vintedId)
	return analysis !== null
}

/**
 * Get time remaining until cache expires (in milliseconds)
 * Returns 0 if not cached or expired
 */
export async function getCacheTimeRemaining(vintedId: string): Promise<number> {
	try {
		const cached = await db.analyses.get(vintedId)

		if (!cached) {
			return 0
		}

		const remaining = cached.expiresAt - Date.now()
		return remaining > 0 ? remaining : 0
	} catch (error) {
		console.error('[Vinted AI Cache] Error getting cache time remaining:', error)
		return 0
	}
}

// Export database instance for advanced use cases
export { db }
