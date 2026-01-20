import type { StudioPreset } from '../../adapters/persistence/database/schema'
import type { FormFillingSuggestions } from '../use-cases/prompts/schemas/form-filling.schema'

/**
 * DTO for a single edited photo response
 */
export interface EditedPhotoDTO {
	/** Base64 encoded edited image */
	imageBase64: string
	/** MIME type of the image */
	mimeType: string
	/** Data URL for direct display */
	dataUrl: string
}

/**
 * DTO for batch edited photos response
 */
export interface BatchEditedPhotosDTO {
	/** Array of results (success or error) */
	results: Array<{
		success: boolean
		imageBase64?: string
		mimeType?: string
		dataUrl?: string
		error?: string
	}>
	/** Count of successful edits */
	successCount: number
	/** Count of failed edits */
	failedCount: number
}

/**
 * DTO for a studio preset
 */
export interface StudioPresetDTO {
	id: string
	name: string
	description: string | null
	promptTemplate: string
	type: 'system' | 'custom'
	previewImage: string | null
	sortOrder: number
	createdAt: string
	updatedAt: string
}

/**
 * DTO for list of presets
 */
export interface StudioPresetListDTO {
	presets: StudioPresetDTO[]
	total: number
}

/**
 * DTO for form filling suggestions
 */
export interface FormFillingSuggestionsDTO {
	suggestedTitle: string
	suggestedDescription: string
	suggestedCondition: 'new_with_tags' | 'new' | 'very_good' | 'good' | 'satisfactory'
	suggestedBrand: string | null
	suggestedColors: string[]
	suggestedCategory: string | null
	suggestedSize: string | null
	suggestedMaterial: string | null
	suggestedPrice: number
	priceRange: {
		low: number
		high: number
	}
	priceConfidence: 'low' | 'medium' | 'high'
	priceReasoning: string
}

/**
 * Convert a StudioPreset entity to DTO
 */
export function toStudioPresetDTO(preset: StudioPreset): StudioPresetDTO {
	return {
		id: preset.id,
		name: preset.name,
		description: preset.description,
		promptTemplate: preset.promptTemplate,
		type: preset.type,
		previewImage: preset.previewImage,
		sortOrder: preset.sortOrder,
		createdAt: preset.createdAt.toISOString(),
		updatedAt: preset.updatedAt.toISOString(),
	}
}

/**
 * Convert an array of StudioPreset entities to list DTO
 */
export function toStudioPresetListDTO(presets: StudioPreset[]): StudioPresetListDTO {
	return {
		presets: presets.map(toStudioPresetDTO),
		total: presets.length,
	}
}

/**
 * Convert FormFillingSuggestions to DTO
 */
export function toFormFillingSuggestionsDTO(
	result: FormFillingSuggestions
): FormFillingSuggestionsDTO {
	return {
		suggestedTitle: result.suggestedTitle,
		suggestedDescription: result.suggestedDescription,
		suggestedCondition: result.suggestedCondition,
		suggestedBrand: result.suggestedBrand,
		suggestedColors: result.suggestedColors,
		suggestedCategory: result.suggestedCategory,
		suggestedSize: result.suggestedSize,
		suggestedMaterial: result.suggestedMaterial,
		suggestedPrice: result.suggestedPrice,
		priceRange: result.priceRange,
		priceConfidence: result.priceConfidence,
		priceReasoning: result.priceReasoning,
	}
}

/**
 * Create an EditedPhotoDTO from raw data
 */
export function toEditedPhotoDTO(imageBase64: string, mimeType: string): EditedPhotoDTO {
	return {
		imageBase64,
		mimeType,
		dataUrl: `data:${mimeType};base64,${imageBase64}`,
	}
}

/**
 * Create a BatchEditedPhotosDTO from results
 */
export function toBatchEditedPhotosDTO(
	results: Array<{
		success: boolean
		editedImageBase64?: string
		mimeType?: string
		error?: string
	}>
): BatchEditedPhotosDTO {
	const mappedResults = results.map((r) => {
		if (r.success && r.editedImageBase64 && r.mimeType) {
			return {
				success: true,
				imageBase64: r.editedImageBase64,
				mimeType: r.mimeType,
				dataUrl: `data:${r.mimeType};base64,${r.editedImageBase64}`,
			}
		}
		return {
			success: false,
			error: r.error || 'Unknown error',
		}
	})

	return {
		results: mappedResults,
		successCount: mappedResults.filter((r) => r.success).length,
		failedCount: mappedResults.filter((r) => !r.success).length,
	}
}
