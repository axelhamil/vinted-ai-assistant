import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

export default defineConfig({
	plugins: [react(), crx({ manifest })],
	build: {
		outDir: 'dist',
		emptyDirFirst: true,
	},
	server: {
		port: 5173,
		strictPort: true,
		cors: true,
		hmr: {
			port: 5173,
		},
	},
})
