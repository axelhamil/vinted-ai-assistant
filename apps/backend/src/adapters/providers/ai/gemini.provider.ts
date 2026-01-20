import { google } from '@ai-sdk/google'
import { GoogleGenAI } from '@google/genai'
import { Output, generateText, stepCountIs } from 'ai'
import { injectable } from 'inversify'
import type { ZodSchema, z } from 'zod'
import type {
	AIMessage,
	AITool,
	GenerateImageOptions,
	GenerateImageResult,
	GenerateTextOptions,
	GenerateTextResult,
	IAIProvider,
} from '../../../application/interfaces/providers/ai.provider.interface'
import { GEMINI_MODELS, IMAGE_SIZES } from './ai.constants'
import { parseImageInput, reencodeToWebP, withRetry } from './ai.helpers'

/**
 * Unified Gemini AI Provider
 *
 * Provides generic text and image generation using Google's Gemini models.
 * Business logic and prompts are handled by use cases, not this provider.
 */
@injectable()
export class GeminiProvider implements IAIProvider {
	private readonly apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
	private genAIClient: GoogleGenAI | null = null

	getProviderName(): string {
		return 'gemini'
	}

	async isAvailable(): Promise<boolean> {
		return Boolean(this.apiKey)
	}

	/**
	 * Generate text with optional structured output
	 */
	async generateText<TSchema extends ZodSchema>(
		options: GenerateTextOptions<TSchema>
	): Promise<GenerateTextResult<z.infer<TSchema>>> {
		const { messages, schema, tools = [], maxSteps = 1 } = options

		const aiMessages = this.convertMessages(messages)
		const toolConfig = this.buildToolConfig(tools)

		// Build options - cast required due to complex SDK union types
		const generateOptions = {
			model: google(GEMINI_MODELS.text),
			messages: aiMessages,
			...(toolConfig && { tools: toolConfig }),
			...(maxSteps > 1 && { stopWhen: stepCountIs(maxSteps) }),
			...(schema && { output: Output.object({ schema }) }),
		} as Parameters<typeof generateText>[0]

		const result = await generateText(generateOptions)

		return {
			output: (result as { output?: z.infer<TSchema> }).output ?? null,
			text: result.text ?? null,
		}
	}

	/**
	 * Generate or edit an image
	 */
	async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
		const { prompt, sourceImage, size = 'medium' } = options
		const client = this.getGenAIClient()

		const contents = await this.buildImageContents(prompt, sourceImage)

		const response = await withRetry(
			() =>
				client.models.generateContent({
					model: GEMINI_MODELS.image,
					contents,
					config: {
						responseModalities: ['image', 'text'],
						imageConfig: { imageSize: IMAGE_SIZES[size] },
					},
				}),
			'Image generation'
		)

		return this.extractImageFromResponse(response)
	}

	// === Private Methods ===

	/**
	 * Get or create the GoogleGenAI client
	 */
	private getGenAIClient(): GoogleGenAI {
		if (!this.genAIClient) {
			if (!this.apiKey) {
				throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured')
			}
			this.genAIClient = new GoogleGenAI({ apiKey: this.apiKey })
		}
		return this.genAIClient
	}

	/**
	 * Convert AIMessage to Vercel AI SDK message format
	 */
	private convertMessages(messages: AIMessage[]) {
		return messages.map((msg) => {
			if (typeof msg.content === 'string') {
				return { role: msg.role, content: msg.content }
			}
			// Multimodal content (images only valid for user messages)
			return {
				role: msg.role,
				content: msg.content.map((part) =>
					part.type === 'text'
						? { type: 'text' as const, text: part.text }
						: { type: 'image' as const, image: part.image }
				),
			}
		})
	}

	/**
	 * Build tool configuration for enabled tools
	 */
	private buildToolConfig(tools: AITool[]) {
		if (tools.length === 0) return undefined

		const config: Record<string, unknown> = {}

		if (tools.includes('google_search')) {
			config.google_search = google.tools.googleSearch({})
		}

		return Object.keys(config).length > 0 ? config : undefined
	}

	/**
	 * Build contents array for image generation
	 */
	private async buildImageContents(
		prompt: string,
		sourceImage?: string
	): Promise<Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>> {
		const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
			[]

		if (sourceImage) {
			const imageData = await parseImageInput(sourceImage)
			if (!imageData) {
				throw new Error('Failed to parse source image')
			}
			contents.push({
				inlineData: { mimeType: imageData.mimeType, data: imageData.data },
			})
		}

		contents.push({ text: prompt })
		return contents
	}

	/**
	 * Extract and process image from generation response
	 */
	private async extractImageFromResponse(response: unknown): Promise<GenerateImageResult> {
		const typedResponse = response as {
			candidates?: Array<{
				content?: {
					parts?: Array<{
						inlineData?: { data: string; mimeType: string }
					}>
				}
			}>
		}

		const candidates = typedResponse.candidates
		if (!candidates || candidates.length === 0) {
			throw new Error('No response candidates received from image generation')
		}

		const firstCandidate = candidates[0]
		if (!firstCandidate?.content?.parts) {
			throw new Error('No content parts in response')
		}

		// Find the image part in the response
		for (const part of firstCandidate.content.parts) {
			if (part.inlineData?.data) {
				// Re-encode to WebP to remove SynthID watermark
				const reencoded = await reencodeToWebP(part.inlineData.data)
				return {
					imageBase64: reencoded.data,
					mimeType: reencoded.mimeType,
				}
			}
		}

		throw new Error('No image data returned from image generation')
	}
}
