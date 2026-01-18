/**
 * Message handler for routing extension messages
 */

import type { ApiResponse, ExtensionMessage } from './message-types'
import {
	analyzeArticle,
	checkBackendStatus,
	exportMarkdown,
	getAnalysis,
	getPortfolio,
	getPortfolioStats,
	getStats,
	regenerateNegotiation,
	updateAnalysisStatus,
} from './api-client'
import { getSettings, getState, saveSettings, toggleExtension } from './state-manager'

// Messages that don't require extension to be enabled
const BYPASS_ENABLED_CHECK = [
	'GET_SETTINGS',
	'UPDATE_SETTINGS',
	'GET_STATE',
	'TOGGLE_EXTENSION',
	'CHECK_BACKEND_STATUS',
] as const

/**
 * Main message handler that routes messages to appropriate handlers
 */
export async function handleMessage(message: ExtensionMessage): Promise<ApiResponse<unknown>> {
	// Check if extension is enabled (except for settings/state/toggle messages)
	if (!BYPASS_ENABLED_CHECK.includes(message.type as (typeof BYPASS_ENABLED_CHECK)[number])) {
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

		case 'REGENERATE_NEGOTIATION':
			return regenerateNegotiation(message.vintedId, message.tone)

		case 'GET_PORTFOLIO':
			return getPortfolio(message.filter)

		case 'GET_PORTFOLIO_STATS':
			return getPortfolioStats()

		default:
			return { success: false, error: 'Unknown message type' }
	}
}
