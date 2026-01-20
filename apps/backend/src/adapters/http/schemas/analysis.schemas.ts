import { z } from 'zod'

/**
 * Valid seller reliability values
 */
const sellerReliabilityEnum = z.enum(['high', 'medium', 'low', 'unknown'])

/**
 * Zod schema for seller badge
 */
const sellerBadgeSchema = z.object({
	id: z.string(),
	label: z.string(),
	description: z.string().nullable(),
})

/**
 * Zod schema for seller data in article input
 */
const sellerSchema = z.object({
	username: z.string().min(1, 'Seller username is required'),
	profileUrl: z.string().url().nullable().optional().default(null),
	avatarUrl: z.string().url().nullable().optional().default(null),
	rating: z.number().min(0).max(5).nullable(),
	ratingCount: z.number().int().min(0).nullable(),
	salesCount: z.number().int().min(0),
	responseTime: z.string().nullable(),
	lastSeen: z.string().nullable(),
	location: z.string().nullable().optional().default(null),
	badges: z.array(sellerBadgeSchema).optional().default([]),
	// Extended fields from profile fetch
	activeListings: z.number().int().min(0).nullable(),
	memberSince: z.string().nullable(),
	followers: z.number().int().min(0).nullable(),
	verifiedProfile: z.boolean(),
	reliability: sellerReliabilityEnum,
})

/**
 * Supported language codes
 */
const languageEnum = z.enum([
	'fr',
	'en',
	'de',
	'es',
	'it',
	'nl',
	'pl',
	'pt',
	'cs',
	'sk',
	'hu',
	'ro',
	'lt',
	'hr',
])

/**
 * Zod schema for POST /api/analyze body
 * Validates the article data received from the extension
 */
export const analyzeBodySchema = z.object({
	vintedId: z.string().min(1, 'Vinted ID is required'),
	url: z.string().url('URL must be a valid URL'),
	title: z.string().min(1, 'Title is required'),
	description: z.string(),
	price: z.number().positive('Price must be positive'),
	/** Total price including buyer protection (null if not available) */
	totalPrice: z.number().positive().nullable(),
	/** Shipping cost in euros (null = free shipping or not available) */
	shippingCost: z.number().min(0).nullable(),
	brand: z.string().nullable(),
	size: z.string().nullable(),
	condition: z.string().min(1, 'Condition is required'),
	photos: z
		.array(z.string().url('Each photo must be a valid URL'))
		.min(1, 'At least one photo is required'),
	seller: sellerSchema,
	listedAt: z.string().nullable(),
	views: z.number().int().min(0).nullable(),
	favorites: z.number().int().min(0).nullable(),
	forceRefresh: z.boolean().optional().default(false),
	/** ISO language code for response localization */
	language: languageEnum.optional(),
})

/**
 * Valid analysis status values
 */
const analysisStatusEnum = z.enum(['ANALYZED', 'WATCHING', 'BOUGHT', 'SOLD', 'ARCHIVED'])

/**
 * Zod schema for GET /api/analyses query parameters
 */
export const listAnalysesQuerySchema = z.object({
	limit: z
		.string()
		.optional()
		.transform((val) => (val ? Number.parseInt(val, 10) : undefined))
		.refine((val) => val === undefined || (Number.isInteger(val) && val > 0 && val <= 100), {
			message: 'Limit must be a positive integer between 1 and 100',
		}),
	offset: z
		.string()
		.optional()
		.transform((val) => (val ? Number.parseInt(val, 10) : undefined))
		.refine((val) => val === undefined || (Number.isInteger(val) && val >= 0), {
			message: 'Offset must be a non-negative integer',
		}),
	minScore: z
		.string()
		.optional()
		.transform((val) => (val ? Number.parseInt(val, 10) : undefined))
		.refine((val) => val === undefined || (Number.isInteger(val) && val >= 1 && val <= 10), {
			message: 'MinScore must be an integer between 1 and 10',
		}),
	status: z
		.string()
		.optional()
		.refine((val) => val === undefined || analysisStatusEnum.safeParse(val).success, {
			message: 'Status must be one of: ANALYZED, WATCHING, BOUGHT, SOLD, ARCHIVED',
		})
		.transform(
			(val) => val as 'ANALYZED' | 'WATCHING' | 'BOUGHT' | 'SOLD' | 'ARCHIVED' | undefined
		),
})

/**
 * Zod schema for PATCH /api/analyses/:vintedId/status body
 */
export const updateStatusBodySchema = z.object({
	status: analysisStatusEnum,
})

/**
 * Zod schema for :vintedId path parameter
 */
export const vintedIdParamSchema = z.object({
	vintedId: z.string().min(1, 'Vinted ID is required'),
})

/**
 * Valid negotiation tone values
 */
const negotiationToneEnum = z.enum(['friendly', 'direct', 'urgent'])

/**
 * Zod schema for POST /api/analyses/:vintedId/regenerate-negotiation body
 */
export const regenerateNegotiationBodySchema = z.object({
	tone: negotiationToneEnum,
})

/**
 * Type exports for validated data
 */
export type AnalyzeBody = z.infer<typeof analyzeBodySchema>
export type ListAnalysesQuery = z.infer<typeof listAnalysesQuerySchema>
export type UpdateStatusBody = z.infer<typeof updateStatusBodySchema>
export type VintedIdParam = z.infer<typeof vintedIdParamSchema>
export type RegenerateNegotiationBody = z.infer<typeof regenerateNegotiationBodySchema>
