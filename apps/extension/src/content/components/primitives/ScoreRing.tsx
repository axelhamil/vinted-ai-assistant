import { useEffect, useState } from 'react'

interface ScoreRingProps {
	score: number
	size?: 'sm' | 'md' | 'lg'
	animated?: boolean
	showLabel?: boolean
}

/**
 * Get score color based on value (1-10 scale) - orange as base
 */
function getScoreColor(score: number): { color: string; glow: string; bg: string } {
	if (score <= 3) return { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.2)', bg: 'bg-danger/10' } // danger
	if (score <= 5) return { color: '#F59E0B', glow: 'rgba(245, 158, 11, 0.2)', bg: 'bg-caution/10' } // caution
	if (score <= 7) return { color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.2)', bg: 'bg-info/10' } // info
	if (score <= 9) return { color: '#10B981', glow: 'rgba(16, 185, 129, 0.2)', bg: 'bg-profit/10' } // profit
	return { color: '#8B5CF6', glow: 'rgba(139, 92, 246, 0.3)', bg: 'bg-exceptional/10' } // exceptional
}

/**
 * Get score label based on value
 */
function getScoreLabel(score: number): string {
	if (score <= 3) return 'A éviter'
	if (score <= 5) return 'Prudence'
	if (score <= 7) return 'Correct'
	if (score <= 9) return 'Bonne affaire'
	return 'Exceptionnel'
}

const sizeConfig = {
	sm: { width: 48, strokeWidth: 4, fontSize: 'text-xl', labelSize: 'text-base' },
	md: { width: 96, strokeWidth: 6, fontSize: 'text-5xl', labelSize: 'text-lg' },
	lg: { width: 160, strokeWidth: 8, fontSize: 'text-6xl', labelSize: 'text-xl' },
}

/**
 * Animated SVG score ring with orange gradient - light theme
 */
export function ScoreRing({
	score,
	size = 'md',
	animated = true,
	showLabel = true,
}: ScoreRingProps) {
	const [displayScore, setDisplayScore] = useState(animated ? 0 : score)
	const [offset, setOffset] = useState(animated ? 283 : 0)

	const config = sizeConfig[size]
	const { color } = getScoreColor(score)
	const label = getScoreLabel(score)
	const isExceptional = score === 10

	// Circle parameters
	const radius = (config.width - config.strokeWidth) / 2
	const circumference = 2 * Math.PI * radius
	const scoreOffset = circumference - (score / 10) * circumference

	useEffect(() => {
		if (!animated) {
			setDisplayScore(score)
			setOffset(scoreOffset)
			return
		}

		// Animate score count-up
		const duration = 800
		const steps = 20
		const stepDuration = duration / steps
		const scoreIncrement = score / steps
		let currentStep = 0

		const timer = setInterval(() => {
			currentStep++
			if (currentStep >= steps) {
				setDisplayScore(score)
				setOffset(scoreOffset)
				clearInterval(timer)
			} else {
				setDisplayScore(Math.round(scoreIncrement * currentStep * 10) / 10)
				const progress = currentStep / steps
				// Ease out cubic
				const eased = 1 - (1 - progress) ** 3
				setOffset(circumference - eased * (score / 10) * circumference)
			}
		}, stepDuration)

		return () => clearInterval(timer)
	}, [score, animated, circumference, scoreOffset])

	return (
		<div className="flex flex-col items-center gap-2">
			<div
				className={`relative ${isExceptional ? 'animate-pulse-glow' : ''}`}
				style={{
					width: config.width,
					height: config.width,
				}}
			>
				<svg
					aria-hidden="true"
					width={config.width}
					height={config.width}
					viewBox={`0 0 ${config.width} ${config.width}`}
					className="transform -rotate-90"
				>
					{/* Background circle - light gray */}
					<circle
						cx={config.width / 2}
						cy={config.width / 2}
						r={radius}
						fill="none"
						stroke="#E5E7EB"
						strokeWidth={config.strokeWidth}
					/>
					{/* Gradient definition - orange gradient */}
					<defs>
						<linearGradient id={`scoreGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stopColor="#F97316" />
							<stop offset="100%" stopColor={color} />
						</linearGradient>
					</defs>
					{/* Score arc */}
					<circle
						cx={config.width / 2}
						cy={config.width / 2}
						r={radius}
						fill="none"
						stroke={`url(#scoreGradient-${size})`}
						strokeWidth={config.strokeWidth}
						strokeLinecap="round"
						strokeDasharray={circumference}
						strokeDashoffset={offset}
						style={{
							transition: animated
								? 'stroke-dashoffset 800ms cubic-bezier(0.34, 1.56, 0.64, 1)'
								: 'none',
						}}
					/>
				</svg>

				{/* Score number */}
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className={`${config.fontSize} font-bold`} style={{ color }}>
						{displayScore.toFixed(1).replace('.0', '')}
					</span>
					{size !== 'sm' && <span className="text-lg text-content-muted">/10</span>}
				</div>
			</div>

			{showLabel && size !== 'sm' && (
				<span className={`${config.labelSize} font-medium`} style={{ color }}>
					{label}
				</span>
			)}
		</div>
	)
}
