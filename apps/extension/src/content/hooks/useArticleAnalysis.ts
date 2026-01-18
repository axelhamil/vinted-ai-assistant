/**
 * Hook for article analysis functionality
 */

import type { AnalysisResult, AnalysisStatus } from '@vinted-ai/shared/analysis'
import type { VintedArticleData } from '@vinted-ai/shared/article'
import { useCallback, useState } from 'react'
import { invalidateCache } from '../../db'
import { detectLanguage } from '../lib/parser'
import type { ApiResponse } from './useBackgroundMessaging'
import type { CacheInfo } from './useCacheManagement'

export type AnalysisPhase = 'idle' | 'downloading' | 'analyzing' | 'complete'

interface ExportMarkdownResponse {
	content: string
	filename: string
}

interface UseArticleAnalysisResult {
	analysis: AnalysisResult | null
	isAnalyzing: boolean
	analysisPhase: AnalysisPhase
	error: string | null
	cacheInfo: CacheInfo | null
	setAnalysis: (analysis: AnalysisResult | null) => void
	setCacheInfo: (info: CacheInfo | null) => void
	setError: (error: string | null) => void
	analyzeArticle: (
		data: VintedArticleData,
		sendMessage: <T>(msg: Record<string, unknown>) => Promise<ApiResponse<T>>,
		callbacks: {
			onSuccess: (message: string) => void
			onError: (message: string) => void
			onCacheResult: (result: AnalysisResult) => Promise<void>
		},
		forceRefresh?: boolean
	) => Promise<void>
	updateStatus: (
		status: AnalysisStatus,
		sendMessage: <T>(msg: Record<string, unknown>) => Promise<ApiResponse<T>>,
		callbacks: {
			onSuccess: (message: string) => void
			onError: (message: string) => void
			onCacheResult: (result: AnalysisResult) => Promise<void>
		}
	) => Promise<void>
	exportMarkdown: (
		sendMessage: <T>(msg: Record<string, unknown>) => Promise<ApiResponse<T>>,
		callbacks: {
			onSuccess: (message: string) => void
			onError: (message: string) => void
		}
	) => Promise<void>
}

/**
 * Hook for managing article analysis state and actions
 */
export function useArticleAnalysis(): UseArticleAnalysisResult {
	const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
	const [isAnalyzing, setIsAnalyzing] = useState(false)
	const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>('idle')
	const [error, setError] = useState<string | null>(null)
	const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)

	// Analyze article via backend
	const analyzeArticle = useCallback(
		async (
			data: VintedArticleData,
			sendMessage: <T>(msg: Record<string, unknown>) => Promise<ApiResponse<T>>,
			callbacks: {
				onSuccess: (message: string) => void
				onError: (message: string) => void
				onCacheResult: (result: AnalysisResult) => Promise<void>
			},
			forceRefresh = false
		): Promise<void> => {
			setIsAnalyzing(true)
			setError(null)
			setCacheInfo(null)
			setAnalysisPhase('downloading')

			try {
				// Invalidate cache if forcing refresh
				if (forceRefresh) {
					await invalidateCache(data.vintedId)
				}

				// Simulate phase progression
				setTimeout(() => setAnalysisPhase('analyzing'), 1500)

				// Detect language from Vinted domain
				const language = detectLanguage()

				const response = await sendMessage<AnalysisResult>({
					type: 'ANALYZE_ARTICLE',
					data: { ...data, forceRefresh, language },
				})

				if (response.success && response.data) {
					const scoreLabel =
						response.data.opportunity.score >= 7
							? 'Bonne opportunité !'
							: response.data.opportunity.score >= 5
								? 'Opportunité moyenne'
								: 'Faible opportunité'
					const toastMessage = forceRefresh
						? 'Analyse mise à jour avec succès'
						: `Analyse terminée: ${scoreLabel} (${response.data.opportunity.score}/10)`

					setAnalysisPhase('complete')
					setAnalysis(response.data)
					setCacheInfo({ fromCache: false, timeRemaining: 0 })
					callbacks.onSuccess(toastMessage)

					await callbacks.onCacheResult(response.data)
				} else {
					setError(response.error ?? "Erreur lors de l'analyse de l'article")
					callbacks.onError(response.error ?? "Erreur lors de l'analyse")
					setAnalysisPhase('idle')
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Erreur inattendue lors de l'analyse"
				setError(errorMessage)
				callbacks.onError(errorMessage)
				setAnalysisPhase('idle')
			} finally {
				setIsAnalyzing(false)
			}
		},
		[]
	)

	// Update analysis status
	const updateStatus = useCallback(
		async (
			status: AnalysisStatus,
			sendMessage: <T>(msg: Record<string, unknown>) => Promise<ApiResponse<T>>,
			callbacks: {
				onSuccess: (message: string) => void
				onError: (message: string) => void
				onCacheResult: (result: AnalysisResult) => Promise<void>
			}
		): Promise<void> => {
			if (!analysis) return

			const response = await sendMessage<AnalysisResult>({
				type: 'UPDATE_STATUS',
				vintedId: analysis.vintedId,
				status,
			})

			if (response.success && response.data) {
				const statusMessages: Record<AnalysisStatus, string> = {
					ANALYZED: 'Statut réinitialisé',
					WATCHING: 'Article ajouté à la surveillance',
					BOUGHT: 'Article marqué comme acheté',
					SOLD: 'Article marqué comme vendu',
					ARCHIVED: 'Article archivé',
				}

				setAnalysis(response.data)
				callbacks.onSuccess(statusMessages[status])
				await callbacks.onCacheResult(response.data)
			} else {
				callbacks.onError(response.error ?? 'Erreur lors de la mise à jour du statut')
			}
		},
		[analysis]
	)

	// Export to markdown
	const exportMarkdown = useCallback(
		async (
			sendMessage: <T>(msg: Record<string, unknown>) => Promise<ApiResponse<T>>,
			callbacks: {
				onSuccess: (message: string) => void
				onError: (message: string) => void
			}
		): Promise<void> => {
			if (!analysis) return

			const response = await sendMessage<ExportMarkdownResponse>({
				type: 'EXPORT_MARKDOWN',
				vintedId: analysis.vintedId,
			})

			if (response.success && response.data) {
				const { content, filename } = response.data

				// Create and trigger download
				const blob = new Blob([content], { type: 'text/markdown' })
				const url = URL.createObjectURL(blob)
				const link = document.createElement('a')
				link.href = url
				link.download = filename
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
				URL.revokeObjectURL(url)
				callbacks.onSuccess('Export téléchargé avec succès')
			} else {
				callbacks.onError(response.error ?? "Erreur lors de l'export")
			}
		},
		[analysis]
	)

	return {
		analysis,
		isAnalyzing,
		analysisPhase,
		error,
		cacheInfo,
		setAnalysis,
		setCacheInfo,
		setError,
		analyzeArticle,
		updateStatus,
		exportMarkdown,
	}
}
