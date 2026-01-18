import { ScoreRing, IconButton } from '../primitives'

interface CollapsedSidebarProps {
	score: number
	isOpen: boolean
	onExpand: () => void
}

/**
 * Get status color based on score
 */
function getStatusColor(score: number): string {
	if (score <= 3) return 'bg-danger'
	if (score <= 5) return 'bg-caution'
	if (score <= 7) return 'bg-info'
	if (score <= 9) return 'bg-profit'
	return 'bg-exceptional'
}

/**
 * Mini collapsed sidebar (60px width)
 * Shows score in compact form with expand button
 */
export function CollapsedSidebar({ score, isOpen, onExpand }: CollapsedSidebarProps) {
	if (!isOpen) {
		return null
	}

	const statusColor = getStatusColor(score)

	return (
		<aside
			className="fixed top-0 right-0 w-[60px] h-full bg-dark-base shadow-glass flex flex-col items-center py-4 z-[2147483647] animate-slide-in"
			style={{ zIndex: 2147483647 }}
			aria-label="Analyse (réduite)"
		>
			{/* Score compact */}
			<div className="mb-4">
				<ScoreRing score={score} size="sm" animated={false} showLabel={false} />
			</div>

			{/* Status indicator */}
			<div className={`w-2 h-2 rounded-full ${statusColor} mb-4`} />

			{/* Expand button */}
			<IconButton
				icon={
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
				}
				variant="glass"
				size="sm"
				onClick={onExpand}
				ariaLabel="Agrandir le panneau"
			/>

			{/* Logo at bottom */}
			<div className="mt-auto">
				<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-indigo to-brand-violet flex items-center justify-center">
					<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
			</div>
		</aside>
	)
}
