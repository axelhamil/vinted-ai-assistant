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
	| 'DELETE_PORTFOLIO_ITEM'
	// Studio messages
	| 'STUDIO_GET_PRESETS'
	| 'STUDIO_EDIT_PHOTO'
	| 'STUDIO_EDIT_PHOTO_BATCH'
	| 'STUDIO_EDIT_PHOTO_CUSTOM'
	| 'STUDIO_ANALYZE_FORM'
	| 'STUDIO_CREATE_PRESET'
	| 'STUDIO_DELETE_PRESET'

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

export interface DeletePortfolioItemMessage extends BaseMessage {
	type: 'DELETE_PORTFOLIO_ITEM'
	vintedId: string
}

// ============================================================================
// Studio Messages
// ============================================================================

export interface StudioGetPresetsMessage extends BaseMessage {
	type: 'STUDIO_GET_PRESETS'
	filter?: 'system' | 'custom' | 'all'
}

export interface StudioEditPhotoMessage extends BaseMessage {
	type: 'STUDIO_EDIT_PHOTO'
	image: string
	presetId: string
	variables?: Record<string, string>
	stripMetadata?: boolean
}

export interface StudioEditPhotoBatchMessage extends BaseMessage {
	type: 'STUDIO_EDIT_PHOTO_BATCH'
	images: string[]
	presetId: string
	variables?: Record<string, string>
	stripMetadata?: boolean
}

export interface StudioEditPhotoCustomMessage extends BaseMessage {
	type: 'STUDIO_EDIT_PHOTO_CUSTOM'
	image: string
	promptTemplate: string
	variables?: Record<string, string>
	stripMetadata?: boolean
}

export interface StudioAnalyzeFormMessage extends BaseMessage {
	type: 'STUDIO_ANALYZE_FORM'
	photos: string[]
	existingTitle?: string
	language?: string
}

export interface StudioCreatePresetMessage extends BaseMessage {
	type: 'STUDIO_CREATE_PRESET'
	name: string
	description?: string
	promptTemplate: string
	previewImage?: string
}

export interface StudioDeletePresetMessage extends BaseMessage {
	type: 'STUDIO_DELETE_PRESET'
	presetId: string
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
	| DeletePortfolioItemMessage
	// Studio messages
	| StudioGetPresetsMessage
	| StudioEditPhotoMessage
	| StudioEditPhotoBatchMessage
	| StudioEditPhotoCustomMessage
	| StudioAnalyzeFormMessage
	| StudioCreatePresetMessage
	| StudioDeletePresetMessage

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

// ============================================================================
// Studio Response Types
// ============================================================================

export interface StudioPreset {
	id: string
	name: string
	description: string | null
	promptTemplate: string
	type: 'system' | 'custom'
	previewImage: string | null
	sortOrder: number
	createdAt: string
	updatedAt: string
}

export interface StudioPresetListResponse {
	presets: StudioPreset[]
	total: number
}

export interface StudioEditedPhotoResponse {
	imageBase64: string
	mimeType: string
	dataUrl: string
}

export interface StudioBatchEditResult {
	success: boolean
	imageBase64?: string
	mimeType?: string
	dataUrl?: string
	error?: string
}

export interface StudioBatchEditResponse {
	results: StudioBatchEditResult[]
	successCount: number
	failedCount: number
}

export interface StudioFormSuggestionsResponse {
	suggestedTitle: string
	suggestedDescription: string
	suggestedCondition: 'new_with_tags' | 'new' | 'very_good' | 'good' | 'satisfactory'
	suggestedBrand: string | null
	suggestedColors: string[]
	suggestedCategory: string | null
	suggestedSize: string | null
	suggestedMaterial: string | null
	suggestedPrice: number
	priceRange: {
		low: number
		high: number
	}
	priceConfidence: 'low' | 'medium' | 'high'
	priceReasoning: string
}

// Re-export for convenience
export type { AnalysisResult, Negotiation, NegotiationTone, VintedArticleData }
