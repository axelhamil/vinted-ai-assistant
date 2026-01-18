/**
 * Background service worker for Vinted AI Assistant
 * Event listeners and initialization only - logic delegated to modules
 */

import { handleMessage } from './message-handler'
import type { ExtensionMessage } from './message-types'
import { getSettings, getState, updateBadge } from './state-manager'

// Re-export types for external use
export type {
	AIProvider,
	ApiResponse,
	ExportMarkdownResponse,
	ExtensionMessage,
	ExtensionSettings,
	ExtensionState,
	PortfolioItem,
	PortfolioResponse,
	PortfolioStatsResponse,
	StatsResponse,
} from './message-types'

// ============================================================================
// Event Listeners
// ============================================================================

// Listen for extension installation
chrome.runtime.onInstalled.addListener(async () => {
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
	const state = await getState()
	await updateBadge(state.todayAnalyzedCount)
})
