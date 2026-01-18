/**
 * Store types and interfaces
 */

import type { AnalysisResult, AnalysisStatus, Negotiation, NegotiationTone } from '@vinted-ai/shared/analysis'
import type { VintedArticleData } from '@vinted-ai/shared/article'

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

export interface ExportMarkdownResponse {
	content: string
	filename: string
}

// ============================================================================
// Settings Types
// ============================================================================

export interface ExtensionSettings {
	backendUrl: string
	scoreThreshold: number
	autoOpenSidebar: boolean
	enabled: boolean
	openaiApiKey: string
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
	backendUrl: 'http://localhost:3000',
	scoreThreshold: 7,
	autoOpenSidebar: true,
	enabled: true,
	openaiApiKey: '',
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheInfo {
	fromCache: boolean
	timeRemaining: number
}

// ============================================================================
// UI State Types
// ============================================================================

export interface UIState {
	isLoading: boolean
	isAnalyzing: boolean
	error: string | null
	sidebarOpen: boolean
}

// ============================================================================
// Analysis State Types
// ============================================================================

export interface AnalysisState extends UIState {
	// Article data from DOM
	articleData: VintedArticleData | null

	// Analysis result from backend
	currentAnalysis: AnalysisResult | null

	// Cache info
	cacheInfo: CacheInfo | null

	// Settings (persisted in chrome.storage)
	settings: ExtensionSettings
}

// ============================================================================
// Action Types
// ============================================================================

export interface AnalysisActions {
	// Article actions
	setArticleData: (data: VintedArticleData | null) => void

	// Analysis actions
	analyze: (data: VintedArticleData, forceRefresh?: boolean) => Promise<void>
	checkCachedAnalysis: (vintedId: string) => Promise<AnalysisResult | null>
	setAnalysis: (analysis: AnalysisResult | null) => void
	updateStatus: (status: AnalysisStatus) => Promise<void>
	exportMarkdown: () => Promise<void>
	refresh: () => Promise<void>
	regenerateNegotiation: (tone: NegotiationTone) => Promise<Negotiation | null>

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

export type AnalysisStore = AnalysisState & AnalysisActions

// Re-export shared types for convenience
export type { AnalysisResult, AnalysisStatus, Negotiation, NegotiationTone, VintedArticleData }
