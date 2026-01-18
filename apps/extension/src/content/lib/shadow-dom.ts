/**
 * Creates and manages the Shadow DOM container for the content script UI
 * This isolates our styles from Vinted's styles and vice versa
 */

const CONTAINER_ID = 'vinted-ai-assistant-root'

interface ShadowContainerResult {
	container: HTMLElement
	shadowRoot: ShadowRoot
	reactRoot: HTMLDivElement
}

/**
 * Creates a Shadow DOM container for mounting the React app
 * @returns The shadow root and react root elements
 */
export function createShadowContainer(): ShadowContainerResult {
	// Check if container already exists
	const existingContainer = document.getElementById(CONTAINER_ID)
	if (existingContainer) {
		const shadowRoot = existingContainer.shadowRoot
		if (shadowRoot) {
			const reactRoot = shadowRoot.querySelector('.vinted-ai-root') as HTMLDivElement
			if (reactRoot) {
				return { container: existingContainer, shadowRoot, reactRoot }
			}
		}
		// Remove invalid container
		existingContainer.remove()
	}

	// Create host element
	const container = document.createElement('div')
	container.id = CONTAINER_ID
	container.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		z-index: 2147483647;
		pointer-events: none;
	`

	// Create shadow root
	const shadowRoot = container.attachShadow({ mode: 'open' })

	// Create react mount point inside shadow DOM
	const reactRoot = document.createElement('div')
	reactRoot.className = 'vinted-ai-root'
	shadowRoot.appendChild(reactRoot)

	// Append to body
	document.body.appendChild(container)

	return { container, shadowRoot, reactRoot }
}

/**
 * Injects styles into the shadow root
 * @param shadowRoot - The shadow root to inject styles into
 * @param css - The CSS string to inject
 */
export function injectStyles(shadowRoot: ShadowRoot, css: string): void {
	const styleElement = document.createElement('style')
	styleElement.textContent = css
	shadowRoot.insertBefore(styleElement, shadowRoot.firstChild)
}

/**
 * Removes the shadow container from the DOM
 */
export function removeShadowContainer(): void {
	const container = document.getElementById(CONTAINER_ID)
	if (container) {
		container.remove()
	}
}

/**
 * Checks if the shadow container exists
 */
export function shadowContainerExists(): boolean {
	return document.getElementById(CONTAINER_ID) !== null
}
