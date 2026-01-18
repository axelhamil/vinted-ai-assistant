import 'reflect-metadata'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { IAIProvider } from './application/interfaces/providers/ai.provider.interface'
import { TYPES, container } from './container'
import { createAnalysisRoutes } from './routes/analysis.routes'
import { errorHandler } from './routes/middleware'

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

const port = 3000

console.log(`🚀 Backend running on http://localhost:${port}`)

serve({
	fetch: app.fetch,
	port,
})
