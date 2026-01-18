import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface BadgeProps {
	score: number
	marginPercent: number
	onOpenSidebar: () => void
	isLoading?: boolean
}

/**
 * Gets the badge color based on the opportunity score
 * - Red (1-4): Poor opportunity
 * - Orange (5-6): Average opportunity
 * - Green (7-10): Good opportunity
 */
function getBadgeColor(score: number): { bg: string; text: string; border: string } {
	if (score >= 7) {
		return {
			bg: 'bg-green-500',
			text: 'text-white',
			border: 'border-green-600',
		}
	}
	if (score >= 5) {
		return {
			bg: 'bg-orange-500',
			text: 'text-white',
			border: 'border-orange-600',
		}
	}
	return {
		bg: 'bg-red-500',
		text: 'text-white',
		border: 'border-red-600',
	}
}

/**
 * Gets the opportunity level label based on score
 */
function getOpportunityLabel(score: number): string {
	if (score >= 8) return 'Excellente opportunité'
	if (score >= 7) return 'Bonne opportunité'
	if (score >= 5) return 'Opportunité moyenne'
	if (score >= 3) return 'Faible opportunité'
	return 'Mauvaise affaire'
}

/**
 * Badge component displaying the opportunity score on the main Vinted photo
 * Features:
 * - Color-coded score (1-10) with red/orange/green
 * - Tooltip on hover with summary
 * - Click opens the sidebar
 */
export function Badge({ score, marginPercent, onOpenSidebar, isLoading = false }: BadgeProps) {
	const [showTooltip, setShowTooltip] = useState(false)
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
	const tooltipRef = useRef<HTMLDivElement>(null)

	const colors = getBadgeColor(score)
	const opportunityLabel = getOpportunityLabel(score)

	// Find the main photo container on Vinted page and position the badge there
	useEffect(() => {
		function findPhotoContainer(): HTMLElement | null {
			// Try multiple selectors for the main photo container
			const selectors = [
				// Main image container (gallery)
				'[data-testid="item-photo-gallery"]',
				'[data-testid="item-photos"]',
				// Image carousel
				'.item-photos',
				'.item-photo',
				// Fallback to first large image wrapper
				'.web_ui__Image__image--cover',
				// Generic image container
				'[class*="ItemPhoto"]',
				'[class*="item-photo"]',
			]

			for (const selector of selectors) {
				const element = document.querySelector<HTMLElement>(selector)
				if (element) {
					return element
				}
			}

			// Last resort: find the first large image on the page
			const images = document.querySelectorAll<HTMLImageElement>('img')
			for (const img of images) {
				if (img.width > 300 && img.height > 300) {
					const parent = img.parentElement
					if (parent && parent.style.position !== 'absolute') {
						return parent
					}
				}
			}

			return null
		}

		function setupBadgePosition(): void {
			const container = findPhotoContainer()
			if (container) {
				// Ensure the container has position relative for absolute positioning
				const computedStyle = window.getComputedStyle(container)
				if (computedStyle.position === 'static') {
					container.style.position = 'relative'
				}
				setPortalContainer(container)
			}
		}

		// Initial setup
		setupBadgePosition()

		// Re-check if DOM changes (for SPA navigation)
		const observer = new MutationObserver(() => {
			if (!portalContainer || !document.body.contains(portalContainer)) {
				setupBadgePosition()
			}
		})

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		})

		return () => observer.disconnect()
	}, [portalContainer])

	// Handle click outside to close tooltip
	useEffect(() => {
		function handleClickOutside(event: MouseEvent): void {
			if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
				setShowTooltip(false)
			}
		}

		if (showTooltip) {
			document.addEventListener('mousedown', handleClickOutside)
			return () => document.removeEventListener('mousedown', handleClickOutside)
		}
		return undefined
	}, [showTooltip])

	// Loading state badge
	if (isLoading) {
		return portalContainer
			? createPortal(
					<div
						className="absolute top-3 left-3 z-[9999] flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 border-2 border-gray-300 shadow-lg cursor-pointer"
						style={{ zIndex: 9999 }}
					>
						<div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
					</div>,
					portalContainer
				)
			: null
	}

	const badgeContent = (
		<div
			className="absolute top-3 left-3 z-[9999]"
			style={{ zIndex: 9999 }}
			onMouseEnter={() => setShowTooltip(true)}
			onMouseLeave={() => setShowTooltip(false)}
		>
			{/* Main Badge */}
			<button
				type="button"
				onClick={onOpenSidebar}
				className={`
					flex items-center justify-center
					w-12 h-12 rounded-full
					${colors.bg} ${colors.text}
					border-2 ${colors.border}
					shadow-lg
					cursor-pointer
					transition-transform duration-200
					hover:scale-110
					focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
				`}
				aria-label={`Score d'opportunité: ${score}/10. ${opportunityLabel}. Cliquez pour ouvrir le détail.`}
			>
				<span className="text-lg font-bold">{score}</span>
			</button>

			{/* Tooltip */}
			{showTooltip && (
				<div
					ref={tooltipRef}
					className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-[10000]"
					style={{ zIndex: 10000 }}
				>
					{/* Score Header */}
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-semibold text-gray-800">{opportunityLabel}</span>
						<span
							className={`text-sm font-bold ${score >= 7 ? 'text-green-600' : score >= 5 ? 'text-orange-600' : 'text-red-600'}`}
						>
							{score}/10
						</span>
					</div>

					{/* Margin Info */}
					<div className="flex items-center justify-between text-sm text-gray-600 mb-2">
						<span>Marge potentielle:</span>
						<span
							className={`font-semibold ${marginPercent > 30 ? 'text-green-600' : marginPercent > 15 ? 'text-orange-600' : 'text-red-600'}`}
						>
							+{marginPercent.toFixed(0)}%
						</span>
					</div>

					{/* Call to action */}
					<div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
						Cliquez pour voir l'analyse complète
					</div>
				</div>
			)}
		</div>
	)

	// If we found a photo container, render inside it using a portal
	// Otherwise, render in the fixed position from the shadow DOM
	if (portalContainer) {
		return createPortal(badgeContent, portalContainer)
	}

	// Fallback: render in fixed position if no photo container found
	return (
		<div
			className="fixed top-20 left-4"
			style={{ zIndex: 2147483646 }}
			onMouseEnter={() => setShowTooltip(true)}
			onMouseLeave={() => setShowTooltip(false)}
		>
			<button
				type="button"
				onClick={onOpenSidebar}
				className={`
					flex items-center justify-center
					w-12 h-12 rounded-full
					${colors.bg} ${colors.text}
					border-2 ${colors.border}
					shadow-lg
					cursor-pointer
					transition-transform duration-200
					hover:scale-110
					focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
				`}
				aria-label={`Score d'opportunité: ${score}/10. ${opportunityLabel}. Cliquez pour ouvrir le détail.`}
			>
				<span className="text-lg font-bold">{score}</span>
			</button>

			{showTooltip && (
				<div
					ref={tooltipRef}
					className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-3"
					style={{ zIndex: 2147483647 }}
				>
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-semibold text-gray-800">{opportunityLabel}</span>
						<span
							className={`text-sm font-bold ${score >= 7 ? 'text-green-600' : score >= 5 ? 'text-orange-600' : 'text-red-600'}`}
						>
							{score}/10
						</span>
					</div>

					<div className="flex items-center justify-between text-sm text-gray-600 mb-2">
						<span>Marge potentielle:</span>
						<span
							className={`font-semibold ${marginPercent > 30 ? 'text-green-600' : marginPercent > 15 ? 'text-orange-600' : 'text-red-600'}`}
						>
							+{marginPercent.toFixed(0)}%
						</span>
					</div>

					<div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
						Cliquez pour voir l'analyse complète
					</div>
				</div>
			)}
		</div>
	)
}
