import type { RetailPrice } from '@vinted-ai/shared/analysis'
import { Card } from '../primitives/Card'
import { RangeBar } from '../primitives/ProgressBar'

interface MarketPriceCardProps {
	low: number
	high: number
	average: number
	currentPrice: number
	confidence: 'low' | 'medium' | 'high'
	retailPrice?: RetailPrice
	reasoning?: string
}

/**
 * Get confidence color and label
 */
function getConfidenceInfo(confidence: 'low' | 'medium' | 'high'): {
	color: string
	label: string
	icon: string
} {
	switch (confidence) {
		case 'high':
			return { color: 'text-profit', label: 'Elevée', icon: '⚡' }
		case 'medium':
			return { color: 'text-caution', label: 'Moyenne', icon: '📊' }
		default:
			return { color: 'text-content-secondary', label: 'Faible', icon: '📉' }
	}
}

/**
 * Card displaying AI-based market price estimation - light theme
 * Redesigned for more visual impact
 */
export function MarketPriceCard({
	low,
	high,
	average,
	currentPrice,
	confidence,
	retailPrice,
	reasoning,
}: MarketPriceCardProps) {
	const isPriceGood = currentPrice < average
	const priceDiff = average - currentPrice
	const priceDiffPercent = (priceDiff / average) * 100
	const confidenceInfo = getConfidenceInfo(confidence)

	return (
		<Card
			title="Estimation de Marché"
			iconColor="orange"
			icon={
				<svg
					aria-hidden="true"
					className="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
					/>
				</svg>
			}
		>
			<div className="space-y-5">
				{/* Hero Price Section */}
				<div className="text-center py-4 bg-gradient-to-b from-brand/5 to-transparent rounded-xl">
					<div className="text-xl text-content-muted mb-1">Prix Marché Estimé</div>
					<div className="text-5xl font-bold text-content-primary">{average}€</div>
					<div className="text-lg text-content-secondary mt-1">
						{low}€ — {high}€
					</div>
				</div>

				{/* Visual Range Bar - with more space */}
				<div className="pt-4">
					<RangeBar min={low} max={high} current={currentPrice} average={average} />
				</div>

				{/* Price Advantage - Highlighted section */}
				{isPriceGood && (
					<div className="bg-profit/10 border border-profit/30 rounded-xl p-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-3xl font-bold text-profit">-{priceDiff.toFixed(0)}€</div>
								<div className="text-lg text-profit/80">
									{priceDiffPercent.toFixed(0)}% sous le marché
								</div>
							</div>
							<div className="w-12 h-12 rounded-full bg-profit/20 flex items-center justify-center">
								<svg
									aria-hidden="true"
									className="w-7 h-7 text-profit"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
						</div>
					</div>
				)}

				{/* Retail price section */}
				{retailPrice && (
					<div className="rounded-xl bg-brand/5 border border-brand/20 p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<span className="text-2xl">💰</span>
								<div>
									<span className="text-xl font-medium text-brand">Prix Neuf Estimé</span>
									<span className="text-lg text-content-muted ml-2">{retailPrice.brand}</span>
								</div>
							</div>
							<span className="text-2xl font-bold text-content-primary">{retailPrice.price}€</span>
						</div>
					</div>
				)}

				{/* AI Reasoning section */}
				{reasoning && (
					<div className="rounded-xl bg-surface-secondary border border-border p-4">
						<div className="flex items-start gap-3">
							<span className="text-2xl">🤖</span>
							<div className="flex-1">
								<span className="text-xl font-medium text-brand block mb-2">Raisonnement IA</span>
								<p className="text-lg text-content-secondary leading-relaxed">{reasoning}</p>
							</div>
						</div>
					</div>
				)}

				{/* Confidence indicator */}
				<div className="flex items-center justify-between pt-4 border-t border-border">
					<span className="text-xl text-content-muted">Confiance estimation</span>
					<div className={`flex items-center gap-2 text-xl ${confidenceInfo.color}`}>
						<span className="text-2xl">{confidenceInfo.icon}</span>
						<span className="font-medium">{confidenceInfo.label}</span>
					</div>
				</div>
			</div>
		</Card>
	)
}
