import type { VintedArticleData } from '@vinted-ai/shared'
import { useEffect, useState } from 'react'
import { parseVintedArticle, waitForPageLoad } from './lib/parser'

/**
 * Main content script App component
 * Renders the analysis UI (Badge and Sidebar) when on a Vinted article page
 */
export function App() {
	const [articleData, setArticleData] = useState<VintedArticleData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

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

	// Main UI - Badge and Sidebar will be added in later tasks
	return (
		<div className="vinted-ai-container">
			{/* Badge component will be rendered here (Task 20) */}
			{/* Sidebar component will be rendered here (Task 21) */}

			{/* Temporary debug display */}
			<div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-[300px] border border-gray-200">
				<div className="text-sm font-semibold text-gray-800 mb-2">Vinted AI Assistant</div>
				<div className="text-xs text-gray-600 space-y-1">
					<div>
						<span className="font-medium">Article:</span> {articleData.title}
					</div>
					<div>
						<span className="font-medium">Price:</span> {articleData.price}
					</div>
					<div>
						<span className="font-medium">Brand:</span> {articleData.brand || 'N/A'}
					</div>
					<div>
						<span className="font-medium">Photos:</span> {articleData.photos.length}
					</div>
				</div>
			</div>
		</div>
	)
}
