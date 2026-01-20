import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface BadgeProps {
	score: number
	marginPercent: number
	onOpenSidebar: () => void
	isLoading?: boolean
	loadingMessage?: string
}

/**
 * Style configurations based on score (1-10 scale) - orange theme
 */
interface ScoreStyle {
	gradient: string
	glow: string
	labelColor: string
}

function getScoreStyle(score: number): ScoreStyle {
	if (score <= 3) {
		return {
			gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
			glow: '0 4px 20px rgba(239, 68, 68, 0.4)',
			labelColor: '#FEE2E2',
		}
	}
	if (score <= 5) {
		return {
			gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
			glow: '0 4px 20px rgba(245, 158, 11, 0.4)',
			labelColor: '#FEF3C7',
		}
	}
	if (score <= 7) {
		return {
			gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
			glow: '0 4px 20px rgba(59, 130, 246, 0.4)',
			labelColor: '#DBEAFE',
		}
	}
	if (score <= 9) {
		return {
			gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
			glow: '0 4px 20px rgba(16, 185, 129, 0.4)',
			labelColor: '#D1FAE5',
		}
	}
	// Exceptional (10) - orange/brand color
	return {
		gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
		glow: '0 4px 24px rgba(249, 115, 22, 0.5)',
		labelColor: '#FED7AA',
	}
}

function getOpportunityLabel(score: number): string {
	if (score <= 3) return 'A éviter'
	if (score <= 5) return 'Prudence'
	if (score <= 7) return 'Correct'
	if (score <= 9) return 'Bonne affaire'
	return 'Exceptionnel'
}

function getScoreLabelColor(score: number): string {
	if (score <= 3) return '#EF4444'
	if (score <= 5) return '#F59E0B'
	if (score <= 7) return '#3B82F6'
	if (score <= 9) return '#10B981'
	return '#F97316'
}

/**
 * Sparkles icon with inline styles
 */
function SparklesIcon({ style }: { style?: CSSProperties }) {
	return (
		<svg
			aria-hidden="true"
			style={style}
			viewBox="0 0 24 24"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
			<path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
			<path d="M16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
		</svg>
	)
}

/**
 * Margin color based on percentage
 */
function getMarginColor(marginPercent: number): string {
	if (marginPercent > 30) return '#10B981' // profit
	if (marginPercent > 15) return '#F59E0B' // caution
	return '#EF4444' // danger
}

/**
 * Badge component displaying the opportunity score on the main Vinted photo
 * Light theme with orange accents
 */
export function Badge({
	score,
	marginPercent,
	onOpenSidebar,
	isLoading = false,
	loadingMessage = 'Analyse en cours...',
}: BadgeProps) {
	const [showTooltip, setShowTooltip] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)
	const tooltipRef = useRef<HTMLDivElement>(null)

	const style = getScoreStyle(score)
	const opportunityLabel = getOpportunityLabel(score)
	const isExceptional = score === 10

	// Find the main photo container on Vinted page
	useEffect(() => {
		function findPhotoContainer(): HTMLElement | null {
			const selectors = [
				'section.item-photos__container',
				'.item-photos__container',
				'.item-photos',
				'[data-testid="item-photo-gallery"]',
				'[data-testid="item-photos"]',
				'.item-photo',
			]

			for (const selector of selectors) {
				const element = document.querySelector<HTMLElement>(selector)
				if (element) {
					return element
				}
			}

			const images = document.querySelectorAll<HTMLImageElement>('img.web_ui__Image__content')
			for (const img of images) {
				if (img.width > 200 && img.height > 200) {
					let parent = img.parentElement
					while (parent && parent !== document.body) {
						if (
							parent.classList.contains('item-photos') ||
							parent.classList.contains('item-photos__container') ||
							parent.tagName === 'FIGURE'
						) {
							return parent
						}
						parent = parent.parentElement
					}
				}
			}

			return null
		}

		function setupBadgePosition(): void {
			const container = findPhotoContainer()
			if (container) {
				const computedStyle = window.getComputedStyle(container)
				if (computedStyle.position === 'static') {
					container.style.position = 'relative'
				}
				setPortalContainer(container)
			}
		}

		setupBadgePosition()

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

	// Inline styles - light theme
	const containerStyle: CSSProperties = {
		position: 'absolute',
		top: '12px',
		left: '12px',
		zIndex: 9999,
		fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
	}

	const buttonBaseStyle: CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
		padding: '10px 16px',
		borderRadius: '9999px',
		background: style.gradient,
		border: 'none',
		boxShadow: isHovered ? '0 8px 30px rgba(249, 115, 22, 0.5)' : style.glow,
		cursor: 'pointer',
		transition: 'all 0.3s ease-out',
		transform: isHovered ? 'scale(1.05) translateY(-2px)' : 'scale(1) translateY(0)',
		outline: 'none',
		position: 'relative',
		overflow: 'hidden',
	}

	const iconStyle: CSSProperties = {
		width: '16px',
		height: '16px',
		color: '#FFFFFF',
		transition: 'transform 0.3s ease-out',
		transform: isHovered ? 'rotate(12deg)' : 'rotate(0deg)',
	}

	const scoreTextStyle: CSSProperties = {
		fontSize: '18px',
		fontWeight: 700,
		color: '#FFFFFF',
		fontVariantNumeric: 'tabular-nums',
		lineHeight: 1,
	}

	const dividerStyle: CSSProperties = {
		width: '1px',
		height: '20px',
		backgroundColor: 'rgba(255, 255, 255, 0.3)',
	}

	const labelStyle: CSSProperties = {
		fontSize: '14px',
		fontWeight: 500,
		color: 'rgba(255, 255, 255, 0.95)',
		whiteSpace: 'nowrap',
	}

	// Tooltip styles - light theme
	const tooltipStyle: CSSProperties = {
		position: 'absolute',
		top: '100%',
		left: 0,
		marginTop: '8px',
		width: '256px',
		backgroundColor: '#FFFFFF',
		borderRadius: '12px',
		boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
		border: '1px solid #E5E7EB',
		padding: '16px',
		zIndex: 10000,
		animation: 'fadeIn 0.2s ease-out',
	}

	const tooltipHeaderStyle: CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: '12px',
	}

	const tooltipTitleStyle: CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
	}

	const tooltipTitleIconStyle: CSSProperties = {
		width: '16px',
		height: '16px',
		color: '#F97316',
	}

	const tooltipTitleTextStyle: CSSProperties = {
		fontSize: '14px',
		fontWeight: 600,
		color: '#1F2937',
	}

	const tooltipScoreBadgeStyle: CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		gap: '4px',
		padding: '2px 8px',
		borderRadius: '9999px',
		background: style.gradient,
		fontSize: '12px',
		fontWeight: 700,
		color: '#FFFFFF',
	}

	const tooltipLabelSectionStyle: CSSProperties = {
		marginBottom: '12px',
		paddingBottom: '12px',
		borderBottom: '1px solid #E5E7EB',
	}

	const tooltipLabelTextStyle: CSSProperties = {
		fontSize: '18px',
		fontWeight: 600,
		color: getScoreLabelColor(score),
	}

	const tooltipMarginRowStyle: CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		fontSize: '14px',
		marginBottom: '12px',
	}

	const tooltipMarginLabelStyle: CSSProperties = {
		color: '#6B7280',
	}

	const tooltipMarginValueStyle: CSSProperties = {
		fontWeight: 600,
		color: getMarginColor(marginPercent),
	}

	const tooltipCtaStyle: CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '8px',
		paddingTop: '8px',
		borderTop: '1px solid #E5E7EB',
	}

	const tooltipCtaTextStyle: CSSProperties = {
		fontSize: '12px',
		color: '#9CA3AF',
	}

	const tooltipCtaIconStyle: CSSProperties = {
		width: '12px',
		height: '12px',
		color: '#9CA3AF',
	}

	// Inject keyframes for animations (must be before any conditional returns)
	useEffect(() => {
		const styleEl = document.createElement('style')
		styleEl.textContent = `
			@keyframes shimmer {
				0% { transform: translateX(-100%); }
				100% { transform: translateX(100%); }
			}
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
			@keyframes pulse {
				0%, 100% { opacity: 1; }
				50% { opacity: 0.5; }
			}
			@keyframes fadeIn {
				from { opacity: 0; transform: translateY(-4px); }
				to { opacity: 1; transform: translateY(0); }
			}
			@keyframes pulseGlow {
				0%, 100% { box-shadow: 0 4px 24px rgba(249, 115, 22, 0.5); }
				50% { box-shadow: 0 4px 32px rgba(249, 115, 22, 0.7); }
			}
		`
		if (!document.querySelector('[data-vinted-ai-styles]')) {
			styleEl.setAttribute('data-vinted-ai-styles', 'true')
			document.head.appendChild(styleEl)
		}
	}, [])

	// Loading state badge - orange theme
	if (isLoading) {
		const loadingBadgeStyle: CSSProperties = {
			position: 'relative',
			overflow: 'hidden',
			display: 'flex',
			alignItems: 'center',
			gap: '10px',
			padding: '12px 18px',
			borderRadius: '9999px',
			background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
			border: 'none',
			boxShadow: '0 10px 25px -3px rgba(249, 115, 22, 0.4)',
		}

		const shimmerStyle: CSSProperties = {
			position: 'absolute',
			inset: 0,
			background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent)',
			animation: 'shimmer 1.5s infinite',
		}

		const spinnerStyle: CSSProperties = {
			width: '18px',
			height: '18px',
			border: '2px solid rgba(255, 255, 255, 0.3)',
			borderTopColor: '#FFFFFF',
			borderRadius: '50%',
			animation: 'spin 0.8s linear infinite',
		}

		const loadingTextStyle: CSSProperties = {
			fontSize: '14px',
			fontWeight: 500,
			color: '#FFFFFF',
			whiteSpace: 'nowrap',
		}

		const loadingBadge = (
			<div style={containerStyle}>
				<div style={loadingBadgeStyle}>
					<div style={shimmerStyle} />
					<div style={spinnerStyle} />
					<span style={loadingTextStyle}>{loadingMessage}</span>
				</div>
			</div>
		)

		// Use portal if container found, otherwise fallback to fixed position
		if (portalContainer) {
			return createPortal(loadingBadge, portalContainer)
		}

		// Fallback: fixed position loading badge
		const fixedLoadingStyle: CSSProperties = {
			position: 'fixed',
			top: '80px',
			left: '16px',
			zIndex: 2147483646,
			fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
		}

		return (
			<div style={fixedLoadingStyle}>
				<div style={loadingBadgeStyle}>
					<div style={shimmerStyle} />
					<div style={spinnerStyle} />
					<span style={loadingTextStyle}>{loadingMessage}</span>
				</div>
			</div>
		)
	}

	const badgeContent = (
		<div
			style={containerStyle}
			onMouseEnter={() => setShowTooltip(true)}
			onMouseLeave={() => setShowTooltip(false)}
		>
			<button
				type="button"
				onClick={onOpenSidebar}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				style={{
					...buttonBaseStyle,
					...(isExceptional ? { animation: 'pulseGlow 2s ease-in-out infinite' } : {}),
				}}
				aria-label={`Score d'opportunité: ${score}/10. ${opportunityLabel}. Cliquez pour ouvrir le détail.`}
			>
				<SparklesIcon style={iconStyle} />
				<span style={scoreTextStyle}>{score}</span>
				<div style={dividerStyle} />
				<span style={labelStyle}>{opportunityLabel}</span>
			</button>

			{showTooltip && (
				<div ref={tooltipRef} style={tooltipStyle}>
					<div style={tooltipHeaderStyle}>
						<div style={tooltipTitleStyle}>
							<SparklesIcon style={tooltipTitleIconStyle} />
							<span style={tooltipTitleTextStyle}>Analyse IA</span>
						</div>
						<div style={tooltipScoreBadgeStyle}>
							<span>{score}/10</span>
						</div>
					</div>

					<div style={tooltipLabelSectionStyle}>
						<span style={tooltipLabelTextStyle}>{opportunityLabel}</span>
					</div>

					<div style={tooltipMarginRowStyle}>
						<span style={tooltipMarginLabelStyle}>Marge potentielle</span>
						<span style={tooltipMarginValueStyle}>+{marginPercent.toFixed(0)}%</span>
					</div>

					<div style={tooltipCtaStyle}>
						<span style={tooltipCtaTextStyle}>Cliquez pour l'analyse complète</span>
						<svg
							aria-hidden="true"
							style={tooltipCtaIconStyle}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</div>
			)}
		</div>
	)

	if (portalContainer) {
		return createPortal(badgeContent, portalContainer)
	}

	// Fallback: render in fixed position if no photo container found
	const fixedContainerStyle: CSSProperties = {
		position: 'fixed',
		top: '80px',
		left: '16px',
		zIndex: 2147483646,
		fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
	}

	return (
		<div
			style={fixedContainerStyle}
			onMouseEnter={() => setShowTooltip(true)}
			onMouseLeave={() => setShowTooltip(false)}
		>
			<button
				type="button"
				onClick={onOpenSidebar}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				style={{
					...buttonBaseStyle,
					...(isExceptional ? { animation: 'pulseGlow 2s ease-in-out infinite' } : {}),
				}}
				aria-label={`Score d'opportunité: ${score}/10. ${opportunityLabel}. Cliquez pour ouvrir le détail.`}
			>
				<SparklesIcon style={iconStyle} />
				<span style={scoreTextStyle}>{score}</span>
				<div style={dividerStyle} />
				<span style={labelStyle}>{opportunityLabel}</span>
			</button>

			{showTooltip && (
				<div ref={tooltipRef} style={{ ...tooltipStyle, zIndex: 2147483647 }}>
					<div style={tooltipHeaderStyle}>
						<div style={tooltipTitleStyle}>
							<SparklesIcon style={tooltipTitleIconStyle} />
							<span style={tooltipTitleTextStyle}>Analyse IA</span>
						</div>
						<div style={tooltipScoreBadgeStyle}>
							<span>{score}/10</span>
						</div>
					</div>

					<div style={tooltipLabelSectionStyle}>
						<span style={tooltipLabelTextStyle}>{opportunityLabel}</span>
					</div>

					<div style={tooltipMarginRowStyle}>
						<span style={tooltipMarginLabelStyle}>Marge potentielle</span>
						<span style={tooltipMarginValueStyle}>+{marginPercent.toFixed(0)}%</span>
					</div>

					<div style={tooltipCtaStyle}>
						<span style={tooltipCtaTextStyle}>Cliquez pour l'analyse complète</span>
						<svg
							aria-hidden="true"
							style={tooltipCtaIconStyle}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
						</svg>
					</div>
				</div>
			)}
		</div>
	)
}
