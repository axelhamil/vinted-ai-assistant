import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	schema: './src/adapters/persistence/database/schema.ts',
	out: './src/adapters/persistence/database/migrations',
	dialect: 'sqlite',
	dbCredentials: {
		url: './data/vinted-ai.db',
	},
})
