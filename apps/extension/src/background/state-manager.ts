/**
 * State management for extension settings and state
 */

import type { ExtensionSettings, ExtensionState } from './message-types'

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_SETTINGS: ExtensionSettings = {
	backendUrl: 'http://localhost:3000',
	scoreThreshold: 7,
	autoOpenSidebar: true,
	enabled: true,
	aiProvider: 'openai',
	openaiApiKey: '',
	geminiApiKey: '',
}

export const STORAGE_KEYS = {
	SETTINGS: 'vinted_ai_settings',
	STATE: 'vinted_ai_state',
} as const

// ============================================================================
// Settings Management
// ============================================================================

export async function getSettings(): Promise<ExtensionSettings> {
	const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)
	return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] }
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
	const current = await getSettings()
	const updated = { ...current, ...settings }
	await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated })
	return updated
}

// ============================================================================
// State Management
// ============================================================================

export async function getState(): Promise<ExtensionState> {
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

export async function incrementAnalyzedCount(): Promise<void> {
	const state = await getState()
	state.todayAnalyzedCount += 1
	await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state })
	await updateBadge(state.todayAnalyzedCount)
}

export async function toggleExtension(enabled?: boolean): Promise<boolean> {
	const state = await getState()
	const newEnabled = enabled ?? !state.enabled
	state.enabled = newEnabled
	await chrome.storage.local.set({ [STORAGE_KEYS.STATE]: state })
	return newEnabled
}

// ============================================================================
// Badge Management
// ============================================================================

export async function updateBadge(count: number): Promise<void> {
	const text = count > 0 ? count.toString() : ''
	await chrome.action.setBadgeText({ text })
	await chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' })
}
