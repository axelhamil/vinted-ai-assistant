/**
 * Hook for managing popup data loading and state
 */

import { useCallback, useEffect, useState } from 'react'
import type {
	ApiResponse,
	BackendHealthResponse,
	ExtensionSettings,
	ExtensionState,
	StatsResponse,
} from '../types'

// Send message to background service worker
async function sendMessage<T>(message: Record<string, unknown>): Promise<ApiResponse<T>> {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response: ApiResponse<T>) => {
			resolve(response)
		})
	})
}

export interface PopupData {
	isLoading: boolean
	backendStatus: 'connected' | 'disconnected' | 'checking'
	aiProvider: string
	state: ExtensionState | null
	stats: StatsResponse | null
	settings: ExtensionSettings | null
}

export interface PopupActions {
	loadData: () => Promise<void>
	toggleExtension: () => Promise<void>
	updateSettings: (settings: Partial<ExtensionSettings>) => Promise<void>
}

export function usePopupData(): PopupData & PopupActions {
	const [isLoading, setIsLoading] = useState(true)
	const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>(
		'checking'
	)
	const [aiProvider, setAiProvider] = useState<string>('')
	const [state, setState] = useState<ExtensionState | null>(null)
	const [stats, setStats] = useState<StatsResponse | null>(null)
	const [settings, setSettings] = useState<ExtensionSettings | null>(null)

	const loadData = useCallback(async () => {
		setIsLoading(true)

		// Check backend status
		setBackendStatus('checking')
		const healthResponse = await sendMessage<BackendHealthResponse>({
			type: 'CHECK_BACKEND_STATUS',
		})
		if (healthResponse.success && healthResponse.data) {
			setBackendStatus('connected')
			setAiProvider(healthResponse.data.aiProvider)
		} else {
			setBackendStatus('disconnected')
		}

		// Get extension state
		const stateResponse = await sendMessage<ExtensionState>({ type: 'GET_STATE' })
		if (stateResponse.success && stateResponse.data) {
			setState(stateResponse.data)
		}

		// Get stats (only if backend is connected)
		if (healthResponse.success) {
			const statsResponse = await sendMessage<StatsResponse>({ type: 'GET_STATS' })
			if (statsResponse.success && statsResponse.data) {
				setStats(statsResponse.data)
			}
		}

		// Get settings
		const settingsResponse = await sendMessage<ExtensionSettings>({ type: 'GET_SETTINGS' })
		if (settingsResponse.success && settingsResponse.data) {
			setSettings(settingsResponse.data)
		}

		setIsLoading(false)
	}, [])

	useEffect(() => {
		loadData()
	}, [loadData])

	const toggleExtension = async () => {
		const response = await sendMessage<{ enabled: boolean }>({
			type: 'TOGGLE_EXTENSION',
		})
		if (response.success && response.data) {
			setState((prev) => (prev ? { ...prev, enabled: response.data?.enabled ?? false } : null))
		}
	}

	const updateSettings = async (newSettings: Partial<ExtensionSettings>) => {
		const response = await sendMessage<ExtensionSettings>({
			type: 'UPDATE_SETTINGS',
			settings: newSettings,
		})
		if (response.success && response.data) {
			setSettings(response.data)
		}
	}

	return {
		isLoading,
		backendStatus,
		aiProvider,
		state,
		stats,
		settings,
		loadData,
		toggleExtension,
		updateSettings,
	}
}
