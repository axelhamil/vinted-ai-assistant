import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()

app.get('/api/health', (c) => {
	return c.json({
		status: 'ok',
		aiProvider: 'openai',
	})
})

const port = 3000

console.log(`🚀 Backend running on http://localhost:${port}`)

serve({
	fetch: app.fetch,
	port,
})
