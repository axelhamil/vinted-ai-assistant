/**
 * Date parsing utilities for Vinted pages
 */

/**
 * Parses relative date strings like "il y a 2 jours"
 */
export function parseRelativeDate(text: string): Date | null {
	const now = new Date()

	const patterns: Array<{
		pattern: RegExp
		unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'
	}> = [
		{ pattern: /il y a (\d+)\s*minute/i, unit: 'minutes' },
		{ pattern: /il y a (\d+)\s*heure/i, unit: 'hours' },
		{ pattern: /il y a (\d+)\s*jour/i, unit: 'days' },
		{ pattern: /il y a (\d+)\s*semaine/i, unit: 'weeks' },
		{ pattern: /il y a (\d+)\s*mois/i, unit: 'months' },
	]

	for (const { pattern, unit } of patterns) {
		const match = text.match(pattern)
		if (match?.[1]) {
			const value = Number.parseInt(match[1], 10)
			const date = new Date(now)

			switch (unit) {
				case 'minutes':
					date.setMinutes(date.getMinutes() - value)
					break
				case 'hours':
					date.setHours(date.getHours() - value)
					break
				case 'days':
					date.setDate(date.getDate() - value)
					break
				case 'weeks':
					date.setDate(date.getDate() - value * 7)
					break
				case 'months':
					date.setMonth(date.getMonth() - value)
					break
			}

			return date
		}
	}

	return null
}
