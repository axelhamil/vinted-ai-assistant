import 'reflect-metadata'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { IAIProvider } from './application/interfaces/providers/ai.provider.interface'
import { TYPES, container } from './container'
import { createAnalysisRoutes } from './routes/analysis.routes'

const app = new Hono()

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
