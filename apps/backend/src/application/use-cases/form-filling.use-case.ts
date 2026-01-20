import { inject, injectable } from 'inversify'
import { MAX_AI_STEPS } from '../constants'
import { TYPES } from '../di-types'
import { type FormFillingSuggestionsDTO, toFormFillingSuggestionsDTO } from '../dtos/studio.dto'
import type { IAIProvider } from '../interfaces/providers/ai.provider.interface'
import { buildFormFillingMessage } from './prompts/form-filling.prompt'
import { formFillingSchema } from './prompts/schemas/form-filling.schema'

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
		@inject(TYPES.AIProvider)
		private readonly aiProvider: IAIProvider
	) {}

	/**
	 * Analyze photos and suggest form filling values
	 */
	async execute(input: FormFillingInput): Promise<FormFillingSuggestionsDTO> {
		const { photos, existingTitle, language = 'fr' } = input

		const message = await buildFormFillingMessage({
			photos,
			existingTitle,
			language,
		})

		const result = await this.aiProvider.generateText({
			messages: [message],
			schema: formFillingSchema,
			tools: ['google_search'],
			maxSteps: MAX_AI_STEPS.formFilling,
		})

		if (!result.output) {
			throw new Error('Failed to generate form filling suggestions')
		}

		return toFormFillingSuggestionsDTO(result.output)
	}
}
