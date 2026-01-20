/**
 * AI Provider Constants
 * Centralized configuration for AI providers
 */

/** Retry configuration for API calls */
export const RETRY_CONFIG = {
	maxRetries: 3,
	initialDelayMs: 2000,
	maxDelayMs: 30000,
	backoffMultiplier: 2,
} as const

/** Gemini model identifiers */
export const GEMINI_MODELS = {
	text: 'gemini-3-flash-preview',
	image: 'gemini-3-pro-image-preview',
} as const

/** Image size options for generation */
export const IMAGE_SIZES = {
	small: '1K',
	medium: '2K',
	large: '4K',
} as const

/** WebP quality for re-encoding (removes SynthID watermark) */
export const WEBP_QUALITY = 75

/** Headers for downloading Vinted images */
export const VINTED_IMAGE_HEADERS = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
	Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
	'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
	Referer: 'https://www.vinted.fr/',
} as const
