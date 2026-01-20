import { Hono } from 'hono'
import type { Container } from 'inversify'
import { StudioController } from '../controllers/studio.controller'
import {
	isValidationError,
	validateBody,
	validateParams,
	validateQuery,
} from './middleware/validation.middleware'
import {
	analyzeFormSchema,
	createPresetSchema,
	editPhotoBatchSchema,
	editPhotoCustomSchema,
	editPhotoSchema,
	listPresetsQuerySchema,
	presetIdParamSchema,
} from './schemas/studio.schemas'

/**
 * Create studio routes
 * Endpoints:
 * - POST /api/studio/edit - Edit a single photo with preset
 * - POST /api/studio/edit-custom - Edit with custom prompt
 * - POST /api/studio/edit-batch - Edit multiple photos
 * - POST /api/studio/analyze-form - Analyze photos for form suggestions
 * - GET /api/studio/presets - List presets
 * - POST /api/studio/presets - Create a preset
 * - DELETE /api/studio/presets/:id - Delete a preset
 */
export function createStudioRoutes(container: Container): Hono {
	const router = new Hono()
	const controller = new StudioController(container)

	// Error handling middleware for validation errors
	router.onError((err, c) => {
		if (isValidationError(err)) {
			return c.json(err.response, 400)
		}
		throw err
	})

	/**
	 * POST /api/studio/edit
	 * Edit a single photo using a preset
	 */
	router.post('/edit', async (c) => {
		const rawBody = await c.req.json()

		const validation = editPhotoSchema.safeParse(rawBody)
		if (!validation.success) {
			return c.json(
				{
					error: 'Validation Error',
					message: 'Request validation failed',
					details: validation.error.issues.map((issue) => ({
						field: issue.path.join('.'),
						message: issue.message,
					})),
				},
				400
			)
		}

		const result = await controller.editPhoto(validation.data)
		return c.json(result)
	})

	/**
	 * POST /api/studio/edit-custom
	 * Edit a single photo using a custom prompt
	 */
	router.post('/edit-custom', async (c) => {
		const rawBody = await c.req.json()

		const validation = editPhotoCustomSchema.safeParse(rawBody)
		if (!validation.success) {
			return c.json(
				{
					error: 'Validation Error',
					message: 'Request validation failed',
					details: validation.error.issues.map((issue) => ({
						field: issue.path.join('.'),
						message: issue.message,
					})),
				},
				400
			)
		}

		const result = await controller.editPhotoCustom(validation.data)
		return c.json(result)
	})

	/**
	 * POST /api/studio/edit-batch
	 * Edit multiple photos using a preset
	 */
	router.post('/edit-batch', async (c) => {
		const rawBody = await c.req.json()

		const validation = editPhotoBatchSchema.safeParse(rawBody)
		if (!validation.success) {
			return c.json(
				{
					error: 'Validation Error',
					message: 'Request validation failed',
					details: validation.error.issues.map((issue) => ({
						field: issue.path.join('.'),
						message: issue.message,
					})),
				},
				400
			)
		}

		const result = await controller.editPhotoBatch(validation.data)
		return c.json(result)
	})

	/**
	 * POST /api/studio/analyze-form
	 * Analyze photos and suggest form filling values
	 */
	router.post('/analyze-form', async (c) => {
		const rawBody = await c.req.json()

		const validation = analyzeFormSchema.safeParse(rawBody)
		if (!validation.success) {
			return c.json(
				{
					error: 'Validation Error',
					message: 'Request validation failed',
					details: validation.error.issues.map((issue) => ({
						field: issue.path.join('.'),
						message: issue.message,
					})),
				},
				400
			)
		}

		const result = await controller.analyzeForForm(validation.data)
		return c.json(result)
	})

	/**
	 * GET /api/studio/presets
	 * List presets (optionally filtered by type)
	 */
	router.get('/presets', async (c) => {
		const query = validateQuery(c, listPresetsQuerySchema)
		const result = await controller.listPresets(query.type)
		return c.json(result)
	})

	/**
	 * POST /api/studio/presets
	 * Create a custom preset
	 */
	router.post('/presets', async (c) => {
		const body = await validateBody(c, createPresetSchema)
		const result = await controller.createPreset(body)
		return c.json(result, 201)
	})

	/**
	 * DELETE /api/studio/presets/:id
	 * Delete a custom preset
	 */
	router.delete('/presets/:id', async (c) => {
		const { id } = validateParams(c, presetIdParamSchema)
		const deleted = await controller.deletePreset(id)

		if (!deleted) {
			return c.json({ error: 'Preset not found or cannot be deleted' }, 404)
		}

		return c.json({ success: true })
	})

	return router
}

/**
 * Initialize studio (seed presets)
 */
export async function initializeStudio(container: Container): Promise<void> {
	const controller = new StudioController(container)
	await controller.seedSystemPresets()
}
