/**
 * Handles drag & drop of edited photos into Vinted's upload zone
 * Injects a drop listener that converts our custom data to files
 */

import { dataUrlToFile } from './utils/data-url-to-file'

// Custom data type for our photos
export const VINTED_AI_PHOTO_TYPE = 'application/x-vinted-ai-photo'

export interface VintedAIPhotoData {
	dataUrl: string
	filename: string
}

// Selectors for Vinted's upload zone - multiple fallbacks
const UPLOAD_ZONE_SELECTORS = [
	'[data-testid="photo-upload"]',
	'[data-testid="photo-dropzone"]',
	'.photo-upload',
	'.photo-upload__dropzone',
	'[class*="dropzone"]',
	'[class*="photo-upload"]',
	'[class*="PhotoUpload"]',
	'input[type="file"][accept*="image"]',
]

let isInitialized = false
let observer: MutationObserver | null = null

/**
 * Find the file input element in Vinted's upload form
 */
function findFileInput(): HTMLInputElement | null {
	// First try to find a visible file input
	const directInput = document.querySelector<HTMLInputElement>(
		'input[type="file"][accept*="image"]'
	)
	if (directInput) return directInput

	// Look inside upload containers
	for (const selector of UPLOAD_ZONE_SELECTORS) {
		const container = document.querySelector(selector)
		if (container) {
			const input = container.querySelector<HTMLInputElement>('input[type="file"]')
			if (input) return input
		}
	}

	return null
}

/**
 * Find the upload zone element
 */
function findUploadZone(): HTMLElement | null {
	for (const selector of UPLOAD_ZONE_SELECTORS) {
		const element = document.querySelector<HTMLElement>(selector)
		if (element && element.tagName !== 'INPUT') {
			return element
		}
	}
	return null
}

/**
 * Inject files into Vinted's file input
 */
export function injectFilesIntoVintedUpload(files: File[]): boolean {
	const fileInput = findFileInput()

	if (!fileInput) {
		console.error('[Vinted AI Studio] Could not find file input')
		return false
	}

	try {
		// Create a DataTransfer to set the files
		const dataTransfer = new DataTransfer()

		// Add existing files if any
		if (fileInput.files) {
			for (const file of Array.from(fileInput.files)) {
				dataTransfer.items.add(file)
			}
		}

		// Add new files
		for (const file of files) {
			dataTransfer.items.add(file)
		}

		// Set files on the input
		fileInput.files = dataTransfer.files

		// Trigger events to notify React/Vue/etc. of the change
		const events = [
			new Event('input', { bubbles: true, cancelable: true }),
			new Event('change', { bubbles: true, cancelable: true }),
		]

		for (const event of events) {
			fileInput.dispatchEvent(event)
		}

		console.log(`[Vinted AI Studio] Injected ${files.length} file(s) into upload`)
		return true
	} catch (err) {
		console.error('[Vinted AI Studio] Failed to inject files:', err)
		return false
	}
}

/**
 * Handle drag over event
 */
function handleDragOver(e: DragEvent): void {
	// Check if our custom data type is present
	if (e.dataTransfer?.types.includes(VINTED_AI_PHOTO_TYPE)) {
		e.preventDefault()
		e.stopPropagation()
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'copy'
		}

		// Add visual feedback
		const target = e.currentTarget as HTMLElement
		target.classList.add('vinted-ai-drop-active')
	}
}

/**
 * Handle drag leave event
 */
function handleDragLeave(e: DragEvent): void {
	const target = e.currentTarget as HTMLElement
	target.classList.remove('vinted-ai-drop-active')
}

/**
 * Handle drop event
 */
function handleDrop(e: DragEvent): void {
	const target = e.currentTarget as HTMLElement
	target.classList.remove('vinted-ai-drop-active')

	const photoDataStr = e.dataTransfer?.getData(VINTED_AI_PHOTO_TYPE)

	if (photoDataStr) {
		e.preventDefault()
		e.stopPropagation()

		try {
			const photoData: VintedAIPhotoData = JSON.parse(photoDataStr)
			const file = dataUrlToFile(photoData.dataUrl, photoData.filename)

			const success = injectFilesIntoVintedUpload([file])

			if (success) {
				console.log('[Vinted AI Studio] Photo dropped successfully:', photoData.filename)
			}
		} catch (err) {
			console.error('[Vinted AI Studio] Failed to process dropped photo:', err)
		}
	}
}

/**
 * Add drop listeners to an element
 */
function addDropListeners(element: HTMLElement): void {
	// Check if already initialized
	if (element.dataset.vintedAiDropzone === 'true') {
		return
	}

	element.dataset.vintedAiDropzone = 'true'
	element.addEventListener('dragover', handleDragOver)
	element.addEventListener('dragleave', handleDragLeave)
	element.addEventListener('drop', handleDrop)

	console.log('[Vinted AI Studio] Drop listeners added to upload zone')
}

/**
 * Initialize drop handler - call this when the form filling UI is initialized
 */
export function initializeDropHandler(): void {
	if (isInitialized) {
		return
	}

	console.log('[Vinted AI Studio] Initializing drop handler')

	// Try to find and attach to upload zone immediately
	const uploadZone = findUploadZone()
	if (uploadZone) {
		addDropListeners(uploadZone)
	}

	// Also observe for dynamically added upload zones
	observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'childList') {
				// Check if a new upload zone was added
				const zone = findUploadZone()
				if (zone && zone.dataset.vintedAiDropzone !== 'true') {
					addDropListeners(zone)
				}
			}
		}
	})

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	})

	isInitialized = true
}

/**
 * Cleanup drop handler
 */
export function cleanupDropHandler(): void {
	if (observer) {
		observer.disconnect()
		observer = null
	}

	// Remove listeners from any zones we attached to
	for (const el of document.querySelectorAll('[data-vinted-ai-dropzone="true"]')) {
		const element = el as HTMLElement
		element.removeEventListener('dragover', handleDragOver as EventListener)
		element.removeEventListener('dragleave', handleDragLeave as EventListener)
		element.removeEventListener('drop', handleDrop as EventListener)
		delete element.dataset.vintedAiDropzone
	}

	isInitialized = false
	console.log('[Vinted AI Studio] Drop handler cleaned up')
}

/**
 * Inject drop zone styles into the page
 */
export function injectDropZoneStyles(): void {
	const styleId = 'vinted-ai-dropzone-styles'
	if (document.getElementById(styleId)) {
		return
	}

	const style = document.createElement('style')
	style.id = styleId
	style.textContent = `
		.vinted-ai-drop-active {
			outline: 3px dashed #F97316 !important;
			outline-offset: -3px;
			background-color: rgba(249, 115, 22, 0.1) !important;
			transition: all 150ms ease;
		}
	`
	document.head.appendChild(style)
}
