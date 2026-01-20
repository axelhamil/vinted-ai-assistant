import { createId } from '@paralleldrive/cuid2'
import { asc, eq } from 'drizzle-orm'
import { injectable } from 'inversify'
import type { IStudioPresetRepository } from '../../application/interfaces/repositories/studio-preset.repository.interface'
import { db } from './database/client'
import { type NewStudioPreset, type StudioPreset, studioPresets } from './database/schema'

/**
 * System presets configuration
 *
 * CRITICAL: All prompts must preserve the original item EXACTLY as-is.
 * Only the background and lighting should change - NO modifications to the clothing/item.
 */
const SYSTEM_PRESETS: Omit<NewStudioPreset, 'createdAt' | 'updatedAt'>[] = [
	{
		id: 'preset-white-studio',
		name: 'White Studio',
		description: 'Clean white table with subtle texture and soft lighting. Perfect for e-commerce.',
		promptTemplate: `Change ONLY the background of this photo. Keep the item EXACTLY as it appears.

CRITICAL RULES:
- DO NOT modify, alter, or "improve" the clothing/item in any way
- DO NOT change colors, textures, patterns, wrinkles, or any detail of the item
- DO NOT add or remove any element from the item
- ONLY replace the background and adjust lighting

BACKGROUND: White table surface with a subtle, slightly visible texture (like a matte painted wood or laminate surface). The item should look like it's laying flat on a real white table, not floating on a pure white void.
LIGHTING: Soft, diffused natural lighting from above, creating gentle shadows beneath the item to give depth and realism
STYLE: Clean e-commerce product photography, realistic and grounded

The item must remain pixel-perfect identical to the original - only the background changes.`,
		type: 'system',
		sortOrder: 1,
	},
	{
		id: 'preset-marble-surface',
		name: 'Marble Surface',
		description: 'Elegant marble surface with subtle reflections. Ideal for luxury items.',
		promptTemplate: `Change ONLY the background of this photo. Keep the item EXACTLY as it appears.

CRITICAL RULES:
- DO NOT modify, alter, or "improve" the clothing/item in any way
- DO NOT change colors, textures, patterns, wrinkles, or any detail of the item
- DO NOT add or remove any element from the item
- ONLY replace the background and adjust lighting

BACKGROUND: Elegant white or light grey marble surface with subtle veining
LIGHTING: Soft natural light, gentle shadows
STYLE: Luxury product photography

The item must remain pixel-perfect identical to the original - only the background changes.`,
		type: 'system',
		sortOrder: 2,
	},
	{
		id: 'preset-lifestyle',
		name: 'Lifestyle Setting',
		description: 'Cozy lifestyle environment with natural light. Great for casual items.',
		promptTemplate: `Change ONLY the background of this photo. Keep the item EXACTLY as it appears.

CRITICAL RULES:
- DO NOT modify, alter, or "improve" the clothing/item in any way
- DO NOT change colors, textures, patterns, wrinkles, or any detail of the item
- DO NOT add or remove any element from the item
- ONLY replace the background and adjust lighting

BACKGROUND: Cozy room environment (wooden floor, neutral furniture)
LIGHTING: Warm natural daylight
STYLE: Lifestyle photography, warm and inviting

The item must remain pixel-perfect identical to the original - only the background changes.`,
		type: 'system',
		sortOrder: 3,
	},
	{
		id: 'preset-fashion-editorial',
		name: 'Fashion Editorial',
		description: 'Dramatic editorial style with bold lighting. Perfect for statement pieces.',
		promptTemplate: `Change ONLY the background of this photo. Keep the item EXACTLY as it appears.

CRITICAL RULES:
- DO NOT modify, alter, or "improve" the clothing/item in any way
- DO NOT change colors, textures, patterns, wrinkles, or any detail of the item
- DO NOT add or remove any element from the item
- ONLY replace the background and adjust lighting

BACKGROUND: Solid color backdrop (charcoal grey or muted tone)
LIGHTING: Dramatic studio lighting with defined shadows
STYLE: Fashion editorial photography

The item must remain pixel-perfect identical to the original - only the background changes.`,
		type: 'system',
		sortOrder: 4,
	},
	{
		id: 'preset-minimalist',
		name: 'Minimalist',
		description: 'Neutral grey background with clean, balanced lighting.',
		promptTemplate: `Change ONLY the background of this photo. Keep the item EXACTLY as it appears.

CRITICAL RULES:
- DO NOT modify, alter, or "improve" the clothing/item in any way
- DO NOT change colors, textures, patterns, wrinkles, or any detail of the item
- DO NOT add or remove any element from the item
- ONLY replace the background and adjust lighting

BACKGROUND: Neutral grey (#E5E5E5) seamless background
LIGHTING: Balanced, even studio lighting
STYLE: Modern minimalist photography

The item must remain pixel-perfect identical to the original - only the background changes.`,
		type: 'system',
		sortOrder: 5,
	},
]

/**
 * Drizzle implementation of the Studio Preset repository
 */
@injectable()
export class DrizzleStudioPresetRepository implements IStudioPresetRepository {
	/**
	 * Find a preset by ID
	 */
	async findById(id: string): Promise<StudioPreset | null> {
		const record = await db.select().from(studioPresets).where(eq(studioPresets.id, id)).get()
		return record ?? null
	}

	/**
	 * Find all presets, optionally filtered by type
	 */
	async findAll(type?: 'system' | 'custom'): Promise<StudioPreset[]> {
		if (type) {
			return db
				.select()
				.from(studioPresets)
				.where(eq(studioPresets.type, type))
				.orderBy(asc(studioPresets.sortOrder), asc(studioPresets.name))
				.all()
		}

		return db
			.select()
			.from(studioPresets)
			.orderBy(asc(studioPresets.sortOrder), asc(studioPresets.name))
			.all()
	}

	/**
	 * Create a new preset
	 */
	async create(preset: NewStudioPreset): Promise<StudioPreset> {
		const id = preset.id || createId()
		const now = new Date()

		const record: NewStudioPreset = {
			...preset,
			id,
			type: preset.type || 'custom',
			sortOrder: preset.sortOrder ?? 100,
			createdAt: now,
			updatedAt: now,
		}

		await db.insert(studioPresets).values(record)

		const created = await this.findById(id)
		if (!created) {
			throw new Error('Failed to create preset')
		}

		return created
	}

	/**
	 * Update an existing preset
	 */
	async update(id: string, preset: Partial<NewStudioPreset>): Promise<StudioPreset | null> {
		const existing = await this.findById(id)
		if (!existing) {
			return null
		}

		// Don't allow updating system presets' core fields
		if (existing.type === 'system') {
			// Only allow updating sortOrder for system presets
			const { sortOrder } = preset
			if (sortOrder !== undefined) {
				await db
					.update(studioPresets)
					.set({ sortOrder, updatedAt: new Date() })
					.where(eq(studioPresets.id, id))
			}
		} else {
			await db
				.update(studioPresets)
				.set({
					...preset,
					updatedAt: new Date(),
				})
				.where(eq(studioPresets.id, id))
		}

		return this.findById(id)
	}

	/**
	 * Delete a preset by ID
	 */
	async delete(id: string): Promise<boolean> {
		const existing = await this.findById(id)
		if (!existing) {
			return false
		}

		// Don't allow deleting system presets
		if (existing.type === 'system') {
			return false
		}

		const result = await db
			.delete(studioPresets)
			.where(eq(studioPresets.id, id))
			.returning({ id: studioPresets.id })

		return result.length > 0
	}

	/**
	 * Check if a preset exists
	 */
	async exists(id: string): Promise<boolean> {
		const result = await db
			.select({ id: studioPresets.id })
			.from(studioPresets)
			.where(eq(studioPresets.id, id))
			.get()
		return result !== undefined
	}

	/**
	 * Seed system presets (only if they don't exist)
	 */
	async seedSystemPresets(): Promise<void> {
		for (const preset of SYSTEM_PRESETS) {
			const exists = await this.exists(preset.id)
			if (!exists) {
				await this.create(preset)
				console.log(`Seeded system preset: ${preset.name}`)
			}
		}
	}
}
