/**
 * Price suggestion field with range and confidence indicator
 */

/**
 * Confidence labels and colors
 */
const confidenceConfig: Record<
	'low' | 'medium' | 'high',
	{ label: string; color: string; bgColor: string }
> = {
	low: { label: 'Faible', color: 'text-orange-600', bgColor: 'bg-orange-100' },
	medium: { label: 'Moyenne', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
	high: { label: 'Élevée', color: 'text-green-600', bgColor: 'bg-green-100' },
}

interface PriceSuggestionFieldProps {
	suggestedPrice: number
	priceRange: { low: number; high: number }
	priceConfidence: 'low' | 'medium' | 'high'
	priceReasoning: string
	onApply: () => void
}

export function PriceSuggestionField({
	suggestedPrice,
	priceRange,
	priceConfidence,
	priceReasoning,
	onApply,
}: PriceSuggestionFieldProps) {
	const confidence = confidenceConfig[priceConfidence]

	return (
		<div className="p-4 bg-gradient-to-r from-brand/5 to-brand-dark/5 rounded-xl border border-brand/20 mt-4">
			<div className="flex items-center justify-between mb-3">
				<span className="text-base font-medium text-content-secondary flex items-center gap-2">
					<svg
						aria-hidden="true"
						className="w-5 h-5 text-brand"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					Prix suggéré
				</span>
				<button
					type="button"
					onClick={onApply}
					className="text-base text-brand hover:text-brand-dark font-medium transition-colors"
				>
					Appliquer
				</button>
			</div>

			{/* Main price */}
			<div className="text-3xl font-bold text-content-primary mb-2">{suggestedPrice} €</div>

			{/* Price range */}
			<div className="flex items-center gap-2 mb-3">
				<span className="text-base text-content-secondary">
					Fourchette : {priceRange.low} € - {priceRange.high} €
				</span>
			</div>

			{/* Confidence badge */}
			<div className="flex items-center gap-2 mb-3">
				<span className="text-sm text-content-secondary">Confiance :</span>
				<span
					className={`text-sm font-medium px-2 py-0.5 rounded-full ${confidence.bgColor} ${confidence.color}`}
				>
					{confidence.label}
				</span>
			</div>

			{/* Reasoning */}
			<p className="text-sm text-content-secondary italic border-t border-border/50 pt-3 mt-2">
				{priceReasoning}
			</p>
		</div>
	)
}
