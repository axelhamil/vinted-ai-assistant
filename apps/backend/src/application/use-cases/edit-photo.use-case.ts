import { inject, injectable } from 'inversify'
import { stripImageMetadata } from '../../adapters/utils/image-metadata'
import { BATCH_CONCURRENCY_LIMIT } from '../constants'
import { TYPES } from '../di-types'
import {
	type BatchEditedPhotosDTO,
	type EditedPhotoDTO,
	toBatchEditedPhotosDTO,
	toEditedPhotoDTO,
} from '../dtos/studio.dto'
import type { IAIProvider } from '../interfaces/providers/ai.provider.interface'
import type { IStudioPresetRepository } from '../interfaces/repositories/studio-preset.repository.interface'
import { buildImageEditingPrompt } from './prompts/image-editing.prompt'

/**
 * Input for editing a single photo
 */
export interface EditPhotoInput {
	image: string
	presetId: string
	variables?: Record<string, string>
	stripMetadata?: boolean
}

/**
 * Input for editing with custom prompt
 */
export interface EditPhotoCustomInput {
	image: string
	promptTemplate: string
	variables?: Record<string, string>
	stripMetadata?: boolean
}

/**
 * Input for batch photo editing
 */
export interface EditPhotoBatchInput {
	images: string[]
	presetId: string
	variables?: Record<string, string>
	stripMetadata?: boolean
}

/**
 * Use case for editing photos with AI
 */
@injectable()
export class EditPhotoUseCase {
	constructor(
		@inject(TYPES.AIProvider)
		private readonly aiProvider: IAIProvider,
		@inject(TYPES.StudioPresetRepository)
		private readonly presetRepository: IStudioPresetRepository
	) {}

	/**
	 * Edit a single photo using a preset
	 */
	async execute(input: EditPhotoInput): Promise<EditedPhotoDTO> {
		const { image, presetId, variables, stripMetadata = true } = input

		// Get the preset
		const preset = await this.presetRepository.findById(presetId)
		if (!preset) {
			throw new Error(`Preset not found: ${presetId}`)
		}

		// Build prompt and generate image
		const prompt = buildImageEditingPrompt(preset.promptTemplate, variables)
		const result = await this.aiProvider.generateImage({
			prompt,
			sourceImage: image,
		})

		// Strip metadata if requested
		if (stripMetadata) {
			const processed = await stripImageMetadata(result.imageBase64)
			return toEditedPhotoDTO(processed.data, processed.mimeType)
		}

		return toEditedPhotoDTO(result.imageBase64, result.mimeType)
	}

	/**
	 * Edit a single photo using a custom prompt
	 */
	async executeCustom(input: EditPhotoCustomInput): Promise<EditedPhotoDTO> {
		const { image, promptTemplate, variables, stripMetadata = true } = input

		// Build prompt and generate image
		const prompt = buildImageEditingPrompt(promptTemplate, variables)
		const result = await this.aiProvider.generateImage({
			prompt,
			sourceImage: image,
		})

		// Strip metadata if requested
		if (stripMetadata) {
			const processed = await stripImageMetadata(result.imageBase64)
			return toEditedPhotoDTO(processed.data, processed.mimeType)
		}

		return toEditedPhotoDTO(result.imageBase64, result.mimeType)
	}

	/**
	 * Edit multiple photos using a preset (batch)
	 */
	async executeBatch(input: EditPhotoBatchInput): Promise<BatchEditedPhotosDTO> {
		const { images, presetId, variables, stripMetadata = true } = input

		// Get the preset
		const preset = await this.presetRepository.findById(presetId)
		if (!preset) {
			throw new Error(`Preset not found: ${presetId}`)
		}

		const prompt = buildImageEditingPrompt(preset.promptTemplate, variables)

		// Process single image
		const processImage = async (
			image: string
		): Promise<{
			success: boolean
			editedImageBase64?: string
			mimeType?: string
			error?: string
		}> => {
			try {
				const result = await this.aiProvider.generateImage({
					prompt,
					sourceImage: image,
				})
				return {
					success: true,
					editedImageBase64: result.imageBase64,
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

		for (let i = 0; i < images.length; i += BATCH_CONCURRENCY_LIMIT) {
			const batch = images.slice(i, i + BATCH_CONCURRENCY_LIMIT)
			const batchResults = await Promise.all(batch.map(processImage))
			results.push(...batchResults)
		}

		// Strip metadata if requested
		if (stripMetadata) {
			const processedResults = await Promise.all(
				results.map(async (r) => {
					if (r.success && r.editedImageBase64) {
						try {
							const processed = await stripImageMetadata(r.editedImageBase64)
							return {
								success: true,
								editedImageBase64: processed.data,
								mimeType: processed.mimeType,
							}
						} catch (error) {
							return {
								success: false,
								error: `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`,
							}
						}
					}
					return r
				})
			)
			return toBatchEditedPhotosDTO(processedResults)
		}

		return toBatchEditedPhotosDTO(results)
	}
}
