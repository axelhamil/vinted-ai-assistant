import type { ResalePlatform, PlatformRelevance } from '@vinted-ai/shared/analysis'
import { Card } from '../primitives/Card'
import { Pill } from '../primitives/Pill'

interface PlatformsCardProps {
	recommendedPrice: number
	estimatedDays: number
	platforms: ResalePlatform[]
	tips: string[]
}

/**
 * Get relevance badge variant
 */
function getRelevanceVariant(relevance: PlatformRelevance): 'success' | 'warning' | 'default' {
	switch (relevance) {
		case 'high':
			return 'success'
		case 'medium':
			return 'warning'
		case 'low':
			return 'default'
	}
}

/**
 * Get relevance label
 */
function getRelevanceLabel(relevance: PlatformRelevance): string {
	switch (relevance) {
		case 'high':
			return 'Recommandé'
		case 'medium':
			return 'Possible'
		case 'low':
			return 'Alternatif'
	}
}

/**
 * Format estimated days
 */
function formatEstimatedDays(days: number): string {
	if (days === 1) return '1 jour'
	if (days < 7) return `${days} jours`
	if (days < 14) return '1 semaine'
	if (days < 30) return `${Math.round(days / 7)} semaines`
	if (days < 60) return '1 mois'
	return `${Math.round(days / 30)} mois`
}

/**
 * Card displaying resale platforms and recommendations
 */
export function PlatformsCard({ recommendedPrice, estimatedDays, platforms, tips }: PlatformsCardProps) {
	return (
		<Card
			title="Revente"
			iconColor="green"
			icon={
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			}
		>
			<div className="space-y-4">
				{/* Recommended price and time */}
				<div className="flex items-center justify-between">
					<div>
						<div className="text-xl text-content-muted mb-1">Prix recommandé</div>
						<div className="text-4xl font-bold text-profit">{recommendedPrice}€</div>
					</div>
					<div className="text-right">
						<div className="text-xl text-content-muted mb-1">Délai estimé</div>
						<div className="text-2xl font-semibold text-content-primary">{formatEstimatedDays(estimatedDays)}</div>
					</div>
				</div>

				{/* Platforms */}
				{platforms.length > 0 && (
					<div className="pt-3 border-t border-border">
						<h5 className="text-xl text-content-muted mb-2">Plateformes:</h5>
						<div className="space-y-2">
							{platforms.map((platform) => (
								<div
									key={platform.name}
									className="flex items-center justify-between p-2 rounded-lg bg-surface-secondary"
								>
									<span className="text-xl text-content-primary">{platform.name}</span>
									<Pill variant={getRelevanceVariant(platform.relevance)}>
										{getRelevanceLabel(platform.relevance)}
									</Pill>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Tips */}
				{tips.length > 0 && (
					<div className="pt-3 border-t border-border">
						<h5 className="text-xl text-content-muted mb-2 flex items-center gap-1">
							<svg className="w-5 h-5 text-caution" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
							</svg>
							Conseils
						</h5>
						<ul className="space-y-1.5">
							{tips.map((tip) => (
								<li key={tip} className="flex items-start gap-2 text-lg text-content-secondary">
									<span className="text-profit mt-0.5">•</span>
									{tip}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</Card>
	)
}
