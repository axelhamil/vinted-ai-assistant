import type { ReactNode } from 'react'

type ButtonVariant = 'secondary' | 'primary' | 'success' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
	children: ReactNode
	variant?: ButtonVariant
	size?: ButtonSize
	icon?: ReactNode
	iconPosition?: 'left' | 'right'
	disabled?: boolean
	loading?: boolean
	fullWidth?: boolean
	className?: string
	onClick?: () => void
	type?: 'button' | 'submit' | 'reset'
	ariaLabel?: string
}

const variantStyles: Record<ButtonVariant, string> = {
	secondary: `
		bg-white border border-border text-content-primary shadow-soft
		hover:bg-surface-secondary hover:border-border-dark hover:shadow-card
	`,
	primary: `
		bg-gradient-to-r from-brand to-brand-dark border-0 text-white shadow-soft
		hover:from-brand-dark hover:to-brand-darker hover:shadow-[0_4px_12px_rgba(249,115,22,0.4)]
	`,
	success: `
		bg-profit border-0 text-white shadow-soft
		hover:bg-[#0ea572] hover:shadow-[0_4px_12px_rgba(16,185,129,0.3)]
	`,
	danger: `
		bg-danger border-0 text-white shadow-soft
		hover:bg-[#dc2626] hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)]
	`,
	ghost: `
		bg-transparent border-0 text-content-secondary
		hover:bg-surface-tertiary hover:text-content-primary
	`,
}

const sizeStyles: Record<ButtonSize, string> = {
	sm: 'px-4 py-2 text-base gap-2',
	md: 'px-5 py-2.5 text-lg gap-2.5',
	lg: 'px-7 py-3.5 text-xl gap-3',
}

/**
 * Button component with light theme and orange accent
 */
export function Button({
	children,
	variant = 'secondary',
	size = 'md',
	icon,
	iconPosition = 'left',
	disabled = false,
	loading = false,
	fullWidth = false,
	className = '',
	onClick,
	type = 'button',
	ariaLabel,
}: ButtonProps) {
	const isDisabled = disabled || loading

	return (
		<button
			type={type}
			onClick={onClick}
			disabled={isDisabled}
			aria-label={ariaLabel}
			aria-busy={loading}
			className={`
				inline-flex items-center justify-center
				font-medium rounded-lg
				transition-all duration-150
				${variantStyles[variant]}
				${sizeStyles[size]}
				${fullWidth ? 'w-full' : ''}
				${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0'}
				${className}
			`}
		>
			{loading ? (
				<>
					<Spinner size={size} />
					<span className="ml-2">{children}</span>
				</>
			) : (
				<>
					{icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
					{children}
					{icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
				</>
			)}
		</button>
	)
}

/**
 * Icon-only button
 */
export function IconButton({
	icon,
	variant = 'ghost',
	size = 'md',
	disabled = false,
	loading = false,
	className = '',
	onClick,
	ariaLabel,
}: Omit<ButtonProps, 'children' | 'iconPosition' | 'fullWidth'> & { icon: ReactNode }) {
	const isDisabled = disabled || loading
	const sizeMap = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' }

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={isDisabled}
			aria-label={ariaLabel}
			aria-busy={loading}
			className={`
				inline-flex items-center justify-center
				rounded-lg transition-all duration-150
				${variantStyles[variant]}
				${sizeMap[size]}
				${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0'}
				${className}
			`}
		>
			{loading ? <Spinner size={size} /> : icon}
		</button>
	)
}

/**
 * Loading spinner
 */
function Spinner({ size }: { size: ButtonSize }) {
	const sizeMap = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' }

	return (
		<svg
			className={`animate-spin ${sizeMap[size]}`}
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle
				className="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="4"
			/>
			<path
				className="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			/>
		</svg>
	)
}
