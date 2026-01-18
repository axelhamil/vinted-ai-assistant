import type { AnalysisStatus } from '@vinted-ai/shared'
import { Hono } from 'hono'
import type { Container } from 'inversify'
import { AnalysisController } from '../adapters/controllers/analysis.controller'
import type { ListAnalysesQueryDTO } from '../application/dtos/analysis.dto'
import type { ArticleInputDTO } from '../application/dtos/article.dto'

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

	/**
	 * POST /api/analyze
	 * Analyze a Vinted article
	 */
	router.post('/analyze', async (c) => {
		const body = (await c.req.json()) as ArticleInputDTO
		const result = await controller.analyze(body)
		return c.json(result, 201)
	})

	/**
	 * GET /api/analyses
	 * List analyses with pagination and filtering
	 * Query params: limit, offset, minScore, status
	 */
	router.get('/analyses', async (c) => {
		const query: ListAnalysesQueryDTO = {
			limit: c.req.query('limit') ? Number.parseInt(c.req.query('limit') as string, 10) : undefined,
			offset: c.req.query('offset')
				? Number.parseInt(c.req.query('offset') as string, 10)
				: undefined,
			minScore: c.req.query('minScore')
				? Number.parseInt(c.req.query('minScore') as string, 10)
				: undefined,
			status: c.req.query('status') as AnalysisStatus | undefined,
		}
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
		const vintedId = c.req.param('vintedId')
		const result = await controller.getAnalysisByVintedId(vintedId)
		return c.json(result)
	})

	/**
	 * PATCH /api/analyses/:vintedId/status
	 * Update the status of an analysis
	 */
	router.patch('/analyses/:vintedId/status', async (c) => {
		const vintedId = c.req.param('vintedId')
		const body = (await c.req.json()) as { status: AnalysisStatus }
		const result = await controller.updateStatus(vintedId, body.status)
		return c.json(result)
	})

	/**
	 * GET /api/analyses/:vintedId/export
	 * Export an analysis to markdown
	 */
	router.get('/analyses/:vintedId/export', async (c) => {
		const vintedId = c.req.param('vintedId')
		const result = await controller.exportMarkdown(vintedId)

		// Return as downloadable markdown file
		c.header('Content-Type', 'text/markdown; charset=utf-8')
		c.header('Content-Disposition', `attachment; filename="${result.filename}"`)

		return c.body(result.content)
	})

	return router
}
