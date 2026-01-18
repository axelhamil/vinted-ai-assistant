import { Hono } from 'hono'
import type { Container } from 'inversify'
import { AnalysisController } from '../adapters/controllers/analysis.controller'
import {
	isValidationError,
	validateBody,
	validateParams,
	validateQuery,
} from './middleware/validation.middleware'
import {
	analyzeBodySchema,
	listAnalysesQuerySchema,
	regenerateNegotiationBodySchema,
	updateStatusBodySchema,
	vintedIdParamSchema,
} from './schemas/analysis.schemas'

/**
 * Create analysis routes
 * Endpoints:
 * - POST /api/analyze
 * - GET /api/analyses
 * - GET /api/analyses/:vintedId
 * - PATCH /api/analyses/:vintedId/status
 * - POST /api/analyses/:vintedId/regenerate-negotiation
 * - GET /api/analyses/:vintedId/export
 * - GET /api/stats
 */
export function createAnalysisRoutes(container: Container): Hono {
	const router = new Hono()
	const controller = new AnalysisController(container)

	// Error handling middleware for validation errors
	router.onError((err, c) => {
		if (isValidationError(err)) {
			return c.json(err.response, 400)
		}
		throw err
	})

	/**
	 * POST /api/analyze
	 * Analyze a Vinted article
	 */
	router.post('/analyze', async (c) => {
		const rawBody = await c.req.json()

		const validation = analyzeBodySchema.safeParse(rawBody)
		if (!validation.success) {
			return c.json({
				error: 'Validation Error',
				message: 'Request validation failed',
				details: validation.error.issues.map(issue => ({
					field: issue.path.join('.'),
					message: issue.message,
				})),
			}, 400)
		}

		const result = await controller.analyze(validation.data)
		return c.json(result, 201)
	})

	/**
	 * GET /api/analyses
	 * List analyses with pagination and filtering
	 * Query params: limit, offset, minScore, status
	 */
	router.get('/analyses', async (c) => {
		const query = validateQuery(c, listAnalysesQuerySchema)
		const result = await controller.getAnalyses(query)
		return c.json(result)
	})

	/**
	 * GET /api/stats
	 * Get analysis statistics
	 */
	router.get('/stats', async (c) => {
		const result = await controller.getStats()
		return c.json(result)
	})

	/**
	 * GET /api/analyses/:vintedId
	 * Get a single analysis by Vinted ID
	 */
	router.get('/analyses/:vintedId', async (c) => {
		const { vintedId } = validateParams(c, vintedIdParamSchema)
		const result = await controller.getAnalysisByVintedId(vintedId)
		return c.json(result)
	})

	/**
	 * PATCH /api/analyses/:vintedId/status
	 * Update the status of an analysis
	 */
	router.patch('/analyses/:vintedId/status', async (c) => {
		const { vintedId } = validateParams(c, vintedIdParamSchema)
		const body = await validateBody(c, updateStatusBodySchema)
		const result = await controller.updateStatus(vintedId, body.status)
		return c.json(result)
	})

	/**
	 * POST /api/analyses/:vintedId/regenerate-negotiation
	 * Regenerate negotiation script with specified tone
	 */
	router.post('/analyses/:vintedId/regenerate-negotiation', async (c) => {
		const { vintedId } = validateParams(c, vintedIdParamSchema)
		const body = await validateBody(c, regenerateNegotiationBodySchema)
		const result = await controller.regenerateNegotiation(vintedId, body.tone)
		return c.json(result)
	})

	/**
	 * GET /api/analyses/:vintedId/export
	 * Export an analysis to markdown
	 */
	router.get('/analyses/:vintedId/export', async (c) => {
		const { vintedId } = validateParams(c, vintedIdParamSchema)
		const result = await controller.exportMarkdown(vintedId)

		// Return as downloadable markdown file
		c.header('Content-Type', 'text/markdown; charset=utf-8')
		c.header('Content-Disposition', `attachment; filename="${result.filename}"`)

		return c.body(result.content)
	})

	return router
}
