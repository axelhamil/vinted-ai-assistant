import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const analyses = sqliteTable('analyses', {
	id: text('id').primaryKey(),
	vintedId: text('vinted_id').notNull().unique(),
	url: text('url').notNull(),
	title: text('title').notNull(),
	description: text('description'),
	price: real('price').notNull(),
	totalPrice: real('total_price'),
	brand: text('brand'),
	size: text('size'),
	condition: text('condition'),

	// Seller
	sellerUsername: text('seller_username').notNull(),
	sellerRating: real('seller_rating'),
	sellerSalesCount: integer('seller_sales_count'),

	// Photos
	photos: text('photos', { mode: 'json' }).$type<string[]>().notNull(),

	// Photo Analysis
	photoQualityScore: integer('photo_quality_score').notNull(),
	photoAnalysis: text('photo_analysis', { mode: 'json' })
		.$type<{
			hasModel: boolean
			lighting: 'poor' | 'average' | 'good'
			background: 'messy' | 'neutral' | 'professional'
			issues: string[]
		}>()
		.notNull(),

	// Authenticity
	authenticityScore: integer('authenticity_score').notNull(),
	authenticityFlags: text('authenticity_flags', { mode: 'json' }).$type<string[]>().notNull(),
	authenticityConfidence: text('authenticity_confidence')
		.$type<'low' | 'medium' | 'high'>()
		.notNull(),

	// AI Detection
	detectedModel: text('detected_model'),

	// Market Price
	marketPriceLow: real('market_price_low'),
	marketPriceHigh: real('market_price_high'),
	marketPriceAvg: real('market_price_avg'),
	marketPriceSources: text('market_price_sources', { mode: 'json' }).$type<
		Array<{
			name: string
			price: number
			url?: string
		}>
	>(),
	marketPriceConfidence: text('market_price_confidence').$type<'low' | 'medium' | 'high'>(),
	marketPriceReasoning: text('market_price_reasoning'),

	// Opportunity
	opportunityScore: integer('opportunity_score').notNull(),
	margin: real('margin'),
	marginPercent: real('margin_percent'),
	signals: text('signals', { mode: 'json' })
		.$type<
			Array<{
				type: 'positive' | 'negative' | 'neutral'
				label: string
				detail: string
			}>
		>()
		.notNull(),

	// Negotiation
	suggestedOffer: real('suggested_offer'),
	negotiationScript: text('negotiation_script'),
	negotiationArguments: text('negotiation_arguments', {
		mode: 'json',
	}).$type<string[]>(),
	negotiationTone: text('negotiation_tone').$type<'friendly' | 'direct' | 'urgent'>(),

	// Resale
	resalePrice: real('resale_price'),
	resaleEstimatedDays: integer('resale_estimated_days'),
	resaleTips: text('resale_tips', { mode: 'json' }).$type<string[]>(),
	resalePlatforms: text('resale_platforms', { mode: 'json' }).$type<
		Array<{
			name: string
			relevance: 'high' | 'medium' | 'low'
		}>
	>(),

	// Status
	status: text('status')
		.$type<'ANALYZED' | 'WATCHING' | 'BOUGHT' | 'SOLD' | 'ARCHIVED'>()
		.notNull()
		.default('ANALYZED'),

	// Meta
	analyzedAt: integer('analyzed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export type Analysis = typeof analyses.$inferSelect
export type NewAnalysis = typeof analyses.$inferInsert

// ============================================================================
// PHOTO STUDIO PRESETS
// ============================================================================

export const studioPresets = sqliteTable('studio_presets', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	promptTemplate: text('prompt_template').notNull(),
	type: text('type').$type<'system' | 'custom'>().notNull().default('custom'),
	previewImage: text('preview_image'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export type StudioPreset = typeof studioPresets.$inferSelect
export type NewStudioPreset = typeof studioPresets.$inferInsert
