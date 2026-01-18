type ProgressVariant = 'default' | 'profit' | 'caution' | 'danger' | 'brand'

interface ProgressBarProps {
	value: number // 0-100
	variant?: ProgressVariant
	size?: 'sm' | 'md' | 'lg'
	showLabel?: boolean
	label?: string
	animated?: boolean
	className?: string
}

const variantColors: Record<ProgressVariant, string> = {
	default: 'bg-content-muted',
	profit: 'bg-profit',
	caution: 'bg-caution',
	danger: 'bg-danger',
	brand: 'bg-gradient-to-r from-brand to-brand-dark',
}

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
	sm: 'h-1',
	md: 'h-2',
	lg: 'h-3',
}

/**
 * Progress bar with animated fill - light theme
 */
export function ProgressBar({
	value,
	variant = 'brand',
	size = 'md',
	showLabel = false,
	label,
	animated = true,
	className = '',
}: ProgressBarProps) {
	const clampedValue = Math.min(100, Math.max(0, value))

	return (
		<div className={`w-full ${className}`}>
			{(showLabel || label) && (
				<div className="flex items-center justify-between mb-1.5">
					{label && <span className="text-lg text-content-secondary">{label}</span>}
					{showLabel && <span className="text-lg font-medium text-content-primary">{clampedValue.toFixed(0)}%</span>}
				</div>
			)}
			<div className={`w-full rounded-full bg-surface-tertiary overflow-hidden ${sizeStyles[size]}`}>
				<div
					className={`h-full rounded-full ${variantColors[variant]} ${animated ? 'transition-all duration-500 ease-out' : ''}`}
					style={{ width: `${clampedValue}%` }}
				/>
			</div>
		</div>
	)
}

/**
 * Range bar showing a value within a min-max range - light theme
 */
export function RangeBar({
	min,
	max,
	current,
	average,
	className = '',
}: {
	min: number
	max: number
	current: number
	average?: number
	className?: string
}) {
	const range = max - min
	const currentPosition = range > 0 ? ((current - min) / range) * 100 : 50
	const averagePosition = average !== undefined && range > 0 ? ((average - min) / range) * 100 : undefined

	// Determine if current price is good (below average)
	const isGoodPrice = average !== undefined && current < average

	return (
		<div className={`w-full ${className}`}>
			{/* Labels */}
			<div className="flex items-center justify-between mb-1.5 text-lg text-content-secondary">
				<span>{min}€</span>
				<span>{max}€</span>
			</div>

			{/* Bar */}
			<div className="relative w-full h-2 rounded-full bg-surface-tertiary">
				{/* Average marker */}
				{averagePosition !== undefined && (
					<div
						className="absolute top-0 w-0.5 h-full bg-content-muted"
						style={{ left: `${averagePosition}%` }}
					>
						<div className="absolute -top-6 left-1/2 -translate-x-1/2 text-base text-content-secondary whitespace-nowrap">
							Moy: {average}€
						</div>
					</div>
				)}

				{/* Current price marker */}
				<div
					className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-soft ${isGoodPrice ? 'bg-profit' : 'bg-caution'}`}
					style={{ left: `calc(${currentPosition}% - 6px)` }}
				/>
			</div>
		</div>
	)
}
