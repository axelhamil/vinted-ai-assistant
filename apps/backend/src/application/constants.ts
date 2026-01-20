/**
 * Application-level constants used by use cases
 *
 * These constants configure business logic behavior and are decoupled
 * from adapter-specific configuration (which lives in adapters/providers/ai/ai.constants.ts)
 */

/** Maximum AI steps for article analysis (allows tool use iterations) */
export const MAX_AI_STEPS = {
	articleAnalysis: 15,
	formFilling: 5,
} as const

/** Concurrency limit for batch operations */
export const BATCH_CONCURRENCY_LIMIT = 3

/** Supported languages with their native names */
export const SUPPORTED_LANGUAGES: Record<string, string> = {
	fr: 'français',
	en: 'English',
	de: 'Deutsch',
	es: 'español',
	it: 'italiano',
	nl: 'Nederlands',
	pt: 'português',
	pl: 'polski',
	cs: 'čeština',
	sk: 'slovenčina',
	hu: 'magyar',
	ro: 'română',
	lt: 'lietuvių',
	hr: 'hrvatski',
}
