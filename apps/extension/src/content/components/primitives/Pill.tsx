import type { ReactNode } from 'react'

type PillVariant =
	| 'positive'
	| 'negative'
	| 'neutral'
	| 'info'
	| 'warning'
	| 'success'
	| 'default'
	| 'brand'

interface PillProps {
	children: ReactNode
	variant?: PillVariant
	icon?: ReactNode
	className?: string
	onClick?: () => void
}

const variantStyles: Record<PillVariant, { bg: string; text: string; border: string }> = {
	positive: {
		bg: 'bg-profit/10',
		text: 'text-profit',
		border: 'border-profit/20',
	},
	negative: {
		bg: 'bg-danger/10',
		text: 'text-danger',
		border: 'border-danger/20',
	},
	neutral: {
		bg: 'bg-info/10',
		text: 'text-info',
		border: 'border-info/20',
	},
	info: {
		bg: 'bg-info/10',
		text: 'text-info',
		border: 'border-info/20',
	},
	warning: {
		bg: 'bg-caution/10',
		text: 'text-caution',
		border: 'border-caution/20',
	},
	success: {
		bg: 'bg-profit/10',
		text: 'text-profit',
		border: 'border-profit/20',
	},
	brand: {
		bg: 'bg-brand/10',
		text: 'text-brand',
		border: 'border-brand/20',
	},
	default: {
		bg: 'bg-surface-tertiary',
		text: 'text-content-secondary',
		border: 'border-border',
	},
}

/**
 * Pill/Badge component for tags and status indicators - light theme
 */
export function Pill({ children, variant = 'default', icon, className = '', onClick }: PillProps) {
	const styles = variantStyles[variant]
	const isClickable = !!onClick

	return (
		<span
			className={`
				inline-flex items-center gap-2 px-5 py-2.5
				text-xl font-medium rounded-full
				border transition-all duration-150
				${styles.bg} ${styles.text} ${styles.border}
				${isClickable ? 'cursor-pointer hover:brightness-95' : ''}
				${className}
			`}
			onClick={onClick}
			onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
			role={isClickable ? 'button' : undefined}
			tabIndex={isClickable ? 0 : undefined}
		>
			{icon && <span className="flex-shrink-0">{icon}</span>}
			{children}
		</span>
	)
}

/**
 * Signal pill with type-based icon
 */
export function SignalPill({
	type,
	label,
	onClick,
}: {
	type: 'positive' | 'negative' | 'neutral'
	label: string
	onClick?: () => void
}) {
	const iconMap = {
		positive: (
			<svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
				<path
					fillRule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
					clipRule="evenodd"
				/>
			</svg>
		),
		negative: (
			<svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
				<path
					fillRule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
					clipRule="evenodd"
				/>
			</svg>
		),
		neutral: (
			<svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
				<path
					fillRule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
					clipRule="evenodd"
				/>
			</svg>
		),
	}

	const variantMap = {
		positive: 'positive' as const,
		negative: 'negative' as const,
		neutral: 'info' as const,
	}

	return (
		<Pill variant={variantMap[type]} icon={iconMap[type]} onClick={onClick}>
			{label}
		</Pill>
	)
}
