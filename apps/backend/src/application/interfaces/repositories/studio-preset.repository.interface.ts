import type { NewStudioPreset, StudioPreset } from '../../../adapters/persistence/database/schema'

/**
 * Repository interface for studio presets
 */
export interface IStudioPresetRepository {
	/**
	 * Find a preset by ID
	 */
	findById(id: string): Promise<StudioPreset | null>

	/**
	 * Find all presets, optionally filtered by type
	 */
	findAll(type?: 'system' | 'custom'): Promise<StudioPreset[]>

	/**
	 * Create a new preset
	 */
	create(preset: NewStudioPreset): Promise<StudioPreset>

	/**
	 * Update an existing preset
	 */
	update(id: string, preset: Partial<NewStudioPreset>): Promise<StudioPreset | null>

	/**
	 * Delete a preset by ID
	 */
	delete(id: string): Promise<boolean>

	/**
	 * Check if a preset exists
	 */
	exists(id: string): Promise<boolean>

	/**
	 * Seed system presets (only if they don't exist)
	 */
	seedSystemPresets(): Promise<void>
}
