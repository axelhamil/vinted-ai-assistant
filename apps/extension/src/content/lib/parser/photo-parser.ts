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
 * Extracts photos from Vinted's embedded script data
 * Vinted stores item data in script tags that we can parse
 */
function extractFromScriptData(): string[] {
	const photos: string[] = []

	// Look for script tags containing item photo data
	const scripts = document.querySelectorAll('script')
	for (const script of scripts) {
		const content = script.textContent || ''

		// Look for patterns like "full_size_url":"https://..." or photo URLs in JSON
		const urlPattern =
			/"(?:full_size_url|url|image_url|photo_url|high_resolution\.url)":\s*"(https:\/\/[^"]+vinted[^"]+)"/g
		for (const match of content.matchAll(urlPattern)) {
			if (match[1] && !match[1].includes('avatar') && !match[1].includes('icon')) {
				photos.push(match[1])
			}
		}

		// Also look for image arrays in format ["https://..."]
		const arrayPattern =
			/\["(https:\/\/images[^"]+vinted\.net[^"]+)"(?:,"(https:\/\/images[^"]+vinted\.net[^"]+)")*\]/g
		for (const match of content.matchAll(arrayPattern)) {
			// Extract all URLs from the match
			const urls = match[0].match(/https:\/\/images[^"]+vinted\.net[^"]+/g)
			if (urls) {
				photos.push(...urls)
			}
		}
	}

	return photos
}

/**
 * Extracts photo URLs from the page
 * Prioritizes embedded script data, then JSON-LD, then DOM sources
 */
export function extractPhotos(): string[] {
	const photos: string[] = []
	const seen = new Set<string>()

	// Helper to add photo if valid (normalizes to high-res URL)
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

	// 1. PRIMARY: Extract from embedded script data (most complete source)
	const scriptPhotos = extractFromScriptData()
	for (const url of scriptPhotos) {
		addPhoto(url)
	}

	// 2. SECONDARY: Try to get photos from JSON-LD
	const jsonLd = extractJsonLd()
	if (jsonLd?.image) {
		const images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image]
		for (const imgUrl of images) {
			if (typeof imgUrl === 'string') addPhoto(imgUrl)
		}
	}

	// 3. TERTIARY: Extract from thumbnail gallery (shows all photos)
	const thumbnailSelectors = [
		'.item-photos .item-thumbnail',
		'.item-thumbnail',
		'[data-testid="item-thumbnail"]',
		'.item-photos__thumbnails img',
		'.item-photos__thumbnail img',
	]

	for (const selector of thumbnailSelectors) {
		try {
			const thumbs = document.querySelectorAll<HTMLElement>(selector)
			for (const thumb of thumbs) {
				// Check if it's an img element
				if (thumb.tagName === 'IMG') {
					const img = thumb as HTMLImageElement
					addPhoto(img.src)
					addPhoto(img.getAttribute('data-src') || '')
				}
				// Check for background image style
				const bgStyle = thumb.style.backgroundImage
				if (bgStyle) {
					const urlMatch = bgStyle.match(/url\(["']?([^"')]+)["']?\)/)
					if (urlMatch?.[1]) addPhoto(urlMatch[1])
				}
				// Check for nested img
				const nestedImg = thumb.querySelector<HTMLImageElement>('img')
				if (nestedImg) {
					addPhoto(nestedImg.src)
					addPhoto(nestedImg.getAttribute('data-src') || '')
				}
			}
		} catch {
			// Selector might be invalid, continue
		}
	}

	// 4. Extract from main photo container
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
		}
	}

	// 5. Try specific image selectors within known patterns
	const specificSelectors = [
		'figure.item-photo img.web_ui__Image__content',
		'.item-photo img.web_ui__Image__content',
		'.item-thumbnail img.web_ui__Image__content',
		'[data-testid^="item-photo-"] img',
		'.item-photos img[src*="vinted"]',
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

	// 6. FALLBACK: Find any large Vinted images on the page
	if (photos.length === 0) {
		const allImgs = document.querySelectorAll<HTMLImageElement>('img[src*="vinted"]')
		for (const img of allImgs) {
			const src = img.src || img.getAttribute('data-src') || ''
			if (src && !src.includes('avatar') && !src.includes('icon') && !src.includes('logo')) {
				addPhoto(src)
			}
		}
	}

	return photos
}
