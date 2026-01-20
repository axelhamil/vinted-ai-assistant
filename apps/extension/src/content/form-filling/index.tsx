/**
 * Content script for Vinted listing creation page
 * Provides AI-powered form filling suggestions based on uploaded photos
 */

import { StrictMode } from 'react'
import { type Root, createRoot } from 'react-dom/client'
import { createShadowContainer, injectStyles } from '../lib/shadow-dom'
import contentStyles from '../styles.css?inline'
import { FormFillingApp } from './FormFillingApp'
import {
	cleanupDropHandler,
	initializeDropHandler,
	injectDropZoneStyles,
} from './vinted-drop-handler'

// Store the React root for cleanup
let reactRoot: Root | null = null
let containerElement: HTMLElement | null = null

/**
 * Check if we're on a Vinted listing creation page
 */
function isListingCreationPage(): boolean {
	const path = window.location.pathname
	// Matches: /items/new, /member/items/new, /members/{id}/items/new
	return path === '/items/new' || /\/member(s\/\d+)?\/items\/new/.test(path)
}

/**
 * Initializes the form filling UI
 */
function initializeUI(): void {
	if (containerElement) {
		console.log('[Vinted AI Studio] UI already initialized')
		return
	}

	console.log('[Vinted AI Studio] Initializing form filling UI')

	try {
		// Create Shadow DOM container
		const {
			container,
			shadowRoot,
			reactRoot: rootElement,
		} = createShadowContainer('vinted-ai-form-filling')
		containerElement = container

		// Inject Tailwind and custom styles into shadow DOM
		injectStyles(shadowRoot, contentStyles)

		// Initialize drop handler for drag & drop to Vinted's upload zone
		injectDropZoneStyles()
		initializeDropHandler()

		// Create React root and render app
		reactRoot = createRoot(rootElement)
		reactRoot.render(
			<StrictMode>
				<FormFillingApp />
			</StrictMode>
		)

		console.log('[Vinted AI Studio] Form filling UI initialized successfully')
	} catch (err) {
		console.error('[Vinted AI Studio] Failed to initialize UI:', err)
	}
}

/**
 * Cleans up the form filling UI
 */
function cleanupUI(): void {
	if (reactRoot) {
		reactRoot.unmount()
		reactRoot = null
	}
	if (containerElement) {
		containerElement.remove()
		containerElement = null
	}
	// Clean up drop handler
	cleanupDropHandler()
}

// Initialize when the page is ready
if (isListingCreationPage()) {
	console.log('[Vinted AI Studio] Listing creation page detected')
	// Wait for the form to be loaded
	setTimeout(initializeUI, 1000)
} else {
	console.log('[Vinted AI Studio] Not a listing creation page, skipping initialization')
}

// Handle navigation changes (for SPA-like behavior)
let currentPath = window.location.pathname

const observer = new MutationObserver(() => {
	const newPath = window.location.pathname

	if (newPath !== currentPath) {
		currentPath = newPath

		if (isListingCreationPage()) {
			console.log('[Vinted AI Studio] Navigated to listing creation page')
			setTimeout(initializeUI, 1000)
		} else {
			console.log('[Vinted AI Studio] Navigated away from listing creation page')
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
