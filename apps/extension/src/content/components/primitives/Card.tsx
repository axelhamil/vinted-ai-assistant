import type { ReactNode } from 'react'

type IconContainerColor = 'orange' | 'green' | 'blue' | 'red' | 'amber' | 'violet'

interface CardProps {
	children: ReactNode
	className?: string
	title?: string
	icon?: ReactNode
	iconColor?: IconContainerColor
	onClick?: () => void
}

const iconColorStyles: Record<IconContainerColor, string> = {
	orange: 'bg-brand/10 text-brand',
	green: 'bg-profit/10 text-profit',
	blue: 'bg-info/10 text-info',
	red: 'bg-danger/10 text-danger',
	amber: 'bg-caution/10 text-caution',
	violet: 'bg-exceptional/10 text-exceptional',
}

/**
 * Card component with light theme, subtle shadow and optional colored icon
 */
export function Card({
	children,
	className = '',
	title,
	icon,
	iconColor = 'orange',
	onClick,
}: CardProps) {
	const isClickable = !!onClick

	return (
		<div
			className={`
				relative p-5 rounded-xl
				bg-white border border-border
				shadow-card
				transition-all duration-150
				${isClickable ? 'cursor-pointer hover:border-border-dark hover:shadow-medium' : ''}
				${className}
			`}
			onClick={onClick}
			onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
			role={isClickable ? 'button' : undefined}
			tabIndex={isClickable ? 0 : undefined}
		>
			{title && (
				<div className="flex items-center gap-3 mb-4">
					{icon && (
						<div
							className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColorStyles[iconColor]}`}
						>
							{icon}
						</div>
					)}
					<h4 className="text-xl font-semibold text-content-muted uppercase tracking-wider">
						{title}
					</h4>
				</div>
			)}
			{children}
		</div>
	)
}

interface CardRowProps {
	label: string
	value: ReactNode
	valueClassName?: string
}

/**
 * Card row for displaying label/value pairs
 */
export function CardRow({ label, value, valueClassName = '' }: CardRowProps) {
	return (
		<div className="flex items-center justify-between">
			<span className="text-xl text-content-secondary">{label}</span>
			<span className={`text-xl font-medium text-content-primary ${valueClassName}`}>{value}</span>
		</div>
	)
}
