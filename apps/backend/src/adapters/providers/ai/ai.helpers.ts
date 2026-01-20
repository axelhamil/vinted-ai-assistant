/**
 * AI Provider Helpers
 * Shared utilities for AI providers
 */

import sharp from 'sharp'
import { RETRY_CONFIG, VINTED_IMAGE_HEADERS, WEBP_QUALITY } from './ai.constants'

/** Parsed image data */
export interface ParsedImageData {
	data: string
	mimeType: string
}

/**
 * Download an image from URL and convert to base64
 */
export async function downloadImageAsBase64(url: string): Promise<string | null> {
	try {
		const response = await fetch(url, { headers: VINTED_IMAGE_HEADERS })

		if (!response.ok) {
			return null
		}

		const arrayBuffer = await response.arrayBuffer()
		const base64 = Buffer.from(arrayBuffer).toString('base64')
		const contentType = response.headers.get('content-type') || 'image/webp'

		return `data:${contentType};base64,${base64}`
	} catch {
		return null
	}
}

/**
 * Download an image from URL and return parsed data
 */
export async function downloadImageData(url: string): Promise<ParsedImageData | null> {
	try {
		const response = await fetch(url, { headers: VINTED_IMAGE_HEADERS })

		if (!response.ok) {
			return null
		}

		const arrayBuffer = await response.arrayBuffer()
		const base64 = Buffer.from(arrayBuffer).toString('base64')
		const mimeType = response.headers.get('content-type') || 'image/webp'

		return { data: base64, mimeType }
	} catch {
		return null
	}
}

/**
 * Parse image input (data URL, URL, or raw base64)
 */
export async function parseImageInput(input: string): Promise<ParsedImageData | null> {
	// Check if it's a data URL
	if (input.startsWith('data:')) {
		const matches = input.match(/^data:([^;]+);base64,(.+)$/)
		if (matches?.[1] && matches[2]) {
			return { mimeType: matches[1], data: matches[2] }
		}
		return null
	}

	// Check if it's a URL
	if (input.startsWith('http://') || input.startsWith('https://')) {
		return downloadImageData(input)
	}

	// Assume it's raw base64
	return { data: input, mimeType: 'image/png' }
}

/**
 * Re-encode image to WebP to remove SynthID watermark
 */
export async function reencodeToWebP(base64: string): Promise<ParsedImageData> {
	const buffer = Buffer.from(base64, 'base64')
	const reencoded = await sharp(buffer).webp({ quality: WEBP_QUALITY }).toBuffer()
	return {
		data: reencoded.toString('base64'),
		mimeType: 'image/webp',
	}
}

/**
 * Check if an error is retryable (503, 429, network errors)
 */
export function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase()
		// Check for overload/rate limit errors
		if (
			message.includes('503') ||
			message.includes('overload') ||
			message.includes('unavailable')
		) {
			return true
		}
		if (message.includes('429') || message.includes('rate') || message.includes('quota')) {
			return true
		}
		// Network errors
		if (
			message.includes('econnreset') ||
			message.includes('etimedout') ||
			message.includes('network')
		) {
			return true
		}
	}
	return false
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
	let lastError: Error | null = null
	let delay: number = RETRY_CONFIG.initialDelayMs

	for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries + 1; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))

			if (attempt > RETRY_CONFIG.maxRetries || !isRetryableError(error)) {
				throw lastError
			}

			console.warn(
				`[AI] ${context} failed (attempt ${attempt}/${RETRY_CONFIG.maxRetries + 1}): ${lastError.message}`
			)
			console.warn(`[AI] Retrying in ${delay}ms...`)

			await new Promise((resolve) => setTimeout(resolve, delay))
			delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs)
		}
	}

	throw lastError
}

/**
 * Interpolate variables in a template string
 */
export function interpolateTemplate(template: string, variables?: Record<string, string>): string {
	if (!variables) return template

	return Object.entries(variables).reduce(
		(result, [key, value]) => result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value),
		template
	)
}
