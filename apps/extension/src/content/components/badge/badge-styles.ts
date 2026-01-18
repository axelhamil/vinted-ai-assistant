/**
 * Badge CSS-in-JS styles
 */

import type { CSSProperties } from 'react'
import { getMarginColor, getScoreLabelColor, type ScoreStyle } from './badge-utils'

// Base font family
const fontFamily = 'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

/**
 * Container style for badge
 */
export function getContainerStyle(position: 'absolute' | 'fixed' = 'absolute'): CSSProperties {
	if (position === 'fixed') {
		return {
			position: 'fixed',
			top: '80px',
			left: '16px',
			zIndex: 2147483646,
			fontFamily,
		}
	}
	return {
		position: 'absolute',
		top: '12px',
		left: '12px',
		zIndex: 9999,
		fontFamily,
	}
}

/**
 * Button base style
 */
export function getButtonStyle(style: ScoreStyle, isHovered: boolean, isExceptional: boolean): CSSProperties {
	return {
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
		...(isExceptional ? { animation: 'pulseGlow 2s ease-in-out infinite' } : {}),
	}
}

/**
 * Icon style
 */
export function getIconStyle(isHovered: boolean): CSSProperties {
	return {
		width: '16px',
		height: '16px',
		color: '#FFFFFF',
		transition: 'transform 0.3s ease-out',
		transform: isHovered ? 'rotate(12deg)' : 'rotate(0deg)',
	}
}

/**
 * Score text style
 */
export const scoreTextStyle: CSSProperties = {
	fontSize: '18px',
	fontWeight: 700,
	color: '#FFFFFF',
	fontVariantNumeric: 'tabular-nums',
	lineHeight: 1,
}

/**
 * Divider style
 */
export const dividerStyle: CSSProperties = {
	width: '1px',
	height: '20px',
	backgroundColor: 'rgba(255, 255, 255, 0.3)',
}

/**
 * Label style
 */
export const labelStyle: CSSProperties = {
	fontSize: '14px',
	fontWeight: 500,
	color: 'rgba(255, 255, 255, 0.95)',
	whiteSpace: 'nowrap',
}

// Tooltip styles
export function getTooltipStyle(score: number): CSSProperties {
	return {
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
}

export const tooltipHeaderStyle: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	marginBottom: '12px',
}

export const tooltipTitleStyle: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
}

export const tooltipTitleIconStyle: CSSProperties = {
	width: '16px',
	height: '16px',
	color: '#F97316',
}

export const tooltipTitleTextStyle: CSSProperties = {
	fontSize: '14px',
	fontWeight: 600,
	color: '#1F2937',
}

export function getTooltipScoreBadgeStyle(style: ScoreStyle): CSSProperties {
	return {
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
}

export const tooltipLabelSectionStyle: CSSProperties = {
	marginBottom: '12px',
	paddingBottom: '12px',
	borderBottom: '1px solid #E5E7EB',
}

export function getTooltipLabelTextStyle(score: number): CSSProperties {
	return {
		fontSize: '18px',
		fontWeight: 600,
		color: getScoreLabelColor(score),
	}
}

export const tooltipMarginRowStyle: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	fontSize: '14px',
	marginBottom: '12px',
}

export const tooltipMarginLabelStyle: CSSProperties = {
	color: '#6B7280',
}

export function getTooltipMarginValueStyle(marginPercent: number): CSSProperties {
	return {
		fontWeight: 600,
		color: getMarginColor(marginPercent),
	}
}

export const tooltipCtaStyle: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	gap: '8px',
	paddingTop: '8px',
	borderTop: '1px solid #E5E7EB',
}

export const tooltipCtaTextStyle: CSSProperties = {
	fontSize: '12px',
	color: '#9CA3AF',
}

export const tooltipCtaIconStyle: CSSProperties = {
	width: '12px',
	height: '12px',
	color: '#9CA3AF',
}

// Loading styles
export const loadingBadgeStyle: CSSProperties = {
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

export const shimmerStyle: CSSProperties = {
	position: 'absolute',
	inset: 0,
	background: 'linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent)',
	animation: 'shimmer 1.5s infinite',
}

export const spinnerStyle: CSSProperties = {
	width: '18px',
	height: '18px',
	border: '2px solid rgba(255, 255, 255, 0.3)',
	borderTopColor: '#FFFFFF',
	borderRadius: '50%',
	animation: 'spin 0.8s linear infinite',
}

export const loadingTextStyle: CSSProperties = {
	fontSize: '14px',
	fontWeight: 500,
	color: '#FFFFFF',
	whiteSpace: 'nowrap',
}

/**
 * Inject keyframes for animations
 */
export function injectBadgeAnimations(): void {
	if (document.querySelector('[data-vinted-ai-styles]')) return

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
	styleEl.setAttribute('data-vinted-ai-styles', 'true')
	document.head.appendChild(styleEl)
}
