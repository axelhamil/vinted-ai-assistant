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
		const body = await validateBody(c, analyzeBodySchema)
		const result = await controller.analyze(body)
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
