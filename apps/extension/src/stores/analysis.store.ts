import type { AnalysisResult, AnalysisStatus, VintedArticleData } from '@vinted-ai/shared'
import { create } from 'zustand'
import { cacheAnalysis, getCacheTimeRemaining, getCachedAnalysis, invalidateCache } from '../db'

// ============================================================================
// Types
// ============================================================================

interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

interface ExportMarkdownResponse {
	content: string
	filename: string
}

interface ExtensionSettings {
	backendUrl: string
	scoreThreshold: number
	autoOpenSidebar: boolean
	enabled: boolean
	openaiApiKey: string
}

interface CacheInfo {
	fromCache: boolean
	timeRemaining: number
}

interface AnalysisState {
	// Article data from DOM
	articleData: VintedArticleData | null

	// Analysis result from backend
	currentAnalysis: AnalysisResult | null

	// UI state
	isLoading: boolean
	isAnalyzing: boolean
	error: string | null
	sidebarOpen: boolean

	// Cache info
	cacheInfo: CacheInfo | null

	// Settings (persisted in chrome.storage)
	settings: ExtensionSettings
}

interface AnalysisActions {
	// Article actions
	setArticleData: (data: VintedArticleData | null) => void

	// Analysis actions
	analyze: (data: VintedArticleData, forceRefresh?: boolean) => Promise<void>
	checkCachedAnalysis: (vintedId: string) => Promise<AnalysisResult | null>
	setAnalysis: (analysis: AnalysisResult | null) => void
	updateStatus: (status: AnalysisStatus) => Promise<void>
	exportMarkdown: () => Promise<void>
	refresh: () => Promise<void>

	// UI actions
	setLoading: (loading: boolean) => void
	setError: (error: string | null) => void
	clearError: () => void
	toggleSidebar: () => void
	openSidebar: () => void
	closeSidebar: () => void

	// Settings actions
	loadSettings: () => Promise<void>
	updateSettings: (settings: Partial<ExtensionSettings>) => Promise<void>

	// Reset
	reset: () => void
}

type AnalysisStore = AnalysisState & AnalysisActions

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SETTINGS: ExtensionSettings = {
	backendUrl: 'http://localhost:3000',
	scoreThreshold: 7,
	autoOpenSidebar: true,
	enabled: true,
	openaiApiKey: '',
}

// ============================================================================
// Chrome Message Helper
// ============================================================================

function sendMessage<T>(message: Record<string, unknown>): Promise<ApiResponse<T>> {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response: ApiResponse<T>) => {
			resolve(response)
		})
	})
}

// ============================================================================
// Store
// ============================================================================

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
	// Initial state
	articleData: null,
	currentAnalysis: null,
	isLoading: false,
	isAnalyzing: false,
	error: null,
	sidebarOpen: false,
	cacheInfo: null,
	settings: DEFAULT_SETTINGS,

	// Article actions
	setArticleData: (data) => set({ articleData: data }),

	// Analysis actions
	analyze: async (data, forceRefresh = false) => {
		set({ isAnalyzing: true, cacheInfo: null, error: null })

		try {
			// Invalidate cache if forcing refresh
			if (forceRefresh) {
				await invalidateCache(data.vintedId)
			}

			const response = await sendMessage<AnalysisResult>({
				type: 'ANALYZE_ARTICLE',
				data,
			})

			if (response.success && response.data) {
				// Cache the analysis result locally
				await cacheAnalysis(response.data)
				set({
					currentAnalysis: response.data,
					cacheInfo: { fromCache: false, timeRemaining: 0 },
				})
				console.log('[Vinted AI Store] Analysis complete:', response.data.opportunity.score)
			} else {
				console.error('[Vinted AI Store] Analysis failed:', response.error)
				set({ error: response.error ?? 'Analysis failed' })
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error'
			console.error('[Vinted AI Store] Error analyzing article:', err)
			set({ error: message })
		} finally {
			set({ isAnalyzing: false })
		}
	},

	checkCachedAnalysis: async (vintedId) => {
		// First check local IndexedDB cache
		const localCached = await getCachedAnalysis(vintedId)
		if (localCached) {
			const timeRemaining = await getCacheTimeRemaining(vintedId)
			set({
				currentAnalysis: localCached,
				cacheInfo: { fromCache: true, timeRemaining },
			})
			console.log(
				'[Vinted AI Store] Found in local cache, TTL remaining:',
				Math.round(timeRemaining / 1000),
				's'
			)
			return localCached
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
			set({
				currentAnalysis: response.data,
				cacheInfo: { fromCache: true, timeRemaining },
			})
			return response.data
		}

		return null
	},

	setAnalysis: (analysis) => set({ currentAnalysis: analysis }),

	updateStatus: async (status) => {
		const { currentAnalysis } = get()
		if (!currentAnalysis) return

		const response = await sendMessage<AnalysisResult>({
			type: 'UPDATE_STATUS',
			vintedId: currentAnalysis.vintedId,
			status,
		})

		if (response.success && response.data) {
			set({ currentAnalysis: response.data })
			console.log('[Vinted AI Store] Status updated to:', status)
		} else {
			console.error('[Vinted AI Store] Failed to update status:', response.error)
		}
	},

	exportMarkdown: async () => {
		const { currentAnalysis } = get()
		if (!currentAnalysis) return

		const response = await sendMessage<ExportMarkdownResponse>({
			type: 'EXPORT_MARKDOWN',
			vintedId: currentAnalysis.vintedId,
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
			console.log('[Vinted AI Store] Export downloaded:', filename)
		} else {
			console.error('[Vinted AI Store] Export failed:', response.error)
		}
	},

	refresh: async () => {
		const { articleData, analyze } = get()
		if (!articleData) return
		// Force refresh bypasses cache and invalidates local cache
		await analyze(articleData, true)
	},

	// UI actions
	setLoading: (loading) => set({ isLoading: loading }),

	setError: (error) => set({ error }),

	clearError: () => set({ error: null }),

	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

	openSidebar: () => set({ sidebarOpen: true }),

	closeSidebar: () => set({ sidebarOpen: false }),

	// Settings actions
	loadSettings: async () => {
		const response = await sendMessage<ExtensionSettings>({
			type: 'GET_SETTINGS',
		})

		if (response.success && response.data) {
			set({ settings: response.data })
			console.log('[Vinted AI Store] Settings loaded:', response.data)
		}
	},

	updateSettings: async (newSettings) => {
		const response = await sendMessage<ExtensionSettings>({
			type: 'UPDATE_SETTINGS',
			settings: newSettings,
		})

		if (response.success && response.data) {
			set({ settings: response.data })
			console.log('[Vinted AI Store] Settings updated:', response.data)
		}
	},

	// Reset
	reset: () =>
		set({
			articleData: null,
			currentAnalysis: null,
			isLoading: false,
			isAnalyzing: false,
			error: null,
			sidebarOpen: false,
			cacheInfo: null,
		}),
}))

// ============================================================================
// Selectors (for performance optimization)
// ============================================================================

export const selectArticleData = (state: AnalysisStore) => state.articleData
export const selectCurrentAnalysis = (state: AnalysisStore) => state.currentAnalysis
export const selectIsLoading = (state: AnalysisStore) => state.isLoading
export const selectIsAnalyzing = (state: AnalysisStore) => state.isAnalyzing
export const selectError = (state: AnalysisStore) => state.error
export const selectSidebarOpen = (state: AnalysisStore) => state.sidebarOpen
export const selectCacheInfo = (state: AnalysisStore) => state.cacheInfo
export const selectSettings = (state: AnalysisStore) => state.settings

// Derived selectors
export const selectOpportunityScore = (state: AnalysisStore) =>
	state.currentAnalysis?.opportunity.score ?? 0
export const selectMarginPercent = (state: AnalysisStore) =>
	state.currentAnalysis?.opportunity.marginPercent ?? 0
export const selectIsHighOpportunity = (state: AnalysisStore) => {
	const score = state.currentAnalysis?.opportunity.score ?? 0
	return score >= state.settings.scoreThreshold
}
