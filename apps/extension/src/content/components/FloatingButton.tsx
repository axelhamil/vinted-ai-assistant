import type { AnalysisResult } from '@vinted-ai/shared'
import { useState } from 'react'

interface FloatingButtonProps {
	analysis: AnalysisResult | null
	isOpen: boolean
	onToggle: () => void
	isLoading?: boolean
}

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
	if (score <= 3) return '#EF4444' // red
	if (score <= 5) return '#F59E0B' // amber
	if (score <= 7) return '#3B82F6' // blue
	if (score <= 9) return '#10B981' // green
	return '#F97316' // orange for 10
}

/**
 * Get score background gradient
 */
function getScoreGradient(score: number): string {
	if (score <= 3) return 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
	if (score <= 5) return 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
	if (score <= 7) return 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
	if (score <= 9) return 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
	return 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)'
}

/**
 * Format margin display
 */
function formatMargin(margin: number): string {
	if (margin > 0) return `+${margin.toFixed(0)}%`
	return `${margin.toFixed(0)}%`
}

/**
 * Floating action button for quick access to sidebar
 * Shows essential info in compact mode when sidebar is closed
 */
export function FloatingButton({ analysis, isOpen, onToggle, isLoading = false }: FloatingButtonProps) {
	const [isHovered, setIsHovered] = useState(false)
	const [isExpanded, setIsExpanded] = useState(true) // Start expanded

	// Don't show if sidebar is open
	if (isOpen) return null

	// Loading state
	if (isLoading || !analysis) {
		return (
			<button
				type="button"
				onClick={onToggle}
				className="fixed right-4 top-1/2 -translate-y-1/2 z-[2147483646] flex items-center gap-3 px-4 py-3 rounded-2xl bg-white shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300"
			>
				<div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
				<span className="text-base font-medium text-gray-600">Analyse...</span>
			</button>
		)
	}

	const { opportunity, marketPrice, price } = analysis
	const score = opportunity.score
	const marginPercent = opportunity.marginPercent
	const scoreColor = getScoreColor(score)
	const scoreGradient = getScoreGradient(score)

	// Compact mode - just the score circle
	if (!isExpanded) {
		return (
			<div className="fixed right-4 top-1/2 -translate-y-1/2 z-[2147483646] flex flex-col gap-2">
				{/* Main score button */}
				<button
					type="button"
					onClick={onToggle}
					onMouseEnter={() => setIsHovered(true)}
					onMouseLeave={() => setIsHovered(false)}
					className="relative w-14 h-14 rounded-full shadow-xl border-2 border-white transition-all duration-300 hover:scale-110"
					style={{
						background: scoreGradient,
						boxShadow: isHovered
							? `0 8px 30px ${scoreColor}66`
							: `0 4px 20px ${scoreColor}44`,
					}}
				>
					<span className="text-2xl font-bold text-white">{score}</span>
				</button>

				{/* Expand button */}
				<button
					type="button"
					onClick={() => setIsExpanded(true)}
					className="w-14 h-8 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
				>
					<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
					</svg>
				</button>
			</div>
		)
	}

	// Expanded mode - shows essential info
	return (
		<div
			className="fixed right-4 top-1/2 -translate-y-1/2 z-[2147483646] transition-all duration-300"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<div
				className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-300"
				style={{
					boxShadow: isHovered
						? '0 20px 50px rgba(0, 0, 0, 0.15)'
						: '0 10px 40px rgba(0, 0, 0, 0.1)',
				}}
			>
				{/* Header with score */}
				<button
					type="button"
					onClick={onToggle}
					className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
				>
					{/* Score circle */}
					<div
						className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
						style={{ background: scoreGradient }}
					>
						<span className="text-2xl font-bold text-white">{score}</span>
					</div>

					{/* Info */}
					<div className="text-left">
						<div className="text-sm text-gray-500 mb-0.5">Score Opportunité</div>
						<div className="text-xl font-bold text-gray-900">{score}/10</div>
					</div>

					{/* Arrow */}
					<svg className="w-5 h-5 text-gray-400 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
				</button>

				{/* Essential metrics */}
				<div className="px-4 pb-4 space-y-3">
					{/* Market Price */}
					<div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
						<span className="text-sm text-gray-600">Prix marché</span>
						<span className="text-lg font-bold text-gray-900">{marketPrice.average}€</span>
					</div>

					{/* Current Price */}
					<div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
						<span className="text-sm text-gray-600">Prix demandé</span>
						<span className="text-lg font-semibold text-gray-700">{price}€</span>
					</div>

					{/* Margin */}
					<div
						className="flex items-center justify-between p-3 rounded-xl"
						style={{
							backgroundColor: marginPercent > 0 ? '#ECFDF5' : '#FEF2F2',
						}}
					>
						<span className="text-sm" style={{ color: marginPercent > 0 ? '#059669' : '#DC2626' }}>
							Marge
						</span>
						<span
							className="text-lg font-bold"
							style={{ color: marginPercent > 0 ? '#059669' : '#DC2626' }}
						>
							{formatMargin(marginPercent)}
						</span>
					</div>

					{/* CTA Button */}
					<button
						type="button"
						onClick={onToggle}
						className="w-full py-3 px-4 rounded-xl bg-brand text-white font-semibold text-base hover:bg-brand-dark transition-colors flex items-center justify-center gap-2"
					>
						Voir l'analyse complète
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>

				{/* Collapse button */}
				<button
					type="button"
					onClick={() => setIsExpanded(false)}
					className="w-full py-2 border-t border-gray-100 text-sm text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
					Réduire
				</button>
			</div>
		</div>
	)
}
