import { inject, injectable } from 'inversify'
import { TYPES } from '../di-types'
import { toFormFillingSuggestionsDTO, type FormFillingSuggestionsDTO } from '../dtos/studio.dto'
import type { IImageEditorProvider } from '../interfaces/providers/image-editor.provider.interface'

/**
 * Input for form filling analysis
 */
export interface FormFillingInput {
	photos: string[]
	existingTitle?: string
	language?: string
}

/**
 * Use case for analyzing photos to suggest form filling values
 */
@injectable()
export class FormFillingUseCase {
	constructor(
		@inject(TYPES.ImageEditorProvider)
		private readonly imageEditor: IImageEditorProvider
	) {}

	/**
	 * Analyze photos and suggest form filling values
	 */
	async execute(input: FormFillingInput): Promise<FormFillingSuggestionsDTO> {
		const { photos, existingTitle, language = 'fr' } = input

		const result = await this.imageEditor.analyzeForFormFilling({
			photos,
			existingTitle,
			language,
		})

		return toFormFillingSuggestionsDTO(result)
	}
}
