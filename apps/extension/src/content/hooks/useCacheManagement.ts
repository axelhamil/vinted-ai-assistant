/**
 * Hook for managing analysis cache (IndexedDB and backend)
 */

import type { AnalysisResult } from '@vinted-ai/shared/analysis'
import { useCallback } from 'react'
import { cacheAnalysis, getCacheTimeRemaining, getCachedAnalysis } from '../../db'
import type { ApiResponse } from './useBackgroundMessaging'

export interface CacheInfo {
	fromCache: boolean
	timeRemaining: number
}

interface UseCacheManagementResult {
	checkCachedAnalysis: (
		vintedId: string,
		sendMessage: <T>(message: Record<string, unknown>) => Promise<ApiResponse<T>>
	) => Promise<{ analysis: AnalysisResult; fromCache: boolean } | null>
	cacheResult: (result: AnalysisResult) => Promise<void>
	getCacheTimeRemaining: (vintedId: string) => Promise<number>
}

/**
 * Hook for managing analysis cache
 */
export function useCacheManagement(): UseCacheManagementResult {
	// Check for cached analysis (IndexedDB first, then backend)
	const checkCachedAnalysis = useCallback(
		async (
			vintedId: string,
			sendMessage: <T>(message: Record<string, unknown>) => Promise<ApiResponse<T>>
		): Promise<{ analysis: AnalysisResult; fromCache: boolean } | null> => {
			// First check local IndexedDB cache
			const localCached = await getCachedAnalysis(vintedId)
			if (localCached) {
				return { analysis: localCached, fromCache: true }
			}

			// If not in local cache, check backend
			const response = await sendMessage<AnalysisResult>({
				type: 'GET_ANALYSIS',
				vintedId,
			})

			if (response.success && response.data) {
				// Cache the result locally
				await cacheAnalysis(response.data)
				return { analysis: response.data, fromCache: true }
			}

			return null
		},
		[]
	)

	// Cache an analysis result
	const cacheResult = useCallback(async (result: AnalysisResult): Promise<void> => {
		try {
			await cacheAnalysis(result)
		} catch {
			// Caching failure is not critical
		}
	}, [])

	return {
		checkCachedAnalysis,
		cacheResult,
		getCacheTimeRemaining,
	}
}
