import { randomUUID } from 'node:crypto'
import type { Container } from 'inversify'
import { TYPES } from '../../application/di-types'
import type {
	BatchEditedPhotosDTO,
	EditedPhotoDTO,
	FormFillingSuggestionsDTO,
	StudioPresetDTO,
	StudioPresetListDTO,
} from '../../application/dtos/studio.dto'
import { toStudioPresetDTO, toStudioPresetListDTO } from '../../application/dtos/studio.dto'
import type { IStudioPresetRepository } from '../../application/interfaces/repositories/studio-preset.repository.interface'
import type {
	EditPhotoBatchInput,
	EditPhotoCustomInput,
	EditPhotoInput,
	EditPhotoUseCase,
} from '../../application/use-cases/edit-photo.use-case'
import type {
	FormFillingInput,
	FormFillingUseCase,
} from '../../application/use-cases/form-filling.use-case'
import type { StudioPreset } from '../persistence/database/schema'

/**
 * Controller for studio-related endpoints
 * Handles photo editing, preset management, and form filling suggestions
 */
export class StudioController {
	private readonly editPhotoUseCase: EditPhotoUseCase
	private readonly formFillingUseCase: FormFillingUseCase
	private readonly presetRepository: IStudioPresetRepository

	constructor(container: Container) {
		this.editPhotoUseCase = container.get<EditPhotoUseCase>(TYPES.EditPhotoUseCase)
		this.formFillingUseCase = container.get<FormFillingUseCase>(TYPES.FormFillingUseCase)
		this.presetRepository = container.get<IStudioPresetRepository>(TYPES.StudioPresetRepository)
	}

	/**
	 * POST /api/studio/edit
	 * Edit a single photo using a preset
	 */
	async editPhoto(input: EditPhotoInput): Promise<EditedPhotoDTO> {
		return this.editPhotoUseCase.execute(input)
	}

	/**
	 * POST /api/studio/edit-custom
	 * Edit a single photo using a custom prompt
	 */
	async editPhotoCustom(input: EditPhotoCustomInput): Promise<EditedPhotoDTO> {
		return this.editPhotoUseCase.executeCustom(input)
	}

	/**
	 * POST /api/studio/edit-batch
	 * Edit multiple photos using a preset
	 */
	async editPhotoBatch(input: EditPhotoBatchInput): Promise<BatchEditedPhotosDTO> {
		return this.editPhotoUseCase.executeBatch(input)
	}

	/**
	 * POST /api/studio/analyze-form
	 * Analyze photos and suggest form filling values
	 */
	async analyzeForForm(input: FormFillingInput): Promise<FormFillingSuggestionsDTO> {
		return this.formFillingUseCase.execute(input)
	}

	/**
	 * GET /api/studio/presets
	 * List all presets (optionally filtered by type)
	 */
	async listPresets(type?: 'system' | 'custom' | 'all'): Promise<StudioPresetListDTO> {
		let presets: StudioPreset[]
		if (type === 'system') {
			presets = await this.presetRepository.findAll('system')
		} else if (type === 'custom') {
			presets = await this.presetRepository.findAll('custom')
		} else {
			presets = await this.presetRepository.findAll()
		}
		return toStudioPresetListDTO(presets)
	}

	/**
	 * POST /api/studio/presets
	 * Create a custom preset
	 */
	async createPreset(input: {
		name: string
		description?: string
		promptTemplate: string
		previewImage?: string
	}): Promise<StudioPresetDTO> {
		const preset = await this.presetRepository.create({
			id: randomUUID(),
			name: input.name,
			description: input.description ?? null,
			promptTemplate: input.promptTemplate,
			type: 'custom',
			previewImage: input.previewImage ?? null,
		})
		return toStudioPresetDTO(preset)
	}

	/**
	 * DELETE /api/studio/presets/:id
	 * Delete a custom preset (system presets cannot be deleted)
	 */
	async deletePreset(id: string): Promise<boolean> {
		return this.presetRepository.delete(id)
	}

	/**
	 * Initialize system presets (called on startup)
	 */
	async seedSystemPresets(): Promise<void> {
		await this.presetRepository.seedSystemPresets()
	}
}
