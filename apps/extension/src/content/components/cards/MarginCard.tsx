import { Card } from '../primitives/Card'
import { ProgressBar } from '../primitives/ProgressBar'

interface MarginCardProps {
	margin: number
	marginPercent: number
	buyPrice: number
	/** Total price including buyer protection (null if not available) */
	totalPrice: number | null
	/** Shipping cost in euros (null = free shipping or not available) */
	shippingCost: number | null
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
export function MarginCard({
	margin,
	marginPercent,
	buyPrice,
	totalPrice,
	shippingCost,
	sellPrice,
}: MarginCardProps) {
	const marginColor = getMarginColor(marginPercent)
	const progressVariant = getProgressVariant(marginPercent)
	const isPositive = margin > 0
	// Use totalPrice (includes buyer protection) if available, otherwise fallback to buyPrice
	const priceWithProtection = totalPrice ?? buyPrice
	const buyerProtection = totalPrice !== null ? totalPrice - buyPrice : null
	const totalCost = priceWithProtection + (shippingCost ?? 0)

	return (
		<Card
			title="Marge Potentielle"
			iconColor="green"
			icon={
				<svg
					aria-hidden="true"
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
					/>
				</svg>
			}
		>
			<div className="space-y-4">
				{/* Main margin display */}
				<div className="flex items-end justify-between">
					<div>
						<span className={`text-5xl font-bold ${marginColor}`}>
							{isPositive ? '+' : ''}
							{margin.toFixed(0)}€
						</span>
					</div>
					<span className={`text-3xl font-semibold ${marginColor}`}>
						{isPositive ? '+' : ''}
						{marginPercent.toFixed(0)}%
					</span>
				</div>

				{/* Progress bar */}
				<ProgressBar
					value={Math.min(100, Math.max(0, marginPercent))}
					variant={progressVariant}
					size="md"
				/>

				{/* Cost breakdown */}
				<div className="pt-2 border-t border-border space-y-2">
					<div className="space-y-1 text-lg">
						<div className="flex justify-between">
							<span className="text-content-secondary">Prix article</span>
							<span className="text-content-primary">{buyPrice}€</span>
						</div>
						{buyerProtection !== null && buyerProtection > 0 && (
							<div className="flex justify-between">
								<span className="text-content-secondary">Protection acheteur</span>
								<span className="text-content-primary">{buyerProtection.toFixed(2)}€</span>
							</div>
						)}
						<div className="flex justify-between">
							<span className="text-content-secondary">Frais de port</span>
							<span className="text-content-primary">
								{shippingCost !== null ? `${shippingCost}€` : 'Gratuit'}
							</span>
						</div>
						<div className="flex justify-between font-medium border-t border-border pt-1">
							<span className="text-content-primary">Coût total</span>
							<span className="text-content-primary">{totalCost.toFixed(2)}€</span>
						</div>
					</div>

					{/* Sell price */}
					<div className="flex items-center justify-between text-xl pt-2">
						<span className="text-content-secondary">
							Acheter{' '}
							<span className="text-content-primary font-medium">{totalCost.toFixed(2)}€</span>
						</span>
						<svg
							aria-hidden="true"
							className="w-6 h-6 text-content-muted"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M17 8l4 4m0 0l-4 4m4-4H3"
							/>
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
