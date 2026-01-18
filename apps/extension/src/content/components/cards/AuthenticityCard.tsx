import type { ConfidenceLevel } from '@vinted-ai/shared'
import { Card, ScoreRing, Pill } from '../primitives'

interface AuthenticityCardProps {
	score: number
	flags: string[]
	confidence: ConfidenceLevel
}

/**
 * Card displaying authenticity score and flags - light theme
 */
export function AuthenticityCard({ score, flags, confidence }: AuthenticityCardProps) {
	const hasIssues = flags.length > 0
	const isHighConfidence = confidence === 'high'

	return (
		<Card
			title="Authenticité"
			iconColor="violet"
			icon={
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
				</svg>
			}
		>
			<div className="flex items-center gap-4">
				{/* Score ring */}
				<ScoreRing score={score} size="sm" animated={false} showLabel={false} />

				{/* Content */}
				<div className="flex-1 min-w-0">
					{hasIssues ? (
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<svg className="w-5 h-5 text-caution flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
								</svg>
								<span className="text-xl text-caution font-medium">Points d'attention</span>
							</div>
							<ul className="space-y-1">
								{flags.slice(0, 3).map((flag) => (
									<li key={flag} className="text-lg text-content-secondary flex items-start gap-1.5">
										<span className="text-caution mt-0.5">•</span>
										{flag}
									</li>
								))}
								{flags.length > 3 && (
									<li className="text-base text-content-muted">
										+{flags.length - 3} autres...
									</li>
								)}
							</ul>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<svg className="w-5 h-5 text-profit" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="text-xl text-profit">
								Aucun problème détecté
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Confidence indicator */}
			<div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
				<span className="text-xl text-content-muted">Confiance analyse</span>
				<Pill
					variant={isHighConfidence ? 'success' : confidence === 'medium' ? 'warning' : 'negative'}
				>
					{confidence === 'high' ? 'Haute' : confidence === 'medium' ? 'Moyenne' : 'Faible'}
				</Pill>
			</div>
		</Card>
	)
}
