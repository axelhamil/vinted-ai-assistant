/**
 * Content script entry point for Vinted AI Assistant
 * Injects React UI components into Vinted article pages using Shadow DOM
 * for style isolation from Vinted's styles
 */

import { StrictMode } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { App } from './App'
import { createShadowContainer, injectStyles } from './lib/shadow-dom'
import contentStyles from './styles.css?inline'

// Store the React root for cleanup
let reactRoot: Root | null = null

/**
 * Initializes the content script UI
 */
function initializeUI(): void {
	console.log('[Vinted AI] Initializing content script UI')

	try {
		// Create Shadow DOM container
		const { shadowRoot, reactRoot: rootElement } = createShadowContainer()

		// Inject Tailwind and custom styles into shadow DOM
		injectStyles(shadowRoot, contentStyles)

		// Create React root and render app
		reactRoot = createRoot(rootElement)
		reactRoot.render(
			<StrictMode>
				<App />
			</StrictMode>
		)

		console.log('[Vinted AI] Content script UI initialized successfully')
	} catch (err) {
		console.error('[Vinted AI] Failed to initialize UI:', err)
	}
}

/**
 * Cleans up the content script UI
 */
function cleanupUI(): void {
	if (reactRoot) {
		reactRoot.unmount()
		reactRoot = null
	}
}

// Check if we're on a Vinted article page
function isVintedArticlePage(): boolean {
	return window.location.pathname.startsWith('/items/')
}

// Initialize when the page is ready
if (isVintedArticlePage()) {
	console.log('[Vinted AI] Vinted article page detected')
	initializeUI()
} else {
	console.log('[Vinted AI] Not a Vinted article page, skipping initialization')
}

// Handle navigation changes (for SPA-like behavior)
let currentPath = window.location.pathname

const observer = new MutationObserver(() => {
	const newPath = window.location.pathname

	if (newPath !== currentPath) {
		currentPath = newPath

		if (isVintedArticlePage()) {
			console.log('[Vinted AI] Navigated to article page')
			// Small delay to let the page render
			setTimeout(() => {
				cleanupUI()
				initializeUI()
			}, 500)
		} else {
			console.log('[Vinted AI] Navigated away from article page')
			cleanupUI()
		}
	}
})

// Observe URL changes
observer.observe(document.body, {
	childList: true,
	subtree: true,
})

// Cleanup on unload
window.addEventListener('unload', cleanupUI)
