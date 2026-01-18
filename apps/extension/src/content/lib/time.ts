/**
 * Formats a date into a relative time string (e.g., "il y a 5 min")
 * @param date The date to format
 * @returns A human-readable relative time string in French
 */
export function formatRelativeTime(date: Date | string | number): string {
	const now = Date.now()
	const timestamp = typeof date === 'number' ? date : new Date(date).getTime()
	const diffMs = now - timestamp

	// Less than a minute
	if (diffMs < 60000) {
		return "à l'instant"
	}

	// Less than an hour
	const diffMinutes = Math.floor(diffMs / 60000)
	if (diffMinutes < 60) {
		return `il y a ${diffMinutes} min`
	}

	// Less than a day
	const diffHours = Math.floor(diffMinutes / 60)
	if (diffHours < 24) {
		return diffHours === 1 ? 'il y a 1 heure' : `il y a ${diffHours} heures`
	}

	// Less than a week
	const diffDays = Math.floor(diffHours / 24)
	if (diffDays < 7) {
		return diffDays === 1 ? 'il y a 1 jour' : `il y a ${diffDays} jours`
	}

	// More than a week - show date
	const dateObj = new Date(timestamp)
	return `le ${dateObj.toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'short',
	})}`
}

/**
 * Formats remaining cache time into a human-readable string
 * @param ms Milliseconds remaining
 * @returns A human-readable string in French
 */
export function formatCacheTimeRemaining(ms: number): string {
	if (ms <= 0) return 'expiré'

	const minutes = Math.floor(ms / 60000)
	if (minutes < 1) return "moins d'1 min"
	if (minutes === 1) return '1 min'
	if (minutes < 60) return `${minutes} min`

	const hours = Math.floor(minutes / 60)
	if (hours === 1) return '1 heure'
	return `${hours} heures`
}
