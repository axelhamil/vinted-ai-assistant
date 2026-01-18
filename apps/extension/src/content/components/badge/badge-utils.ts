/**
 * Badge utility functions for score calculations and styling
 */

export interface ScoreStyle {
	gradient: string
	glow: string
	labelColor: string
}

/**
 * Get style configuration based on score (1-10 scale)
 */
export function getScoreStyle(score: number): ScoreStyle {
	if (score <= 3) {
		return {
			gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
			glow: '0 4px 20px rgba(239, 68, 68, 0.4)',
			labelColor: '#FEE2E2',
		}
	}
	if (score <= 5) {
		return {
			gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
			glow: '0 4px 20px rgba(245, 158, 11, 0.4)',
			labelColor: '#FEF3C7',
		}
	}
	if (score <= 7) {
		return {
			gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
			glow: '0 4px 20px rgba(59, 130, 246, 0.4)',
			labelColor: '#DBEAFE',
		}
	}
	if (score <= 9) {
		return {
			gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
			glow: '0 4px 20px rgba(16, 185, 129, 0.4)',
			labelColor: '#D1FAE5',
		}
	}
	// Exceptional (10) - orange/brand color
	return {
		gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
		glow: '0 4px 24px rgba(249, 115, 22, 0.5)',
		labelColor: '#FED7AA',
	}
}

/**
 * Get opportunity label based on score
 */
export function getOpportunityLabel(score: number): string {
	if (score <= 3) return 'A éviter'
	if (score <= 5) return 'Prudence'
	if (score <= 7) return 'Correct'
	if (score <= 9) return 'Bonne affaire'
	return 'Exceptionnel'
}

/**
 * Get score label color based on score
 */
export function getScoreLabelColor(score: number): string {
	if (score <= 3) return '#EF4444'
	if (score <= 5) return '#F59E0B'
	if (score <= 7) return '#3B82F6'
	if (score <= 9) return '#10B981'
	return '#F97316'
}

/**
 * Get margin color based on percentage
 */
export function getMarginColor(marginPercent: number): string {
	if (marginPercent > 30) return '#10B981' // profit
	if (marginPercent > 15) return '#F59E0B' // caution
	return '#EF4444' // danger
}
