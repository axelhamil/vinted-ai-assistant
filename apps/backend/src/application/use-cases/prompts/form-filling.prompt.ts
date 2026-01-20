import { parseImageInput } from '../../../adapters/providers/ai/ai.helpers'
import type { AIMessage, ContentPart } from '../../interfaces/providers/ai.provider.interface'

/** Language names for prompt */
const LANGUAGE_NAMES: Record<string, string> = {
	fr: 'French',
	en: 'English',
	de: 'German',
	es: 'Spanish',
	it: 'Italian',
	nl: 'Dutch',
	pl: 'Polish',
	pt: 'Portuguese',
}

/**
 * Input for building form filling message
 */
export interface FormFillingPromptInput {
	photos: string[]
	existingTitle?: string
	language: string
}

/**
 * Build the prompt text for form filling analysis
 */
function buildPromptText(existingTitle: string | undefined, languageName: string): string {
	return `# PRODUCT LISTING ASSISTANT

Analyze these product photos and suggest values for a Vinted listing form.

${existingTitle ? `Current title (for context): ${existingTitle}` : ''}

## TASK

Fill in ALL fields based on what you can see in the photos.

## LANGUAGE

All text MUST be in ${languageName}.

## FIELD INSTRUCTIONS

### Product Identification
- **suggestedTitle**: A catchy, descriptive title (max 50 chars)
- **suggestedDescription**: Detailed description with key features, condition, measurements if visible
- **suggestedBrand**: Brand name if identifiable, or null
- **suggestedCategory**: Category like 'Tops > T-shirts' or null
- **suggestedSize**: Size if visible (S, M, L, 38, etc.) or null
- **suggestedMaterial**: Material composition if visible/inferable, or null
- **suggestedColors**: Array of main colors visible
- **suggestedCondition**: One of: new_with_tags, new, very_good, good, satisfactory

### PRICE ESTIMATION (CRITICAL - USE GOOGLE SEARCH)

**You MUST use Google Search to find real market prices.**

1. **Search queries to perform:**
   - "[brand] [product type] vinted prix"
   - "[brand] [model] occasion"
   - "[brand] [category] seconde main"

2. **Based on search results, provide:**
   - **suggestedPrice**: Competitive selling price in EUR
   - **priceRange.low**: Minimum price for quick sale (-20% from suggested)
   - **priceRange.high**: Maximum price with patience (+20% from suggested)
   - **priceConfidence**: "high" (clear brand + condition), "medium" (partial info), "low" (uncertain)
   - **priceReasoning**: Brief explanation citing found prices (1-2 sentences in ${languageName})

## IMPORTANT

- Be specific and accurate based on photos
- For condition: look for tags, wear signs, defects
- Only suggest values you can confidently infer
- Use Google Search to verify market prices before suggesting`
}

/**
 * Build the complete AI message for form filling analysis
 */
export async function buildFormFillingMessage(input: FormFillingPromptInput): Promise<AIMessage> {
	const { photos, existingTitle, language } = input

	// Parse all images
	const imageDataArray = await Promise.all(photos.map(parseImageInput))
	const validImages = imageDataArray.filter(
		(img): img is { data: string; mimeType: string } => img !== null
	)

	if (validImages.length === 0) {
		throw new Error('Failed to load any images for analysis')
	}

	const languageName = LANGUAGE_NAMES[language] ?? 'French'
	const prompt = buildPromptText(existingTitle, languageName)

	// Convert to data URLs for AI SDK
	const imageContent: ContentPart[] = validImages.map((img) => ({
		type: 'image' as const,
		image: `data:${img.mimeType};base64,${img.data}`,
	}))

	const content: ContentPart[] = [{ type: 'text', text: prompt }, ...imageContent]

	return { role: 'user', content }
}
