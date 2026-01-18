/**
 * Analysis store - Main Zustand store for article analysis state
 */

import { create } from 'zustand'
import { cacheAnalysis, getCacheTimeRemaining, getCachedAnalysis, invalidateCache } from '../db'
import { downloadFile, sendMessage } from './helpers'
import type {
	AnalysisResult,
	AnalysisStore,
	ExportMarkdownResponse,
	ExtensionSettings,
	Negotiation,
	NegotiationTone,
} from './types'
import { DEFAULT_SETTINGS } from './types'

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
			} else {
				set({ error: response.error ?? 'Analysis failed' })
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error'
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
			downloadFile(content, filename, 'text/markdown')
		}
	},

	refresh: async () => {
		const { articleData, analyze } = get()
		if (!articleData) return
		// Force refresh bypasses cache and invalidates local cache
		await analyze(articleData, true)
	},

	regenerateNegotiation: async (tone: NegotiationTone) => {
		const { currentAnalysis } = get()
		if (!currentAnalysis) return null

		const response = await sendMessage<Negotiation>({
			type: 'REGENERATE_NEGOTIATION',
			vintedId: currentAnalysis.vintedId,
			tone,
		})

		if (response.success && response.data) {
			return response.data
		}

		return null
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
		}
	},

	updateSettings: async (newSettings) => {
		const response = await sendMessage<ExtensionSettings>({
			type: 'UPDATE_SETTINGS',
			settings: newSettings,
		})

		if (response.success && response.data) {
			set({ settings: response.data })
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
