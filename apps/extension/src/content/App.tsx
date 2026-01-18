import type { AnalysisResult, VintedArticleData } from '@vinted-ai/shared'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from './components'
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

			{/* Sidebar component will be rendered here (Task 21) */}
			{sidebarOpen && (
				<div className="fixed top-0 right-0 w-96 h-full bg-white shadow-2xl border-l border-gray-200 z-[2147483647] overflow-y-auto">
					<div className="p-4">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-gray-800">Analyse IA</h2>
							<button
								type="button"
								onClick={() => setSidebarOpen(false)}
								className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
								aria-label="Fermer"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						{/* Placeholder content until Sidebar component is implemented in Task 21 */}
						{analysis ? (
							<div className="space-y-4">
								<div className="text-center p-4 bg-gray-50 rounded-lg">
									<div className="text-3xl font-bold text-gray-800">
										{analysis.opportunity.score}/10
									</div>
									<div className="text-sm text-gray-600 mt-1">Score d'opportunité</div>
								</div>

								<div className="p-3 bg-green-50 rounded-lg border border-green-200">
									<div className="text-sm font-medium text-green-800">Marge potentielle</div>
									<div className="text-lg font-bold text-green-600">
										+{analysis.opportunity.margin.toFixed(0)}€ (
										{analysis.opportunity.marginPercent.toFixed(0)}%)
									</div>
								</div>

								<div className="text-xs text-gray-500 text-center">
									Sidebar complète à venir (Task 21)
								</div>
							</div>
						) : (
							<div className="text-center text-gray-500">Analyse en cours...</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
