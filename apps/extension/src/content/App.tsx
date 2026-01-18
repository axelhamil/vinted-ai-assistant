import type { AnalysisResult, AnalysisStatus, VintedArticleData } from '@vinted-ai/shared'
import { useCallback, useEffect, useState } from 'react'
import { cacheAnalysis, getCacheTimeRemaining, getCachedAnalysis, invalidateCache } from '../db'
import {
	Badge,
	ErrorDisplay,
	FloatingButton,
	Sidebar,
	SkeletonSidebar,
	ToastContainer,
	useToast,
} from './components'
import {
	detectLanguage,
	fetchSellerProfile,
	mergeSellerWithProfile,
	parseVintedArticle,
	waitForPageLoad,
} from './lib/parser'
import { formatRelativeTime } from './lib/time'

interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

interface ExportMarkdownResponse {
	content: string
	filename: string
}

/**
 * Main content script App component
 * Renders the analysis UI (Badge and Sidebar) when on a Vinted article page
 */
type AnalysisPhase = 'idle' | 'downloading' | 'analyzing' | 'complete'

export function App() {
	const [articleData, setArticleData] = useState<VintedArticleData | null>(null)
	const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isAnalyzing, setIsAnalyzing] = useState(false)
	const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase>('idle')
	const [error, setError] = useState<string | null>(null)
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [cacheInfo, setCacheInfo] = useState<{ fromCache: boolean; timeRemaining: number } | null>(
		null
	)
	const [isRetrying, setIsRetrying] = useState(false)
	const { toasts, dismissToast, success, error: showError } = useToast()

	// Send message to background service worker
	const sendMessage = useCallback(
		<T,>(message: Record<string, unknown>): Promise<ApiResponse<T>> => {
			return new Promise((resolve) => {
				chrome.runtime.sendMessage(message, (response: ApiResponse<T>) => {
					resolve(response)
				})
			})
		},
		[]
	)

	// Analyze article via backend and cache result
	const analyzeArticle = useCallback(
		async (data: VintedArticleData, forceRefresh = false): Promise<void> => {
			setIsAnalyzing(true)
			setError(null)
			setCacheInfo(null)
			setAnalysisPhase('downloading')

			try {
				// Invalidate cache if forcing refresh
				if (forceRefresh) {
					await invalidateCache(data.vintedId)
				}

				// Simulate phase progression (images are downloaded on backend)
				setTimeout(() => setAnalysisPhase('analyzing'), 1500)

				// Detect language from Vinted domain or browser
				const language = detectLanguage()
				console.log('[Vinted AI] Detected language:', language)

				const response = await sendMessage<AnalysisResult>({
					type: 'ANALYZE_ARTICLE',
					data: { ...data, forceRefresh, language },
				})

				if (response.success && response.data) {
					// Batch all state updates together before any async operations
					const scoreLabel =
						response.data.opportunity.score >= 7
							? 'Bonne opportunité !'
							: response.data.opportunity.score >= 5
								? 'Opportunité moyenne'
								: 'Faible opportunité'
					const toastMessage = forceRefresh
						? 'Analyse mise à jour avec succès'
						: `Analyse terminée: ${scoreLabel} (${response.data.opportunity.score}/10)`

					// All state updates in one synchronous block (React will batch these)
					setAnalysisPhase('complete')
					setAnalysis(response.data)
					setCacheInfo({ fromCache: false, timeRemaining: 0 })
					setSidebarOpen(true)
					success(toastMessage)

					console.log('[Vinted AI] Analysis complete:', response.data.opportunity.score)

					// Cache result before considering operation complete
					try {
						await cacheAnalysis(response.data)
					} catch (err) {
						console.error('[Vinted AI] Failed to cache analysis:', err)
					}
				} else {
					console.error('[Vinted AI] Analysis failed:', response.error)
					setError(response.error ?? "Erreur lors de l'analyse de l'article")
					showError(response.error ?? "Erreur lors de l'analyse")
					setAnalysisPhase('idle')
				}
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Erreur inattendue lors de l'analyse"
				console.error('[Vinted AI] Error analyzing article:', err)
				setError(errorMessage)
				showError(errorMessage)
				setAnalysisPhase('idle')
			} finally {
				setIsAnalyzing(false)
			}
		},
		[sendMessage, success, showError]
	)

	// Check for locally cached analysis (IndexedDB) first, then backend
	const checkCachedAnalysis = useCallback(
		async (vintedId: string): Promise<{ analysis: AnalysisResult; fromCache: boolean } | null> => {
			// First check local IndexedDB cache
			const localCached = await getCachedAnalysis(vintedId)
			if (localCached) {
				const timeRemaining = await getCacheTimeRemaining(vintedId)
				setCacheInfo({ fromCache: true, timeRemaining })
				console.log(
					'[Vinted AI] Found in local cache, TTL remaining:',
					Math.round(timeRemaining / 1000),
					's'
				)
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
				const timeRemaining = await getCacheTimeRemaining(vintedId)
				setCacheInfo({ fromCache: true, timeRemaining })
				return { analysis: response.data, fromCache: true }
			}
			return null
		},
		[sendMessage]
	)

	useEffect(() => {
		async function loadArticleData() {
			try {
				setIsLoading(true)
				setError(null)
				setCacheInfo(null)

				// Wait for page to fully load
				await waitForPageLoad()

				// Parse article data from DOM
				const data = parseVintedArticle()

				if (data) {
					console.log('[Vinted AI] Article data extracted:', data.vintedId)

					// Fetch seller profile with timeout (5s max)
					// Wait for it BEFORE setting state to avoid double update
					const sellerProfile = await fetchSellerProfile(data.seller.username)

					// Merge seller profile data if available
					if (sellerProfile) {
						data.seller = mergeSellerWithProfile(data.seller, sellerProfile)
						console.log('[Vinted AI] Seller profile enriched:', data.seller.reliability)
					}

					// Set article data ONCE with complete seller info
					setArticleData(data)

					// Check for cached analysis (local IndexedDB, then backend)
					const cached = await checkCachedAnalysis(data.vintedId)

					if (cached) {
						setAnalysis(cached.analysis)
						console.log(
							'[Vinted AI] Using cached analysis (from:',
							cached.fromCache ? 'local' : 'backend',
							')'
						)
					} else {
						// Trigger analysis with enriched seller data
						analyzeArticle(data)
					}
				} else {
					setError('Could not extract article data from page')
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Unknown error occurred'
				setError(message)
				console.error('[Vinted AI] Error loading article data:', err)
			} finally {
				setIsLoading(false)
			}
		}

		loadArticleData()
	}, [analyzeArticle, checkCachedAnalysis])

	// Handle sidebar toggle
	const handleOpenSidebar = useCallback(() => {
		setSidebarOpen(true)
	}, [])

	// Handle sidebar close
	const handleCloseSidebar = useCallback(() => {
		setSidebarOpen(false)
	}, [])

	// Handle sidebar toggle (for floating button)
	const handleToggleSidebar = useCallback(() => {
		setSidebarOpen((prev) => !prev)
	}, [])

	// Handle status update
	const handleUpdateStatus = useCallback(
		async (status: AnalysisStatus): Promise<void> => {
			if (!analysis) return

			const response = await sendMessage<AnalysisResult>({
				type: 'UPDATE_STATUS',
				vintedId: analysis.vintedId,
				status,
			})

			if (response.success && response.data) {
				// Status messages
				const statusMessages: Record<AnalysisStatus, string> = {
					ANALYZED: 'Statut réinitialisé',
					WATCHING: 'Article ajouté à la surveillance',
					BOUGHT: 'Article marqué comme acheté',
					SOLD: 'Article marqué comme vendu',
					ARCHIVED: 'Article archivé',
				}

				// Batch state updates together
				setAnalysis(response.data)
				success(statusMessages[status])

				console.log('[Vinted AI] Status updated to:', status)

				// Cache result before considering operation complete
				try {
					await cacheAnalysis(response.data)
				} catch (err) {
					console.error('[Vinted AI] Failed to cache analysis:', err)
				}
			} else {
				console.error('[Vinted AI] Failed to update status:', response.error)
				showError(response.error ?? 'Erreur lors de la mise à jour du statut')
			}
		},
		[analysis, sendMessage, success, showError]
	)

	// Handle export to markdown
	const handleExport = useCallback(async (): Promise<void> => {
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
			console.log('[Vinted AI] Export downloaded:', filename)
			success('Export téléchargé avec succès')
		} else {
			console.error('[Vinted AI] Export failed:', response.error)
			showError(response.error ?? "Erreur lors de l'export")
		}
	}, [analysis, sendMessage, success, showError])

	// Handle refresh analysis (force re-analysis, invalidate cache)
	const handleRefresh = useCallback(async (): Promise<void> => {
		if (!articleData) return
		// Force refresh bypasses cache and invalidates local cache
		await analyzeArticle(articleData, true)
	}, [articleData, analyzeArticle])

	// Handle retry after error
	const handleRetry = useCallback(async (): Promise<void> => {
		if (!articleData) return
		setIsRetrying(true)
		setError(null)
		try {
			await analyzeArticle(articleData, true)
		} finally {
			setIsRetrying(false)
		}
	}, [articleData, analyzeArticle])

	// Get analyzed time ago text
	const analyzedTimeAgo = analysis ? formatRelativeTime(analysis.analyzedAt) : null

	// Get phase message
	const getPhaseMessage = () => {
		switch (analysisPhase) {
			case 'downloading':
				return 'Téléchargement des images...'
			case 'analyzing':
				return 'Analyse IA en cours...'
			case 'complete':
				return 'Analyse terminée !'
			default:
				return 'Chargement...'
		}
	}

	// Loading state - show skeleton or minimal loader
	if (isLoading) {
		return (
			<>
				<div className="fixed top-4 right-4 bg-dark-elevated/95 backdrop-blur-sm rounded-xl shadow-glass border border-white/10 p-4 min-w-[200px] z-[2147483647]">
					<div className="flex items-center gap-2">
						<div className="w-4 h-4 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin" />
						<span className="text-sm text-white/70">Chargement de l'article...</span>
					</div>
				</div>
				<ToastContainer toasts={toasts} onDismiss={dismissToast} />
			</>
		)
	}

	// Error state with retry
	if (error && !analysis) {
		return (
			<>
				<ErrorDisplay
					message={error}
					onRetry={articleData ? handleRetry : undefined}
					isRetrying={isRetrying}
				/>
				<ToastContainer toasts={toasts} onDismiss={dismissToast} />
			</>
		)
	}

	// No data state
	if (!articleData) {
		return <ToastContainer toasts={toasts} onDismiss={dismissToast} />
	}

	// Main UI - Badge, Sidebar, Skeleton, FloatingButton, and Toasts
	return (
		<div className="vinted-ai-container">
			{/* Toast notifications container */}
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />

			{/* Badge component - shows score on main photo */}
			<Badge
				score={analysis?.opportunity.score ?? 0}
				marginPercent={analysis?.opportunity.marginPercent ?? 0}
				onOpenSidebar={handleOpenSidebar}
				isLoading={isAnalyzing && !analysis}
				loadingMessage={getPhaseMessage()}
			/>

			{/* Floating button - always visible on the right side when sidebar is closed */}
			<FloatingButton
				analysis={analysis}
				isOpen={sidebarOpen}
				onToggle={handleToggleSidebar}
				isLoading={isAnalyzing && !analysis}
			/>

			{/* Skeleton sidebar during initial analysis */}
			{isAnalyzing && !analysis && (
				<SkeletonSidebar isOpen={sidebarOpen} loadingMessage={getPhaseMessage()} />
			)}

			{/* Sidebar component - full analysis details panel */}
			{analysis && (
				<Sidebar
					analysis={analysis}
					isOpen={sidebarOpen}
					onClose={handleCloseSidebar}
					onUpdateStatus={handleUpdateStatus}
					onExport={handleExport}
					onRefresh={handleRefresh}
					cacheInfo={cacheInfo}
					isRefreshing={isAnalyzing}
					analyzedTimeAgo={analyzedTimeAgo}
					photos={articleData?.photos ?? []}
					seller={articleData?.seller}
				/>
			)}
		</div>
	)
}
