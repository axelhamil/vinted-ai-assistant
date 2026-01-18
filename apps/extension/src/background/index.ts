// Background service worker for Vinted AI Assistant
// Handles communication between content scripts and backend API

import type { AnalysisResult, VintedArticleData } from '@vinted-ai/shared'

// ============================================================================
// Types
// ============================================================================

interface ExtensionSettings {
	backendUrl: string
	scoreThreshold: number
	autoOpenSidebar: boolean
	enabled: boolean
}

interface ExtensionState {
	enabled: boolean
	todayAnalyzedCount: number
	lastResetDate: string
}

type MessageType =
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

interface BaseMessage {
	type: MessageType
}

interface AnalyzeArticleMessage extends BaseMessage {
	type: 'ANALYZE_ARTICLE'
	data: VintedArticleData
}

interface GetAnalysisMessage extends BaseMessage {
	type: 'GET_ANALYSIS'
	vintedId: string
}

interface UpdateStatusMessage extends BaseMessage {
	type: 'UPDATE_STATUS'
	vintedId: string
	status: string
}

interface ExportMarkdownMessage extends BaseMessage {
	type: 'EXPORT_MARKDOWN'
	vintedId: string
}

interface GetStatsMessage extends BaseMessage {
	type: 'GET_STATS'
}

interface GetSettingsMessage extends BaseMessage {
	type: 'GET_SETTINGS'
}

interface UpdateSettingsMessage extends BaseMessage {
	type: 'UPDATE_SETTINGS'
	settings: Partial<ExtensionSettings>
}

interface GetStateMessage extends BaseMessage {
	type: 'GET_STATE'
}

interface ToggleExtensionMessage extends BaseMessage {
	type: 'TOGGLE_EXTENSION'
	enabled?: boolean
}

interface CheckBackendStatusMessage extends BaseMessage {
	type: 'CHECK_BACKEND_STATUS'
}

type ExtensionMessage =
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

interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

interface BackendHealthResponse {
	status: string
	aiProvider: string
}

interface StatsResponse {
	today: number
	opportunities: number
	bought: number
	sold: number
}

interface ExportMarkdownResponse {
	content: string
	filename: string
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SETTINGS: ExtensionSettings = {
	backendUrl: 'http://localhost:3000',
	scoreThreshold: 7,
	autoOpenSidebar: true,
	enabled: true,
}

const STORAGE_KEYS = {
	SETTINGS: 'vinted_ai_settings',
	STATE: 'vinted_ai_state',
} as const

// ============================================================================
// State Management
// ============================================================================

async function getSettings(): Promise<ExtensionSettings> {
	const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)
	return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] }
}

async function saveSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
	const current = await getSettings()
	const updated = { ...current, ...settings }
	await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated })
	return updated
}

async function getState(): Promise<ExtensionState> {
	const result = await chrome.storage.local.get(STORAGE_KEYS.STATE)
	const today = new Date().toISOString().split('T')[0] as string

	const defaultState: ExtensionState = {
		enabled: true,
		todayAnalyzedCount: 0,
		lastResetDate: today,
	}

	const state = { ...defaultState, ...result[STORAGE_KEYS.STATE] }

	// Reset counter if it's a new day
	if (state.lastResetDate !== today) {
		state.todayAnalyzedCount = 0
		state.lastResetDate = today
		await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state })
	}

	return state
}

async function incrementAnalyzedCount(): Promise<void> {
	const state = await getState()
	state.todayAnalyzedCount += 1
	await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state })
	await updateBadge(state.todayAnalyzedCount)
}

async function updateBadge(count: number): Promise<void> {
	const text = count > 0 ? count.toString() : ''
	await chrome.action.setBadgeText({ text })
	await chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' })
}

async function toggleExtension(enabled?: boolean): Promise<boolean> {
	const state = await getState()
	const newEnabled = enabled ?? !state.enabled
	state.enabled = newEnabled
	await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state })
	return newEnabled
}

// ============================================================================
// API Client
// ============================================================================

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
	const settings = await getSettings()
	const url = `${settings.backendUrl}${endpoint}`

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			return {
				success: false,
				error:
					errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
			}
		}

		// Handle markdown export (returns text, not JSON)
		const contentType = response.headers.get('Content-Type')
		if (contentType?.includes('text/markdown')) {
			const text = await response.text()
			return { success: true, data: text as T }
		}

		const data = await response.json()
		return { success: true, data }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		return { success: false, error: `Network error: ${errorMessage}` }
	}
}

async function checkBackendStatus(): Promise<ApiResponse<BackendHealthResponse>> {
	return apiRequest<BackendHealthResponse>('/api/health')
}

async function analyzeArticle(
	articleData: VintedArticleData
): Promise<ApiResponse<AnalysisResult>> {
	// Convert Date objects to ISO strings for JSON serialization
	const payload = {
		...articleData,
		listedAt: articleData.listedAt?.toISOString() ?? null,
	}

	const result = await apiRequest<AnalysisResult>('/api/analyze', {
		method: 'POST',
		body: JSON.stringify(payload),
	})

	if (result.success) {
		await incrementAnalyzedCount()
	}

	return result
}

async function getAnalysis(vintedId: string): Promise<ApiResponse<AnalysisResult>> {
	return apiRequest<AnalysisResult>(`/api/analyses/${vintedId}`)
}

async function updateAnalysisStatus(
	vintedId: string,
	status: string
): Promise<ApiResponse<AnalysisResult>> {
	return apiRequest<AnalysisResult>(`/api/analyses/${vintedId}/status`, {
		method: 'PATCH',
		body: JSON.stringify({ status }),
	})
}

async function exportMarkdown(vintedId: string): Promise<ApiResponse<ExportMarkdownResponse>> {
	const settings = await getSettings()
	const url = `${settings.backendUrl}/api/analyses/${vintedId}/export`

	try {
		const response = await fetch(url, {
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			return {
				success: false,
				error:
					errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
			}
		}

		const content = await response.text()

		// Extract filename from Content-Disposition header
		const contentDisposition = response.headers.get('Content-Disposition')
		let filename = 'analysis.md'

		if (contentDisposition) {
			// Parse filename from Content-Disposition: attachment; filename="something.md"
			const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i)
			if (filenameMatch?.[1]) {
				filename = filenameMatch[1]
			}
		}

		return { success: true, data: { content, filename } }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		return { success: false, error: `Network error: ${errorMessage}` }
	}
}

async function getStats(): Promise<ApiResponse<StatsResponse>> {
	return apiRequest<StatsResponse>('/api/stats')
}

// ============================================================================
// Message Handlers
// ============================================================================

async function handleMessage(message: ExtensionMessage): Promise<ApiResponse<unknown>> {
	// Check if extension is enabled (except for settings/state/toggle messages)
	const bypassEnabledCheck = [
		'GET_SETTINGS',
		'UPDATE_SETTINGS',
		'GET_STATE',
		'TOGGLE_EXTENSION',
		'CHECK_BACKEND_STATUS',
	]

	if (!bypassEnabledCheck.includes(message.type)) {
		const state = await getState()
		if (!state.enabled) {
			return { success: false, error: 'Extension is disabled' }
		}
	}

	switch (message.type) {
		case 'ANALYZE_ARTICLE':
			return analyzeArticle(message.data)

		case 'GET_ANALYSIS':
			return getAnalysis(message.vintedId)

		case 'UPDATE_STATUS':
			return updateAnalysisStatus(message.vintedId, message.status)

		case 'EXPORT_MARKDOWN':
			return exportMarkdown(message.vintedId)

		case 'GET_STATS':
			return getStats()

		case 'GET_SETTINGS':
			return { success: true, data: await getSettings() }

		case 'UPDATE_SETTINGS':
			return { success: true, data: await saveSettings(message.settings) }

		case 'GET_STATE':
			return { success: true, data: await getState() }

		case 'TOGGLE_EXTENSION': {
			const enabled = await toggleExtension(message.enabled)
			return { success: true, data: { enabled } }
		}

		case 'CHECK_BACKEND_STATUS':
			return checkBackendStatus()

		default:
			return { success: false, error: 'Unknown message type' }
	}
}

// ============================================================================
// Event Listeners
// ============================================================================

// Listen for extension installation
chrome.runtime.onInstalled.addListener(async () => {
	console.log('Vinted AI Assistant installed')

	// Initialize settings and state
	await getSettings()
	const state = await getState()
	await updateBadge(state.todayAnalyzedCount)
})

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	handleMessage(message as ExtensionMessage)
		.then(sendResponse)
		.catch((error) => {
			console.error('Error handling message:', error)
			sendResponse({
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			})
		})

	// Return true to keep the message channel open for async responses
	return true
})

// Listen for startup to reset badge
chrome.runtime.onStartup.addListener(async () => {
	console.log('Vinted AI Assistant started')
	const state = await getState()
	await updateBadge(state.todayAnalyzedCount)
})

console.log('Vinted AI Assistant - Background service worker loaded')

export type {
	ExtensionMessage,
	ExtensionSettings,
	ExtensionState,
	ApiResponse,
	StatsResponse,
	ExportMarkdownResponse,
}
