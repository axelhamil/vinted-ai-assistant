import { google } from '@ai-sdk/google'
import { GoogleGenAI } from '@google/genai'
import { generateText, Output, stepCountIs } from 'ai'
import { injectable } from 'inversify'
import sharp from 'sharp'
import { z } from 'zod'
import type {
	BatchImageEditInput,
	BatchImageEditResult,
	FormFillingInput,
	FormFillingResult,
	IImageEditorProvider,
	ImageEditInput,
	ImageEditResult,
} from '../../../application/interfaces/providers/image-editor.provider.interface'

/**
 * Retry configuration for API calls
 */
const RETRY_CONFIG = {
	maxRetries: 3,
	initialDelayMs: 2000,
	maxDelayMs: 30000,
	backoffMultiplier: 2,
}

/**
 * Check if an error is retryable (503, 429, network errors)
 */
function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase()
		// Check for overload/rate limit errors
		if (message.includes('503') || message.includes('overload') || message.includes('unavailable')) {
			return true
		}
		if (message.includes('429') || message.includes('rate') || message.includes('quota')) {
			return true
		}
		// Network errors
		if (message.includes('econnreset') || message.includes('etimedout') || message.includes('network')) {
			return true
		}
	}
	return false
}

/**
 * Execute a function with retry logic and exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
	let lastError: Error | null = null
	let delay = RETRY_CONFIG.initialDelayMs

	for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries + 1; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))

			if (attempt > RETRY_CONFIG.maxRetries || !isRetryableError(error)) {
				throw lastError
			}

			console.warn(`[Gemini] ${context} failed (attempt ${attempt}/${RETRY_CONFIG.maxRetries + 1}): ${lastError.message}`)
			console.warn(`[Gemini] Retrying in ${delay}ms...`)

			await new Promise((resolve) => setTimeout(resolve, delay))
			delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs)
		}
	}

	throw lastError
}

/**
 * Zod schema for form filling analysis output
 */
const formFillingSchema = z.object({
	suggestedTitle: z.string(),
	suggestedDescription: z.string(),
	suggestedCondition: z.enum(['new_with_tags', 'new', 'very_good', 'good', 'satisfactory']),
	suggestedBrand: z.string().nullable(),
	suggestedColors: z.array(z.string()),
	suggestedCategory: z.string().nullable(),
	suggestedSize: z.string().nullable(),
	suggestedMaterial: z.string().nullable(),
	suggestedPrice: z.number(),
	priceRange: z.object({
		low: z.number(),
		high: z.number(),
	}),
	priceConfidence: z.enum(['low', 'medium', 'high']),
	priceReasoning: z.string(),
})

/**
 * Download an image and convert to base64
 */
async function downloadImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
				Referer: 'https://www.vinted.fr/',
			},
		})

		if (!response.ok) {
			return null
		}

		const arrayBuffer = await response.arrayBuffer()
		const base64 = Buffer.from(arrayBuffer).toString('base64')
		const contentType = response.headers.get('content-type') || 'image/webp'

		return { data: base64, mimeType: contentType }
	} catch {
		return null
	}
}

/**
 * Parse base64 data URL or download from URL
 */
async function getImageData(imageInput: string): Promise<{ data: string; mimeType: string } | null> {
	// Check if it's a data URL
	if (imageInput.startsWith('data:')) {
		const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/)
		if (matches && matches[1] && matches[2]) {
			return { mimeType: matches[1], data: matches[2] }
		}
		return null
	}

	// Check if it's a URL
	if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
		return downloadImageAsBase64(imageInput)
	}

	// Assume it's raw base64
	return { data: imageInput, mimeType: 'image/png' }
}

/**
 * Replace variables in prompt template
 */
function interpolateTemplate(template: string, variables?: Record<string, string>): string {
	if (!variables) return template

	let result = template
	for (const [key, value] of Object.entries(variables)) {
		result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
	}
	return result
}

/**
 * Re-encode image to WebP to remove SynthID watermark
 * that Google adds to AI-generated images.
 * Quality 75 balances good visual quality with smaller file size (~9MB max).
 */
async function reencodeImage(base64: string): Promise<{ data: string; mimeType: string }> {
	const buffer = Buffer.from(base64, 'base64')
	const reencoded = await sharp(buffer).webp({ quality: 75 }).toBuffer()
	return {
		data: reencoded.toString('base64'),
		mimeType: 'image/webp',
	}
}

/**
 * Build an enhanced prompt for background replacement with Gemini Flash Image.
 * Since this is a generative model (not true inpainting), we use detailed instructions
 * to maximize subject preservation.
 */
function buildInpaintingPrompt(userPrompt: string): string {
	return `BACKGROUND REPLACEMENT TASK

Replace the background with: ${userPrompt}

CRITICAL - KEEP IDENTICAL:
- Same angle (do not rotate or tilt)
- Same framing (do not zoom or crop)
- Same layout (subject stays at exact same position)
- Same subject (do not modify the item/person at all)

ONLY change what is BEHIND the subject. Nothing else.`
}

/**
 * Gemini Image Editor Provider using Gemini Flash Image for background editing
 * and Gemini Flash for form filling analysis.
 *
 * Note: Gemini Flash Image is a generative model, not true inpainting.
 * Results may vary in subject preservation quality.
 */
@injectable()
export class GeminiImageEditorProvider implements IImageEditorProvider {
	/** Gemini Flash Image model (multimodal: handles both image editing and text analysis) */
	private readonly model = 'gemini-3-pro-image-preview'

	private ai: GoogleGenAI | null = null

	/**
	 * Get Gemini AI client
	 */
	private getClient(): GoogleGenAI {
		if (!this.ai) {
			const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
			if (!apiKey) {
				throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured')
			}
			this.ai = new GoogleGenAI({ apiKey })
		}
		return this.ai
	}

	getProviderName(): string {
		return 'gemini-image-editor'
	}

	async isAvailable(): Promise<boolean> {
		return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
	}

	/**
	 * Edit a single image using Gemini Flash Image.
	 * Uses generateContent with detailed prompt for background replacement.
	 *
	 * Note: This is a generative approach, not true inpainting.
	 * The model will try to preserve the subject but results may vary.
	 */
	async editImage(input: ImageEditInput): Promise<ImageEditResult> {
		const ai = this.getClient()
		const imageData = await getImageData(input.imageData)

		if (!imageData) {
			throw new Error('Failed to load image data')
		}

		const userPrompt = interpolateTemplate(input.promptTemplate, input.variables)
		const fullPrompt = buildInpaintingPrompt(userPrompt)

		// Use generateContent with image input and detailed prompt (with retry for transient errors)
		const response = await withRetry(
			() =>
				ai.models.generateContent({
					model: this.model,
					contents: [
						{
							inlineData: {
								mimeType: imageData.mimeType,
								data: imageData.data,
							},
						},
						{ text: fullPrompt },
					],
					config: {
						responseModalities: ['image', 'text'],
						imageConfig: {
							imageSize: '2K',
						},
					},
				}),
			'Image editing'
		)

		// Extract the generated image from response
		const candidates = response.candidates
		if (!candidates || candidates.length === 0) {
			throw new Error('No response candidates received from image editing')
		}

		const firstCandidate = candidates[0]
		if (!firstCandidate) {
			throw new Error('No response candidates received from image editing')
		}

		const parts = firstCandidate.content?.parts
		if (!parts) {
			throw new Error('No content parts in response')
		}

		// Find the image part in the response
		for (const part of parts) {
			if (part.inlineData?.data) {
				// Re-encode to PNG lossless to remove SynthID watermark
				const reencoded = await reencodeImage(part.inlineData.data)
				return {
					editedImageBase64: reencoded.data,
					mimeType: reencoded.mimeType,
				}
			}
		}

		throw new Error('No image data returned from image editing')
	}

	/**
	 * Edit multiple images with the same prompt (parallel processing with concurrency limit)
	 */
	async editImageBatch(input: BatchImageEditInput): Promise<BatchImageEditResult> {
		const concurrencyLimit = 3 // Process up to 3 images in parallel to avoid rate limits

		const processImage = async (
			image: string
		): Promise<{
			success: boolean
			editedImageBase64?: string
			mimeType?: string
			error?: string
		}> => {
			try {
				const result = await this.editImage({
					imageData: image,
					promptTemplate: input.promptTemplate,
					variables: input.variables,
				})
				return {
					success: true,
					editedImageBase64: result.editedImageBase64,
					mimeType: result.mimeType,
				}
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
				}
			}
		}

		// Process images in batches with concurrency limit
		const results: Array<{
			success: boolean
			editedImageBase64?: string
			mimeType?: string
			error?: string
		}> = []

		for (let i = 0; i < input.images.length; i += concurrencyLimit) {
			const batch = input.images.slice(i, i + concurrencyLimit)
			const batchResults = await Promise.all(batch.map(processImage))
			results.push(...batchResults)
		}

		return { results }
	}

	/**
	 * Analyze photos to suggest form filling values using Gemini with Google Search grounding
	 * for accurate market price estimation.
	 */
	async analyzeForFormFilling(input: FormFillingInput): Promise<FormFillingResult> {
		const { photos, existingTitle, language = 'fr' } = input

		// Download all images and convert to data URLs for Vercel AI SDK
		const imageDataArray = await Promise.all(photos.map(getImageData))
		const validImages = imageDataArray.filter((img): img is { data: string; mimeType: string } => img !== null)

		if (validImages.length === 0) {
			throw new Error('Failed to load any images for analysis')
		}

		const languageNames: Record<string, string> = {
			fr: 'French',
			en: 'English',
			de: 'German',
			es: 'Spanish',
			it: 'Italian',
			nl: 'Dutch',
			pl: 'Polish',
			pt: 'Portuguese',
		}

		const languageName = languageNames[language] || 'French'

		const prompt = `# PRODUCT LISTING ASSISTANT

Analyze these product photos and suggest values for a Vinted listing form.

${existingTitle ? `Current title (for context): ${existingTitle}` : ''}

## TASK

Fill in ALL fields based on what you can see in the photos.

## LANGUAGE

All text MUST be in ${languageName}.

## FIELD INSTRUCTIONS

### Product Identification
- **suggestedTitle**: A catchy, descriptive title (max 50 chars)
- **suggestedDescription**: Detailed description with key features, condition, measurements if visible
- **suggestedBrand**: Brand name if identifiable, or null
- **suggestedCategory**: Category like 'Tops > T-shirts' or null
- **suggestedSize**: Size if visible (S, M, L, 38, etc.) or null
- **suggestedMaterial**: Material composition if visible/inferable, or null
- **suggestedColors**: Array of main colors visible
- **suggestedCondition**: One of: new_with_tags, new, very_good, good, satisfactory

### PRICE ESTIMATION (CRITICAL - USE GOOGLE SEARCH)

**You MUST use Google Search to find real market prices.**

1. **Search queries to perform:**
   - "[brand] [product type] vinted prix"
   - "[brand] [model] occasion"
   - "[brand] [category] seconde main"

2. **Based on search results, provide:**
   - **suggestedPrice**: Competitive selling price in EUR
   - **priceRange.low**: Minimum price for quick sale (-20% from suggested)
   - **priceRange.high**: Maximum price with patience (+20% from suggested)
   - **priceConfidence**: "high" (clear brand + condition), "medium" (partial info), "low" (uncertain)
   - **priceReasoning**: Brief explanation citing found prices (1-2 sentences in ${languageName})

## IMPORTANT

- Be specific and accurate based on photos
- For condition: look for tags, wear signs, defects
- Only suggest values you can confidently infer
- Use Google Search to verify market prices before suggesting`

		// Convert images to data URLs for Vercel AI SDK
		const imageContent = validImages.map((img) => ({
			type: 'image' as const,
			image: `data:${img.mimeType};base64,${img.data}`,
		}))

		// Use generateText with Output.object() for structured output + Google Search grounding
		const { output } = await generateText({
			model: google('gemini-3-flash-preview'),
			output: Output.object({ schema: formFillingSchema }),
			tools: {
				// Enable Google Search for real-time price data grounding
				google_search: google.tools.googleSearch({}),
			},
			// Allow 5 steps: search for prices + generate structured output
			stopWhen: stepCountIs(5),
			messages: [
				{
					role: 'user',
					content: [{ type: 'text', text: prompt }, ...imageContent],
				},
			],
		})

		if (!output) {
			throw new Error('Failed to generate form analysis output')
		}

		return output
	}
}
