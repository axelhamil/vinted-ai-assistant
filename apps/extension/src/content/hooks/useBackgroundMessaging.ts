/**
 * Hook for sending messages to background service worker
 */

import { useCallback } from 'react'

interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

/**
 * Hook that provides a type-safe message sender to the background service worker
 */
export function useBackgroundMessaging() {
	const sendMessage = useCallback(
		<T>(message: Record<string, unknown>): Promise<ApiResponse<T>> => {
			return new Promise((resolve) => {
				chrome.runtime.sendMessage(message, (response: ApiResponse<T>) => {
					resolve(response)
				})
			})
		},
		[]
	)

	return { sendMessage }
}

export type { ApiResponse }
