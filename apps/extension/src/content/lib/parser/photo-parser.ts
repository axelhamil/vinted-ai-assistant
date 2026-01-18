/**
 * Photo extraction utilities for Vinted article pages
 */

import { extractJsonLd } from './json-ld-parser'

/**
 * Checks if a URL is a valid Vinted photo URL
 */
function isValidPhotoUrl(url: string): boolean {
	// Check if it's a Vinted CDN image
	if (url.includes('vinted.net') || url.includes('vinted.com')) {
		return true
	}
	// Check for common CDN patterns
	if (url.includes('cloudfront') || url.includes('cdn')) {
		return true
	}
	// Exclude small icons, avatars, logos
	if (url.includes('icon') || url.includes('logo') || url.includes('avatar')) {
		return false
	}
	// Accept any https image that looks like a product photo
	return url.startsWith('https://') && /\.(jpg|jpeg|png|webp)/i.test(url)
}

/**
 * Gets highest resolution version of a Vinted image URL
 * Note: Keep the 's' param as it's a signature required by Vinted CDN
 */
export function getHighResolutionUrl(url: string): string {
	// Vinted uses URL parameters for image sizing
	// Only remove size params (w, h) but keep signature (s)
	try {
		const urlObj = new URL(url)
		// Only remove actual size parameters, NOT the signature
		urlObj.searchParams.delete('w')
		urlObj.searchParams.delete('h')
		return urlObj.toString()
	} catch {
		return url
	}
}

/**
 * Parses srcset to get the highest resolution image URL
 */
function parseHighestResFromSrcset(srcset: string): string | null {
	const entries = srcset.split(',').map((entry) => {
		const parts = entry.trim().split(/\s+/)
		const url = parts[0]
		const descriptor = parts[1] || '1x'
		const width = Number.parseInt(descriptor) || 1
		return { url, width }
	})

	if (entries.length === 0) return null

	// Sort by width descending and return the highest
	entries.sort((a, b) => b.width - a.width)
	return entries[0]?.url ?? null
}

/**
 * Extracts photo URLs from the page
 * Only extracts images from the article photo container
 */
export function extractPhotos(): string[] {
	const photos: string[] = []
	const seen = new Set<string>()

	// Helper to add photo if valid
	const addPhoto = (url: string) => {
		if (url && !seen.has(url) && isValidPhotoUrl(url)) {
			const highResSrc = getHighResolutionUrl(url)
			if (!seen.has(highResSrc)) {
				seen.add(highResSrc)
				photos.push(highResSrc)
			}
		}
	}

	// Helper to extract images from a container
	const extractFromContainer = (container: Element) => {
		const images = container.querySelectorAll<HTMLImageElement>('img')
		for (const img of images) {
			// Try src first
			addPhoto(img.src)
			// Try data-src (lazy loading)
			addPhoto(img.getAttribute('data-src') || '')
			// Try srcset
			const srcset = img.getAttribute('srcset')
			if (srcset) {
				const highestRes = parseHighestResFromSrcset(srcset)
				if (highestRes) addPhoto(highestRes)
			}
		}
	}

	// Primary: Find the item photos container (most specific)
	const photoContainerSelectors = [
		'section.item-photos__container',
		'.item-photos__container',
		'.item-photos',
		'[data-testid="item-photo-gallery"]',
		'[data-testid="item-photos"]',
	]

	for (const selector of photoContainerSelectors) {
		const container = document.querySelector(selector)
		if (container) {
			extractFromContainer(container)
			if (photos.length > 0) {
				return photos
			}
		}
	}

	// Secondary: Try specific image selectors within known patterns
	const specificSelectors = [
		'figure.item-photo img.web_ui__Image__content',
		'.item-photo img.web_ui__Image__content',
		'.item-thumbnail img.web_ui__Image__content',
		'[data-testid^="item-photo-"] img',
	]

	for (const selector of specificSelectors) {
		try {
			const images = document.querySelectorAll<HTMLImageElement>(selector)
			for (const img of images) {
				addPhoto(img.src)
				addPhoto(img.getAttribute('data-src') || '')
				const srcset = img.getAttribute('srcset')
				if (srcset) {
					const highestRes = parseHighestResFromSrcset(srcset)
					if (highestRes) addPhoto(highestRes)
				}
			}
		} catch {
			// Selector might be invalid, continue
		}
	}

	if (photos.length > 0) {
		return photos
	}

	// Tertiary: Try to get photos from JSON-LD (usually contains main product images)
	const jsonLd = extractJsonLd()
	if (jsonLd?.image) {
		const images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image]
		for (const imgUrl of images) {
			if (typeof imgUrl === 'string') addPhoto(imgUrl)
		}
	}

	if (photos.length > 0) {
		return photos
	}

	// Last resort fallback: find the first large image that looks like a product photo
	const allImgs = document.querySelectorAll<HTMLImageElement>('img.web_ui__Image__content')
	for (const img of allImgs) {
		// Only consider large images that are likely product photos
		if (img.naturalWidth > 200 && img.naturalHeight > 200) {
			const src = img.src || img.getAttribute('data-src') || ''
			if (src && src.includes('vinted.net')) {
				addPhoto(src)
				// Limit fallback to max 5 images to avoid grabbing unrelated content
				if (photos.length >= 5) break
			}
		}
	}

	return photos
}
