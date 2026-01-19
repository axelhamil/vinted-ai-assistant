/**
 * Hook for fetching and managing portfolio articles
 */

import { useCallback, useState } from 'react'
import type { ApiResponse, ArticleStatus, PortfolioArticle, PortfolioStats } from '../types'

// Send message to background service worker
async function sendMessage<T>(message: Record<string, unknown>): Promise<ApiResponse<T>> {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response: ApiResponse<T>) => {
			resolve(response)
		})
	})
}

export interface PortfolioData {
	articles: PortfolioArticle[]
	stats: PortfolioStats | null
	isLoading: boolean
	error: string | null
}

export interface PortfolioActions {
	fetchArticles: (status?: ArticleStatus, minScore?: number) => Promise<void>
	fetchStats: () => Promise<void>
	refresh: () => Promise<void>
	deleteArticle: (vintedId: string) => Promise<boolean>
}

export function usePortfolio(): PortfolioData & PortfolioActions {
	const [articles, setArticles] = useState<PortfolioArticle[]>([])
	const [stats, setStats] = useState<PortfolioStats | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [currentFilter, setCurrentFilter] = useState<{
		status?: ArticleStatus
		minScore?: number
	}>({})

	const fetchArticles = useCallback(async (status?: ArticleStatus, minScore?: number) => {
		setIsLoading(true)
		setError(null)
		setCurrentFilter({ status, minScore })

		const response = await sendMessage<{ items: PortfolioArticle[]; total: number }>({
			type: 'GET_PORTFOLIO',
			filter: {
				status,
				minScore,
				limit: 50,
				offset: 0,
			},
		})

		if (response.success && response.data) {
			setArticles(response.data.items)
		} else {
			setError(response.error || 'Erreur lors du chargement')
			setArticles([])
		}

		setIsLoading(false)
	}, [])

	const fetchStats = useCallback(async () => {
		const response = await sendMessage<PortfolioStats>({
			type: 'GET_PORTFOLIO_STATS',
		})

		if (response.success && response.data) {
			setStats(response.data)
		}
	}, [])

	const refresh = useCallback(async () => {
		await Promise.all([fetchArticles(currentFilter.status, currentFilter.minScore), fetchStats()])
	}, [fetchArticles, fetchStats, currentFilter])

	const deleteArticle = useCallback(
		async (vintedId: string): Promise<boolean> => {
			const response = await sendMessage<{ success: boolean }>({
				type: 'DELETE_PORTFOLIO_ITEM',
				vintedId,
			})

			if (response.success && response.data?.success) {
				setArticles((prev) => prev.filter((a) => a.vintedId !== vintedId))
				await fetchStats()
				return true
			}
			return false
		},
		[fetchStats]
	)

	return {
		articles,
		stats,
		isLoading,
		error,
		fetchArticles,
		fetchStats,
		refresh,
		deleteArticle,
	}
}
