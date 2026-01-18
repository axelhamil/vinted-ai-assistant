/**
 * JSON-LD structured data parser for Vinted pages
 */

/**
 * Interface for JSON-LD structured data from Vinted pages
 */
export interface VintedJsonLd {
	'@type'?: string
	name?: string
	description?: string
	image?: string | string[]
	offers?: {
		price?: string | number
	}
	brand?: {
		name?: string
	}
	itemCondition?: string
	datePosted?: string
}

/**
 * Extracts JSON-LD structured data from the page
 */
export function extractJsonLd(): VintedJsonLd | null {
	const scripts = document.querySelectorAll('script[type="application/ld+json"]')

	for (const script of scripts) {
		try {
			const data = JSON.parse(script.textContent || '') as VintedJsonLd | VintedJsonLd[]

			// Check if it's a Product type
			if (!Array.isArray(data) && data['@type'] === 'Product') {
				return data
			}

			// Check if it's an array and find Product
			if (Array.isArray(data)) {
				const product = data.find((item) => item['@type'] === 'Product')
				if (product) return product
			}
		} catch {
			// Invalid JSON, continue to next script
		}
	}

	return null
}
