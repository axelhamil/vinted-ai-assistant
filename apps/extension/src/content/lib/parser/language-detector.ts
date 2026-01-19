/**
 * Language detection utilities for Vinted pages
 */

/**
 * Map Vinted TLDs to language codes
 */
const domainLanguageMap: Record<string, string> = {
	'vinted.fr': 'fr',
	'vinted.de': 'de',
	'vinted.es': 'es',
	'vinted.it': 'it',
	'vinted.nl': 'nl',
	'vinted.be': 'fr', // Belgium uses French/Dutch, default to French
	'vinted.at': 'de', // Austria
	'vinted.pl': 'pl',
	'vinted.pt': 'pt',
	'vinted.cz': 'cs',
	'vinted.sk': 'sk',
	'vinted.hu': 'hu',
	'vinted.ro': 'ro',
	'vinted.lt': 'lt',
	'vinted.hr': 'hr',
	'vinted.co.uk': 'en',
	'vinted.com': 'en',
}

/**
 * Detects the language from Vinted domain or browser settings
 * Returns ISO 639-1 language code (e.g., 'fr', 'en', 'de')
 */
export function detectLanguage(): string {
	// Try to extract from current hostname
	const hostname = window.location.hostname.toLowerCase()

	for (const [domain, lang] of Object.entries(domainLanguageMap)) {
		if (hostname.includes(domain) || hostname.endsWith(domain.replace('vinted.', ''))) {
			return lang
		}
	}

	// Fallback: check document language attribute
	const htmlLang = document.documentElement.lang
	if (htmlLang) {
		// Extract primary language code (e.g., 'fr-FR' -> 'fr')
		const primaryLang = (htmlLang.split('-')[0] ?? '').toLowerCase()
		if (Object.values(domainLanguageMap).includes(primaryLang)) {
			return primaryLang
		}
	}

	// Fallback: use browser language
	const browserLang = (navigator.language.split('-')[0] ?? '').toLowerCase()
	if (Object.values(domainLanguageMap).includes(browserLang)) {
		return browserLang
	}

	// Default to French (most common for Vinted)
	return 'fr'
}
