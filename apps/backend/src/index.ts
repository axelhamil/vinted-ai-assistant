import 'reflect-metadata'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createAnalysisRoutes } from './adapters/http/analysis.routes'
import { createStudioRoutes, initializeStudio } from './adapters/http/studio.routes'
import { errorHandler } from './adapters/http/middleware/error-handler.middleware'
import { container } from './application/container'
import { TYPES } from './application/di-types'
import type { IAIProvider } from './application/interfaces/providers/ai.provider.interface'

const app = new Hono()

// CORS configuration for Chrome extension
// Allows all origins since Chrome extensions have unique origins (chrome-extension://...)
// The extension runs locally and communicates with localhost backend
app.use(
	'*',
	cors({
		origin: '*',
		allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization'],
		exposeHeaders: ['Content-Disposition'],
		maxAge: 86400, // 24 hours - cache preflight requests
	})
)

// Global error handler
app.use('*', errorHandler)

// Health check endpoint
app.get('/api/health', (c) => {
	const aiProvider = container.get<IAIProvider>(TYPES.AIProvider)
	return c.json({
		status: 'ok',
		aiProvider: aiProvider.getProviderName(),
	})
})

// Mount analysis routes under /api
const analysisRoutes = createAnalysisRoutes(container)
app.route('/api', analysisRoutes)

// Mount studio routes under /api/studio
const studioRoutes = createStudioRoutes(container)
app.route('/api/studio', studioRoutes)

const port = 3000

// Initialize studio presets and start server
async function start() {
	try {
		// Seed system presets if they don't exist
		await initializeStudio(container)
		console.log('✅ Studio presets initialized')
	} catch (error) {
		console.error('⚠️ Failed to initialize studio presets:', error)
	}

	console.log(`🚀 Backend running on http://localhost:${port}`)

	const server = serve({
		fetch: app.fetch,
		port,
	})

	// Increase timeout for long-running AI requests (5 minutes)
	const httpServer = server as import('http').Server
	httpServer.timeout = 5 * 60 * 1000
	httpServer.keepAliveTimeout = 5 * 60 * 1000
}

start()
