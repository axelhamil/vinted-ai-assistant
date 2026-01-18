import type { ConfidenceLevel } from '@vinted-ai/shared'
import { ScoreRing, Pill } from '../primitives'

interface HeroScoreProps {
	score: number
	confidence: ConfidenceLevel
	marginPercent: number
}

/**
 * Get confidence badge info
 */
function getConfidenceInfo(confidence: ConfidenceLevel): { label: string; variant: 'success' | 'warning' | 'negative' } {
	switch (confidence) {
		case 'high':
			return { label: 'Confiance Haute', variant: 'success' }
		case 'medium':
			return { label: 'Confiance Moyenne', variant: 'warning' }
		case 'low':
			return { label: 'Confiance Faible', variant: 'negative' }
	}
}

/**
 * Get score interpretation label
 */
function getScoreLabel(score: number): string {
	if (score <= 3) return 'A Eviter'
	if (score <= 5) return 'Prudence Recommandée'
	if (score <= 7) return 'Opportunité Correcte'
	if (score <= 9) return 'Excellente Opportunité'
	return 'Affaire Exceptionnelle'
}

/**
 * Hero score section with large animated ring - light theme
 */
export function HeroScore({ score, confidence, marginPercent }: HeroScoreProps) {
	const confidenceInfo = getConfidenceInfo(confidence)
	const scoreLabel = getScoreLabel(score)
	const isPositiveMargin = marginPercent > 0

	return (
		<section className="py-8 px-6 flex flex-col items-center gap-5 border-b border-border bg-white">
			{/* Score Ring */}
			<ScoreRing score={score} size="lg" animated showLabel={false} />

			{/* Score label */}
			<h2 className="text-4xl font-semibold text-content-primary text-center">
				{scoreLabel}
			</h2>

			{/* Badges row */}
			<div className="flex items-center gap-4">
				{/* Confidence badge */}
				<Pill
					variant={confidenceInfo.variant}
					icon={
						confidence === 'high' ? (
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
							</svg>
						) : undefined
					}
				>
					{confidenceInfo.label}
				</Pill>

				{/* Margin badge */}
				<Pill variant={isPositiveMargin ? 'success' : 'negative'}>
					{isPositiveMargin ? '+' : ''}{marginPercent.toFixed(0)}%
				</Pill>
			</div>
		</section>
	)
}
