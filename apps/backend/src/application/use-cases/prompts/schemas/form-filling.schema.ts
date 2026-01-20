import { z } from 'zod'

/**
 * Schema for form filling analysis output
 */
export const formFillingSchema = z.object({
	suggestedTitle: z.string(),
	suggestedDescription: z.string(),
	suggestedCondition: z.enum(['new_with_tags', 'new', 'very_good', 'good', 'satisfactory']),
	suggestedBrand: z.string().nullable(),
	suggestedColors: z.array(z.string()),
	suggestedCategory: z.string().nullable(),
	suggestedSize: z.string().nullable(),
	suggestedMaterial: z.string().nullable(),
	suggestedPrice: z.number(),
	priceRange: z.object({
		low: z.number(),
		high: z.number(),
	}),
	priceConfidence: z.enum(['low', 'medium', 'high']),
	priceReasoning: z.string(),
})

export type FormFillingSuggestions = z.infer<typeof formFillingSchema>
