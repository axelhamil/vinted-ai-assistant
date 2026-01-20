/**
 * Store helper functions
 */

import type { ApiResponse } from './types'

/**
 * Send a message to the background service worker
 */
export function sendMessage<T>(message: Record<string, unknown>): Promise<ApiResponse<T>> {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response: ApiResponse<T>) => {
			resolve(response)
		})
	})
}

/**
 * Create and trigger a file download
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/markdown'): void {
	const blob = new Blob([content], { type: mimeType })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}
