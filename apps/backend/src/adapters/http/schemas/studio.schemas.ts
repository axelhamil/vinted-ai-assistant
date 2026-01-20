import { z } from 'zod'

/**
 * Schema for editing a single photo
 */
export const editPhotoSchema = z.object({
	/** Base64 encoded image or URL */
	image: z.string().min(1, 'Image is required'),
	/** Preset ID to use for editing */
	presetId: z.string().min(1, 'Preset ID is required'),
	/** Optional custom variables to override in the template */
	variables: z.record(z.string(), z.string()).optional(),
	/** Whether to strip EXIF metadata (default: true) */
	stripMetadata: z.boolean().optional().default(true),
})

export type EditPhotoBody = z.infer<typeof editPhotoSchema>

/**
 * Schema for batch photo editing
 */
export const editPhotoBatchSchema = z.object({
	/** Array of base64 encoded images or URLs */
	images: z
		.array(z.string().min(1))
		.min(1, 'At least one image is required')
		.max(10, 'Maximum 10 images per batch'),
	/** Preset ID to use for editing */
	presetId: z.string().min(1, 'Preset ID is required'),
	/** Optional custom variables to override in the template */
	variables: z.record(z.string(), z.string()).optional(),
	/** Whether to strip EXIF metadata (default: true) */
	stripMetadata: z.boolean().optional().default(true),
})

export type EditPhotoBatchBody = z.infer<typeof editPhotoBatchSchema>

/**
 * Schema for editing with custom prompt
 */
export const editPhotoCustomSchema = z.object({
	/** Base64 encoded image or URL */
	image: z.string().min(1, 'Image is required'),
	/** Custom prompt template */
	promptTemplate: z.string().min(10, 'Prompt template must be at least 10 characters'),
	/** Optional variables to replace in the template */
	variables: z.record(z.string(), z.string()).optional(),
	/** Whether to strip EXIF metadata (default: true) */
	stripMetadata: z.boolean().optional().default(true),
})

export type EditPhotoCustomBody = z.infer<typeof editPhotoCustomSchema>

/**
 * Schema for form filling analysis
 */
export const analyzeFormSchema = z.object({
	/** Array of photo URLs or base64 */
	photos: z
		.array(z.string().min(1))
		.min(1, 'At least one photo is required')
		.max(10, 'Maximum 10 photos'),
	/** Optional existing title for context */
	existingTitle: z.string().optional(),
	/** Language for suggestions (ISO code) */
	language: z.string().length(2).optional().default('fr'),
})

export type AnalyzeFormBody = z.infer<typeof analyzeFormSchema>

/**
 * Schema for creating a custom preset
 */
export const createPresetSchema = z.object({
	/** Name of the preset */
	name: z
		.string()
		.min(2, 'Name must be at least 2 characters')
		.max(50, 'Name must be at most 50 characters'),
	/** Description of the preset */
	description: z.string().max(200, 'Description must be at most 200 characters').optional(),
	/** Prompt template with optional {{variable}} placeholders */
	promptTemplate: z.string().min(20, 'Prompt template must be at least 20 characters'),
	/** Optional preview image (base64) */
	previewImage: z.string().optional(),
})

export type CreatePresetBody = z.infer<typeof createPresetSchema>

/**
 * Schema for preset ID parameter
 */
export const presetIdParamSchema = z.object({
	id: z.string().min(1, 'Preset ID is required'),
})

export type PresetIdParam = z.infer<typeof presetIdParamSchema>

/**
 * Schema for listing presets query
 */
export const listPresetsQuerySchema = z.object({
	type: z.enum(['system', 'custom', 'all']).optional().default('all'),
})

export type ListPresetsQuery = z.infer<typeof listPresetsQuerySchema>
