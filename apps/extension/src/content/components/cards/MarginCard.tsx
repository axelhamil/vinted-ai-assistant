import { Card, ProgressBar } from '../primitives'

interface MarginCardProps {
	margin: number
	marginPercent: number
	buyPrice: number
	sellPrice: number
}

/**
 * Get margin color based on percentage
 */
function getMarginColor(marginPercent: number): string {
	if (marginPercent >= 50) return 'text-exceptional'
	if (marginPercent >= 30) return 'text-profit'
	if (marginPercent >= 15) return 'text-caution'
	return 'text-danger'
}

/**
 * Get progress bar variant
 */
function getProgressVariant(marginPercent: number): 'profit' | 'caution' | 'danger' | 'brand' {
	if (marginPercent >= 30) return 'profit'
	if (marginPercent >= 15) return 'caution'
	if (marginPercent > 0) return 'danger'
	return 'danger'
}

/**
 * Card displaying potential margin with visual progress - light theme
 */
export function MarginCard({ margin, marginPercent, buyPrice, sellPrice }: MarginCardProps) {
	const marginColor = getMarginColor(marginPercent)
	const progressVariant = getProgressVariant(marginPercent)
	const isPositive = margin > 0

	return (
		<Card
			title="Marge Potentielle"
			iconColor="green"
			icon={
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
				</svg>
			}
		>
			<div className="space-y-4">
				{/* Main margin display */}
				<div className="flex items-end justify-between">
					<div>
						<span className={`text-5xl font-bold ${marginColor}`}>
							{isPositive ? '+' : ''}{margin.toFixed(0)}€
						</span>
					</div>
					<span className={`text-3xl font-semibold ${marginColor}`}>
						{isPositive ? '+' : ''}{marginPercent.toFixed(0)}%
					</span>
				</div>

				{/* Progress bar */}
				<ProgressBar
					value={Math.min(100, Math.max(0, marginPercent))}
					variant={progressVariant}
					size="md"
				/>

				{/* Buy/Sell breakdown */}
				<div className="pt-2 border-t border-border">
					<div className="flex items-center justify-between text-xl">
						<span className="text-content-secondary">
							Acheter <span className="text-content-primary font-medium">{buyPrice}€</span>
						</span>
						<svg className="w-6 h-6 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
						</svg>
						<span className="text-content-secondary">
							Vendre <span className="text-profit font-medium">{sellPrice}€</span>
						</span>
					</div>
				</div>
			</div>
		</Card>
	)
}
