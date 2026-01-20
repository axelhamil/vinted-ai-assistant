import type { ZodSchema, z } from 'zod'

/**
 * Multimodal content part for AI messages
 */
export type ContentPart = { type: 'text'; text: string } | { type: 'image'; image: string }

/**
 * Message for AI conversation
 */
export interface AIMessage {
	role: 'user' | 'assistant' | 'system'
	content: string | ContentPart[]
}

/**
 * Available AI tools
 */
export type AITool = 'google_search'

/**
 * Options for text generation
 */
export interface GenerateTextOptions<TSchema extends ZodSchema = ZodSchema> {
	/** Messages for the AI conversation */
	messages: AIMessage[]
	/** Optional Zod schema for structured output */
	schema?: TSchema
	/** Optional tools to enable */
	tools?: AITool[]
	/** Maximum number of AI steps (for multi-step tool use) */
	maxSteps?: number
}

/**
 * Result of text generation
 */
export interface GenerateTextResult<T = unknown> {
	/** Structured output if schema was provided */
	output: T | null
	/** Raw text response */
	text: string | null
}

/**
 * Options for image generation/editing
 */
export interface GenerateImageOptions {
	/** The prompt describing what to generate/edit */
	prompt: string
	/** Optional source image for editing (base64 data URL or URL) */
	sourceImage?: string
	/** Output image size */
	size?: 'small' | 'medium' | 'large'
}

/**
 * Result of image generation
 */
export interface GenerateImageResult {
	/** Generated image as base64 */
	imageBase64: string
	/** MIME type of the image */
	mimeType: string
}

/**
 * Generic AI Provider interface
 *
 * This interface provides generic text and image generation capabilities.
 * Business logic and prompt construction belong in use cases, not in the provider.
 */
export interface IAIProvider {
	/**
	 * Generate text (optionally structured) from messages
	 */
	generateText<TSchema extends ZodSchema>(
		options: GenerateTextOptions<TSchema>
	): Promise<GenerateTextResult<z.infer<TSchema>>>

	/**
	 * Generate or edit an image
	 */
	generateImage(options: GenerateImageOptions): Promise<GenerateImageResult>

	/**
	 * Get the provider name (e.g., "gemini", "openai")
	 */
	getProviderName(): string

	/**
	 * Check if the provider is available and configured
	 */
	isAvailable(): Promise<boolean>
}
