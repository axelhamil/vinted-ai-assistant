import type { AnalysisResult } from '@vinted-ai/shared'
import { PlatformsCard } from '../cards'
import { Card, CardRow, ProgressBar } from '../primitives'

interface ResellTabProps {
	analysis: AnalysisResult
}

/**
 * Resell tab displaying resale recommendations and platforms
 */
export function ResellTab({ analysis }: ResellTabProps) {
	const { resale, price, marketPrice, opportunity } = analysis

	// Calculate profit after hypothetical purchase
	const potentialProfit = resale.recommendedPrice - price
	const profitPercent = (potentialProfit / price) * 100
	const roi = (potentialProfit / price) * 100

	return (
		<div className="space-y-4 animate-fade-in">
			{/* Platforms Card */}
			<PlatformsCard
				recommendedPrice={resale.recommendedPrice}
				estimatedDays={resale.estimatedDays}
				platforms={resale.platforms}
				tips={resale.tips}
			/>

			{/* Profit Projection */}
			<Card
				title="Projection de profit"
				icon={
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
				}
			>
				<div className="space-y-4">
					{/* Visual profit breakdown */}
					<div className="grid grid-cols-3 gap-3">
						<div className="text-center p-3 rounded-lg bg-surface-tertiary">
							<div className="text-base text-content-muted mb-1">Achat</div>
							<div className="text-2xl font-semibold text-content-primary">{price}€</div>
						</div>
						<div className="flex items-center justify-center">
							<svg className="w-6 h-6 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
							</svg>
						</div>
						<div className="text-center p-3 rounded-lg bg-profit/10 border border-profit/20">
							<div className="text-base text-profit/70 mb-1">Revente</div>
							<div className="text-2xl font-semibold text-profit">{resale.recommendedPrice}€</div>
						</div>
					</div>

					{/* Profit metrics */}
					<div className="space-y-2 pt-3 border-t border-border">
						<CardRow
							label="Profit brut"
							value={`+${potentialProfit.toFixed(0)}€`}
							valueClassName="text-profit"
						/>
						<CardRow
							label="Marge"
							value={`+${profitPercent.toFixed(0)}%`}
							valueClassName="text-profit"
						/>
						<CardRow
							label="ROI"
							value={`${roi.toFixed(0)}%`}
							valueClassName="text-exceptional"
						/>
					</div>

					{/* Confidence bar */}
					<div className="pt-3 border-t border-border">
						<ProgressBar
							value={Math.min(100, Math.max(0, opportunity.score * 10))}
							variant="brand"
							size="md"
							label="Confiance estimation"
							showLabel
						/>
					</div>
				</div>
			</Card>

			{/* Market Context */}
			<Card
				title="Contexte marché"
				icon={
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
					</svg>
				}
			>
				<div className="space-y-3">
					<CardRow
						label="Prix plancher marché"
						value={`${marketPrice.low}€`}
					/>
					<CardRow
						label="Prix moyen marché"
						value={`${marketPrice.average}€`}
						valueClassName="text-info"
					/>
					<CardRow
						label="Prix plafond marché"
						value={`${marketPrice.high}€`}
					/>

					<div className="pt-3 border-t border-border">
						<div className="flex items-center gap-2 text-base">
							<svg className="w-5 h-5 text-info" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
							</svg>
							<span className="text-content-secondary">
								Le prix recommandé est positionné au{' '}
								<span className="text-content-primary font-medium">
									{Math.round(((resale.recommendedPrice - marketPrice.low) / (marketPrice.high - marketPrice.low)) * 100)}%
								</span>
								{' '}du range marché
							</span>
						</div>
					</div>
				</div>
			</Card>
		</div>
	)
}
