/**
 * Input for image editing operation
 */
export interface ImageEditInput {
	/** Base64 encoded image or URL */
	imageData: string
	/** The studio preset prompt template */
	promptTemplate: string
	/** Optional variables to replace in the template */
	variables?: Record<string, string>
}

/**
 * Result of image editing operation
 */
export interface ImageEditResult {
	/** Base64 encoded edited image */
	editedImageBase64: string
	/** MIME type of the output image */
	mimeType: string
}

/**
 * Input for batch image editing
 */
export interface BatchImageEditInput {
	/** Array of base64 encoded images or URLs */
	images: string[]
	/** The studio preset prompt template */
	promptTemplate: string
	/** Optional variables to replace in the template */
	variables?: Record<string, string>
}

/**
 * Result of batch image editing
 */
export interface BatchImageEditResult {
	/** Array of edited images with their results */
	results: Array<{
		success: boolean
		editedImageBase64?: string
		mimeType?: string
		error?: string
	}>
}

/**
 * Input for form filling analysis
 */
export interface FormFillingInput {
	/** Array of product photo URLs or base64 */
	photos: string[]
	/** Optional existing title from the listing */
	existingTitle?: string
	/** Language for suggestions (ISO code) */
	language?: string
}

/**
 * Result of form filling analysis
 */
export interface FormFillingResult {
	/** Suggested title for the listing */
	suggestedTitle: string
	/** Suggested description */
	suggestedDescription: string
	/** Detected item condition */
	suggestedCondition: 'new_with_tags' | 'new' | 'very_good' | 'good' | 'satisfactory'
	/** Detected brand */
	suggestedBrand: string | null
	/** Detected colors */
	suggestedColors: string[]
	/** Detected category path */
	suggestedCategory: string | null
	/** Detected size */
	suggestedSize: string | null
	/** Detected material */
	suggestedMaterial: string | null
	/** Suggested price in EUR */
	suggestedPrice: number
	/** Price range estimate */
	priceRange: {
		low: number
		high: number
	}
	/** Confidence level of the price estimate */
	priceConfidence: 'low' | 'medium' | 'high'
	/** Brief explanation of the price reasoning */
	priceReasoning: string
}

/**
 * Image Editor Provider interface (port)
 * Defines the contract for AI-powered image editing operations
 */
export interface IImageEditorProvider {
	/**
	 * Edit a single image with the given prompt
	 */
	editImage(input: ImageEditInput): Promise<ImageEditResult>

	/**
	 * Edit multiple images with the same prompt (batch processing)
	 */
	editImageBatch(input: BatchImageEditInput): Promise<BatchImageEditResult>

	/**
	 * Analyze photos to suggest form filling values
	 */
	analyzeForFormFilling(input: FormFillingInput): Promise<FormFillingResult>

	/**
	 * Get the provider name
	 */
	getProviderName(): string

	/**
	 * Check if the provider is available and configured
	 */
	isAvailable(): Promise<boolean>
}
