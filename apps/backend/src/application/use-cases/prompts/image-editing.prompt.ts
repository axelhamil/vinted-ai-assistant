import { interpolateTemplate } from '../../../adapters/providers/ai/ai.helpers'

/**
 * Build the prompt for background replacement
 *
 * Since Gemini Flash Image is a generative model (not true inpainting),
 * we use detailed instructions to maximize subject preservation.
 */
export function buildBackgroundReplacementPrompt(userPrompt: string): string {
	return `BACKGROUND REPLACEMENT TASK

Replace the background with: ${userPrompt}

CRITICAL - KEEP IDENTICAL:
- Same angle (do not rotate or tilt)
- Same framing (do not zoom or crop)
- Same layout (subject stays at exact same position)
- Same subject (do not modify the item/person at all)

ONLY change what is BEHIND the subject. Nothing else.`
}

/**
 * Build image editing prompt from template and variables
 */
export function buildImageEditingPrompt(
	promptTemplate: string,
	variables?: Record<string, string>
): string {
	const interpolated = interpolateTemplate(promptTemplate, variables)
	return buildBackgroundReplacementPrompt(interpolated)
}
