import { inject, injectable } from 'inversify'
import { stripImageMetadata } from '../../adapters/utils/image-metadata'
import { TYPES } from '../di-types'
import {
	toBatchEditedPhotosDTO,
	toEditedPhotoDTO,
	type BatchEditedPhotosDTO,
	type EditedPhotoDTO,
} from '../dtos/studio.dto'
import type { IImageEditorProvider } from '../interfaces/providers/image-editor.provider.interface'
import type { IStudioPresetRepository } from '../interfaces/repositories/studio-preset.repository.interface'

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
		@inject(TYPES.ImageEditorProvider)
		private readonly imageEditor: IImageEditorProvider,
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

		// Edit the image
		const result = await this.imageEditor.editImage({
			imageData: image,
			promptTemplate: preset.promptTemplate,
			variables,
		})

		// Strip metadata if requested
		if (stripMetadata) {
			const processed = await stripImageMetadata(result.editedImageBase64)
			return toEditedPhotoDTO(processed.data, processed.mimeType)
		}

		return toEditedPhotoDTO(result.editedImageBase64, result.mimeType)
	}

	/**
	 * Edit a single photo using a custom prompt
	 */
	async executeCustom(input: EditPhotoCustomInput): Promise<EditedPhotoDTO> {
		const { image, promptTemplate, variables, stripMetadata = true } = input

		// Edit the image
		const result = await this.imageEditor.editImage({
			imageData: image,
			promptTemplate,
			variables,
		})

		// Strip metadata if requested
		if (stripMetadata) {
			const processed = await stripImageMetadata(result.editedImageBase64)
			return toEditedPhotoDTO(processed.data, processed.mimeType)
		}

		return toEditedPhotoDTO(result.editedImageBase64, result.mimeType)
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

		// Edit all images
		const batchResult = await this.imageEditor.editImageBatch({
			images,
			promptTemplate: preset.promptTemplate,
			variables,
		})

		// Strip metadata if requested
		if (stripMetadata) {
			const processedResults = await Promise.all(
				batchResult.results.map(async (r) => {
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

		return toBatchEditedPhotosDTO(batchResult.results)
	}
}
