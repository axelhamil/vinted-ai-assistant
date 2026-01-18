import 'reflect-metadata'

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { IAIProvider } from './application/interfaces/providers/ai.provider.interface'
import { TYPES, container } from './container'

const app = new Hono()

app.get('/api/health', (c) => {
	const aiProvider = container.get<IAIProvider>(TYPES.AIProvider)
	return c.json({
		status: 'ok',
		aiProvider: aiProvider.getProviderName(),
	})
})

const port = 3000

console.log(`🚀 Backend running on http://localhost:${port}`)

serve({
	fetch: app.fetch,
	port,
})
