/**
 * Message handler for routing extension messages
 */

import {
	analyzeArticle,
	checkBackendStatus,
	deletePortfolioItem,
	exportMarkdown,
	getAnalysis,
	getPortfolio,
	getPortfolioStats,
	getStats,
	regenerateNegotiation,
	studioAnalyzeForm,
	studioCreatePreset,
	studioDeletePreset,
	studioEditPhoto,
	studioEditPhotoBatch,
	studioEditPhotoCustom,
	studioGetPresets,
	updateAnalysisStatus,
} from './api-client'
import type { ApiResponse, ExtensionMessage } from './message-types'
import { getSettings, getState, saveSettings, toggleExtension } from './state-manager'

// Messages that don't require extension to be enabled
const BYPASS_ENABLED_CHECK = [
	'GET_SETTINGS',
	'UPDATE_SETTINGS',
	'GET_STATE',
	'TOGGLE_EXTENSION',
	'CHECK_BACKEND_STATUS',
	// Studio messages work independently of main extension toggle
	'STUDIO_GET_PRESETS',
	'STUDIO_EDIT_PHOTO',
	'STUDIO_EDIT_PHOTO_BATCH',
	'STUDIO_EDIT_PHOTO_CUSTOM',
	'STUDIO_ANALYZE_FORM',
	'STUDIO_CREATE_PRESET',
	'STUDIO_DELETE_PRESET',
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

		case 'DELETE_PORTFOLIO_ITEM':
			return deletePortfolioItem(message.vintedId)

		// Studio messages
		case 'STUDIO_GET_PRESETS':
			return studioGetPresets(message.filter)

		case 'STUDIO_EDIT_PHOTO':
			return studioEditPhoto(message.image, message.presetId, {
				variables: message.variables,
				stripMetadata: message.stripMetadata,
			})

		case 'STUDIO_EDIT_PHOTO_BATCH':
			return studioEditPhotoBatch(message.images, message.presetId, {
				variables: message.variables,
				stripMetadata: message.stripMetadata,
			})

		case 'STUDIO_EDIT_PHOTO_CUSTOM':
			return studioEditPhotoCustom(message.image, message.promptTemplate, {
				variables: message.variables,
				stripMetadata: message.stripMetadata,
			})

		case 'STUDIO_ANALYZE_FORM':
			return studioAnalyzeForm(message.photos, {
				existingTitle: message.existingTitle,
				language: message.language,
			})

		case 'STUDIO_CREATE_PRESET':
			return studioCreatePreset({
				name: message.name,
				description: message.description,
				promptTemplate: message.promptTemplate,
				previewImage: message.previewImage,
			})

		case 'STUDIO_DELETE_PRESET':
			return studioDeletePreset(message.presetId)

		default:
			return { success: false, error: 'Unknown message type' }
	}
}
