/**
 * Message types and interfaces for background service worker communication
 */

import type { AnalysisResult, Negotiation, NegotiationTone } from '@vinted-ai/shared/analysis'
import type { VintedArticleData } from '@vinted-ai/shared/article'

// ============================================================================
// AI Provider
// ============================================================================

export type AIProvider = 'openai' | 'gemini'

// ============================================================================
// Extension Settings & State
// ============================================================================

export interface ExtensionSettings {
	backendUrl: string
	scoreThreshold: number
	autoOpenSidebar: boolean
	enabled: boolean
	aiProvider: AIProvider
	openaiApiKey: string
	geminiApiKey: string
}

export interface ExtensionState {
	enabled: boolean
	todayAnalyzedCount: number
	lastResetDate: string
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageType =
	| 'ANALYZE_ARTICLE'
	| 'GET_ANALYSIS'
	| 'UPDATE_STATUS'
	| 'EXPORT_MARKDOWN'
	| 'GET_STATS'
	| 'GET_SETTINGS'
	| 'UPDATE_SETTINGS'
	| 'GET_STATE'
	| 'TOGGLE_EXTENSION'
	| 'CHECK_BACKEND_STATUS'
	| 'REGENERATE_NEGOTIATION'
	| 'GET_PORTFOLIO'
	| 'GET_PORTFOLIO_STATS'

interface BaseMessage {
	type: MessageType
}

export interface AnalyzeArticleMessage extends BaseMessage {
	type: 'ANALYZE_ARTICLE'
	data: VintedArticleData & { forceRefresh?: boolean }
}

export interface GetAnalysisMessage extends BaseMessage {
	type: 'GET_ANALYSIS'
	vintedId: string
}

export interface UpdateStatusMessage extends BaseMessage {
	type: 'UPDATE_STATUS'
	vintedId: string
	status: string
}

export interface ExportMarkdownMessage extends BaseMessage {
	type: 'EXPORT_MARKDOWN'
	vintedId: string
}

export interface GetStatsMessage extends BaseMessage {
	type: 'GET_STATS'
}

export interface GetSettingsMessage extends BaseMessage {
	type: 'GET_SETTINGS'
}

export interface UpdateSettingsMessage extends BaseMessage {
	type: 'UPDATE_SETTINGS'
	settings: Partial<ExtensionSettings>
}

export interface GetStateMessage extends BaseMessage {
	type: 'GET_STATE'
}

export interface ToggleExtensionMessage extends BaseMessage {
	type: 'TOGGLE_EXTENSION'
	enabled?: boolean
}

export interface CheckBackendStatusMessage extends BaseMessage {
	type: 'CHECK_BACKEND_STATUS'
}

export interface RegenerateNegotiationMessage extends BaseMessage {
	type: 'REGENERATE_NEGOTIATION'
	vintedId: string
	tone: NegotiationTone
}

export interface GetPortfolioMessage extends BaseMessage {
	type: 'GET_PORTFOLIO'
	filter: {
		status?: 'WATCHING' | 'BOUGHT' | 'SOLD'
		minScore?: number
		limit?: number
		offset?: number
	}
}

export interface GetPortfolioStatsMessage extends BaseMessage {
	type: 'GET_PORTFOLIO_STATS'
}

export type ExtensionMessage =
	| AnalyzeArticleMessage
	| GetAnalysisMessage
	| UpdateStatusMessage
	| ExportMarkdownMessage
	| GetStatsMessage
	| GetSettingsMessage
	| UpdateSettingsMessage
	| GetStateMessage
	| ToggleExtensionMessage
	| CheckBackendStatusMessage
	| RegenerateNegotiationMessage
	| GetPortfolioMessage
	| GetPortfolioStatsMessage

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

export interface BackendHealthResponse {
	status: string
	aiProvider: string
}

export interface StatsResponse {
	today: number
	opportunities: number
	bought: number
	sold: number
}

export interface ExportMarkdownResponse {
	content: string
	filename: string
}

export interface PortfolioItem {
	vintedId: string
	title: string
	price: number
	imageUrl: string | null
	score: number
	status: string
	analyzedAt: string
	url: string
}

export interface PortfolioResponse {
	items: PortfolioItem[]
	total: number
	hasMore: boolean
}

export interface PortfolioStatsResponse {
	watching: number
	bought: number
	sold: number
	opportunities: number
}

// Re-export for convenience
export type { AnalysisResult, Negotiation, NegotiationTone, VintedArticleData }
