import type { PhotoQuality } from '@vinted-ai/shared/analysis'
import { Card } from '../primitives/Card'
import { ScoreRing } from '../primitives/ScoreRing'
import { Pill } from '../primitives/Pill'

interface PhotoQualityCardProps {
	photoQuality: PhotoQuality
}

/**
 * Get lighting label in French
 */
function getLightingLabel(lighting: PhotoQuality['lighting']): { label: string; variant: 'success' | 'warning' | 'negative' } {
	switch (lighting) {
		case 'good':
			return { label: 'Bon éclairage', variant: 'success' }
		case 'average':
			return { label: 'Éclairage moyen', variant: 'warning' }
		case 'poor':
			return { label: 'Mauvais éclairage', variant: 'negative' }
	}
}

/**
 * Get background label in French
 */
function getBackgroundLabel(background: PhotoQuality['background']): { label: string; variant: 'success' | 'warning' | 'negative' } {
	switch (background) {
		case 'professional':
			return { label: 'Fond pro', variant: 'success' }
		case 'neutral':
			return { label: 'Fond neutre', variant: 'warning' }
		case 'messy':
			return { label: 'Fond chargé', variant: 'negative' }
	}
}

/**
 * Card displaying photo quality analysis
 */
export function PhotoQualityCard({ photoQuality }: PhotoQualityCardProps) {
	const { score, hasModel, lighting, background, issues } = photoQuality
	const lightingInfo = getLightingLabel(lighting)
	const backgroundInfo = getBackgroundLabel(background)

	return (
		<Card
			title="Qualité Photos"
			iconColor="amber"
			icon={
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			}
		>
			<div className="flex items-start gap-4">
				{/* Score ring */}
				<ScoreRing score={score} size="sm" animated={false} showLabel={false} />

				{/* Quality indicators */}
				<div className="flex-1 space-y-3">
					{/* Pills row */}
					<div className="flex flex-wrap gap-2">
						<Pill variant={lightingInfo.variant}>
							{lightingInfo.label}
						</Pill>
						<Pill variant={backgroundInfo.variant}>
							{backgroundInfo.label}
						</Pill>
						{hasModel && (
							<Pill variant="success">
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
								</svg>
								Porté
							</Pill>
						)}
					</div>

					{/* Issues */}
					{issues.length > 0 && (
						<div className="space-y-1">
							{issues.slice(0, 2).map((issue) => (
								<div key={issue} className="flex items-start gap-1.5 text-lg text-content-secondary">
									<span className="text-caution mt-0.5">•</span>
									{issue}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</Card>
	)
}
