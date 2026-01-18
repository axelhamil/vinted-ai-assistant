import type { AnalysisResult, AnalysisStatus, VintedArticleData } from '@vinted-ai/shared'
import { useCallback, useEffect, useState } from 'react'
import { Badge, Sidebar } from './components'
import { parseVintedArticle, waitForPageLoad } from './lib/parser'

interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

/**
 * Main content script App component
 * Renders the analysis UI (Badge and Sidebar) when on a Vinted article page
 */
export function App() {
	const [articleData, setArticleData] = useState<VintedArticleData | null>(null)
	const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isAnalyzing, setIsAnalyzing] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [sidebarOpen, setSidebarOpen] = useState(false)

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

	// Analyze article via backend
	const analyzeArticle = useCallback(
		async (data: VintedArticleData): Promise<void> => {
			setIsAnalyzing(true)
			try {
				const response = await sendMessage<AnalysisResult>({
					type: 'ANALYZE_ARTICLE',
					data,
				})

				if (response.success && response.data) {
					setAnalysis(response.data)
					console.log('[Vinted AI] Analysis complete:', response.data.opportunity.score)
				} else {
					console.error('[Vinted AI] Analysis failed:', response.error)
					// Don't show error to user for analysis failure, just log it
				}
			} catch (err) {
				console.error('[Vinted AI] Error analyzing article:', err)
			} finally {
				setIsAnalyzing(false)
			}
		},
		[sendMessage]
	)

	// Check for cached analysis
	const checkCachedAnalysis = useCallback(
		async (vintedId: string): Promise<AnalysisResult | null> => {
			const response = await sendMessage<AnalysisResult>({
				type: 'GET_ANALYSIS',
				vintedId,
			})

			if (response.success && response.data) {
				return response.data
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

				// Wait for page to fully load
				await waitForPageLoad()

				// Parse article data from DOM
				const data = parseVintedArticle()

				if (data) {
					setArticleData(data)
					console.log('[Vinted AI] Article data extracted:', data.vintedId)

					// Check for cached analysis first
					const cached = await checkCachedAnalysis(data.vintedId)
					if (cached) {
						setAnalysis(cached)
						console.log('[Vinted AI] Using cached analysis')
					} else {
						// Trigger analysis
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
				setAnalysis(response.data)
				console.log('[Vinted AI] Status updated to:', status)
			} else {
				console.error('[Vinted AI] Failed to update status:', response.error)
			}
		},
		[analysis, sendMessage]
	)

	// Handle export to markdown
	const handleExport = useCallback(async (): Promise<void> => {
		if (!analysis) return

		const response = await sendMessage<string>({
			type: 'EXPORT_MARKDOWN',
			vintedId: analysis.vintedId,
		})

		if (response.success && response.data) {
			// Create and trigger download
			const blob = new Blob([response.data], { type: 'text/markdown' })
			const url = URL.createObjectURL(blob)
			const link = document.createElement('a')
			const filename = `${analysis.brand ?? 'vinted'}_${analysis.title.slice(0, 30).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.md`
			link.href = url
			link.download = filename
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)
			console.log('[Vinted AI] Export downloaded:', filename)
		} else {
			console.error('[Vinted AI] Export failed:', response.error)
		}
	}, [analysis, sendMessage])

	// Handle refresh analysis
	const handleRefresh = useCallback(async (): Promise<void> => {
		if (!articleData) return
		await analyzeArticle(articleData)
	}, [articleData, analyzeArticle])

	// Loading state
	if (isLoading) {
		return (
			<div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
					<span className="text-sm text-gray-600">Analyzing...</span>
				</div>
			</div>
		)
	}

	// Error state
	if (error) {
		return (
			<div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[200px]">
				<div className="flex items-center gap-2 text-red-500">
					<span className="text-sm">{error}</span>
				</div>
			</div>
		)
	}

	// No data state
	if (!articleData) {
		return null
	}

	// Main UI - Badge and Sidebar
	return (
		<div className="vinted-ai-container">
			{/* Badge component - shows score on main photo */}
			<Badge
				score={analysis?.opportunity.score ?? 0}
				marginPercent={analysis?.opportunity.marginPercent ?? 0}
				onOpenSidebar={handleOpenSidebar}
				isLoading={isAnalyzing}
			/>

			{/* Sidebar component - full analysis details panel */}
			{analysis && (
				<Sidebar
					analysis={analysis}
					isOpen={sidebarOpen}
					onClose={handleCloseSidebar}
					onUpdateStatus={handleUpdateStatus}
					onExport={handleExport}
					onRefresh={handleRefresh}
				/>
			)}
		</div>
	)
}
