import { z } from 'zod'

/**
 * Schema for photo quality assessment
 */
export const photoQualitySchema = z.object({
	score: z.number().min(1).max(10),
	hasModel: z.boolean(),
	lighting: z.enum(['poor', 'average', 'good']),
	background: z.enum(['messy', 'neutral', 'professional']),
	issues: z.array(z.string()),
})

/**
 * Schema for authenticity check
 */
export const authenticityCheckSchema = z.object({
	score: z.number().min(1).max(10),
	flags: z.array(z.string()),
	confidence: z.enum(['low', 'medium', 'high']),
})

/**
 * Schema for market price source
 */
export const marketPriceSourceSchema = z.object({
	name: z.string(),
	price: z.number(),
	searchQuery: z.string().optional(),
	count: z.number().optional(),
})

/**
 * Schema for market price estimation
 */
export const marketPriceEstimationSchema = z.object({
	low: z.number(),
	high: z.number(),
	average: z.number(),
	confidence: z.enum(['low', 'medium', 'high']),
	reasoning: z.string(),
	retailPrice: z.number().optional(),
	sources: z.array(marketPriceSourceSchema).optional(),
})

/**
 * Schema for opportunity signal
 */
export const opportunitySignalSchema = z.object({
	type: z.enum(['positive', 'negative', 'neutral']),
	label: z.string(),
	detail: z.string(),
})

/**
 * Schema for opportunity assessment
 */
export const opportunitySchema = z.object({
	score: z.number().min(1).max(10),
	margin: z.number(),
	marginPercent: z.number(),
	signals: z.array(opportunitySignalSchema),
})

/**
 * Schema for negotiation strategy
 */
export const negotiationSchema = z.object({
	suggestedOffer: z.number(),
	script: z.string(),
	arguments: z.array(z.string()),
	tone: z.enum(['friendly', 'direct', 'urgent']),
})

/**
 * Complete article analysis schema (single AI call)
 */
export const completeAnalysisSchema = z.object({
	photoQuality: photoQualitySchema,
	authenticityCheck: authenticityCheckSchema,
	detectedBrand: z.string().nullable(),
	detectedModel: z.string().nullable(),
	estimatedCondition: z.string(),
	marketPriceEstimation: marketPriceEstimationSchema,
	opportunity: opportunitySchema,
	negotiation: negotiationSchema,
})

export type PhotoQuality = z.infer<typeof photoQualitySchema>
export type AuthenticityCheck = z.infer<typeof authenticityCheckSchema>
export type MarketPriceEstimation = z.infer<typeof marketPriceEstimationSchema>
export type Opportunity = z.infer<typeof opportunitySchema>
export type Negotiation = z.infer<typeof negotiationSchema>
export type CompleteAnalysis = z.infer<typeof completeAnalysisSchema>
