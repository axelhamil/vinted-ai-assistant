import { type ReactNode, useRef, useState } from 'react'

interface TooltipProps {
	content: ReactNode
	children: ReactNode
	position?: 'top' | 'bottom' | 'left' | 'right'
	delay?: number
	className?: string
}

const positionStyles: Record<'top' | 'bottom' | 'left' | 'right', string> = {
	top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
	bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
	left: 'right-full top-1/2 -translate-y-1/2 mr-2',
	right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

const arrowStyles: Record<'top' | 'bottom' | 'left' | 'right', string> = {
	top: 'top-full left-1/2 -translate-x-1/2 border-t-white/10 border-l-transparent border-r-transparent border-b-transparent',
	bottom:
		'bottom-full left-1/2 -translate-x-1/2 border-b-white/10 border-l-transparent border-r-transparent border-t-transparent',
	left: 'left-full top-1/2 -translate-y-1/2 border-l-white/10 border-t-transparent border-b-transparent border-r-transparent',
	right:
		'right-full top-1/2 -translate-y-1/2 border-r-white/10 border-t-transparent border-b-transparent border-l-transparent',
}

/**
 * Tooltip component with dark glass style
 */
export function Tooltip({
	content,
	children,
	position = 'top',
	delay = 200,
	className = '',
}: TooltipProps) {
	const [isVisible, setIsVisible] = useState(false)
	const timeoutRef = useRef<number | null>(null)

	const handleMouseEnter = () => {
		timeoutRef.current = window.setTimeout(() => setIsVisible(true), delay)
	}

	const handleMouseLeave = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}
		setIsVisible(false)
	}

	return (
		<div
			className={`relative inline-flex ${className}`}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{children}

			{isVisible && (
				<div
					className={`
						absolute z-50 px-3 py-2
						text-sm text-white/90
						bg-dark-elevated/95 backdrop-blur-sm
						border border-white/10 rounded-lg
						shadow-lg shadow-black/20
						whitespace-nowrap
						animate-fade-in
						${positionStyles[position]}
					`}
					role="tooltip"
				>
					{content}
					{/* Arrow */}
					<div
						className={`
							absolute w-0 h-0 border-4
							${arrowStyles[position]}
						`}
					/>
				</div>
			)}
		</div>
	)
}

/**
 * Info icon with tooltip
 */
export function InfoTooltip({ content }: { content: ReactNode }) {
	return (
		<Tooltip content={content}>
			<button
				type="button"
				className="inline-flex items-center justify-center w-4 h-4 text-white/40 hover:text-white/60 transition-colors"
				aria-label="Plus d'informations"
			>
				<svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fillRule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clipRule="evenodd"
					/>
				</svg>
			</button>
		</Tooltip>
	)
}
