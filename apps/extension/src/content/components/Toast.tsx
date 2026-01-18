import { useCallback, useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
	id: string
	type: ToastType
	message: string
	duration?: number
}

interface ToastProps {
	toast: ToastMessage
	onDismiss: (id: string) => void
}

interface ToastStyles {
	bg: string
	border: string
	text: string
	iconBg: string
	icon: string
}

/**
 * Gets the toast styling based on type - light theme
 */
function getToastStyles(type: ToastType): ToastStyles {
	switch (type) {
		case 'success':
			return {
				bg: 'bg-white',
				border: 'border-profit/30',
				text: 'text-profit',
				iconBg: 'bg-profit/10',
				icon: '✓',
			}
		case 'error':
			return {
				bg: 'bg-white',
				border: 'border-danger/30',
				text: 'text-danger',
				iconBg: 'bg-danger/10',
				icon: '✕',
			}
		case 'warning':
			return {
				bg: 'bg-white',
				border: 'border-caution/30',
				text: 'text-caution',
				iconBg: 'bg-caution/10',
				icon: '⚠',
			}
		case 'info':
			return {
				bg: 'bg-white',
				border: 'border-info/30',
				text: 'text-info',
				iconBg: 'bg-info/10',
				icon: 'ℹ',
			}
	}
}

/**
 * Individual Toast component - light theme
 */
function Toast({ toast, onDismiss }: ToastProps) {
	const styles = getToastStyles(toast.type)
	const [isVisible, setIsVisible] = useState(false)
	const [isLeaving, setIsLeaving] = useState(false)

	useEffect(() => {
		// Trigger enter animation
		requestAnimationFrame(() => {
			setIsVisible(true)
		})

		// Auto-dismiss after duration
		const duration = toast.duration ?? 4000
		const timer = setTimeout(() => {
			setIsLeaving(true)
			setTimeout(() => onDismiss(toast.id), 300)
		}, duration)

		return () => clearTimeout(timer)
	}, [toast.id, toast.duration, onDismiss])

	const handleDismiss = useCallback(() => {
		setIsLeaving(true)
		setTimeout(() => onDismiss(toast.id), 300)
	}, [toast.id, onDismiss])

	return (
		<div
			className={`
				flex items-center gap-3 px-4 py-3 rounded-xl border shadow-card
				${styles.bg} ${styles.border}
				transition-all duration-300 ease-out
				${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
			`}
			role="alert"
			aria-live="polite"
		>
			{/* Icon */}
			<div className={`w-8 h-8 rounded-full flex items-center justify-center ${styles.iconBg}`}>
				<span className={`text-base ${styles.text}`} aria-hidden="true">
					{styles.icon}
				</span>
			</div>

			{/* Message */}
			<p className="flex-1 text-base font-medium text-content-primary">{toast.message}</p>

			{/* Dismiss button */}
			<button
				type="button"
				onClick={handleDismiss}
				className="p-1 rounded hover:bg-surface-secondary transition-colors text-content-muted hover:text-content-secondary"
				aria-label="Fermer la notification"
			>
				<svg
					className="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	)
}

interface ToastContainerProps {
	toasts: ToastMessage[]
	onDismiss: (id: string) => void
}

/**
 * Toast Container component that manages multiple toasts
 */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
	if (toasts.length === 0) {
		return null
	}

	return (
		<div
			className="fixed top-4 right-4 z-[2147483647] flex flex-col gap-2 max-w-sm"
			style={{ zIndex: 2147483647 }}
			aria-label="Notifications"
		>
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
			))}
		</div>
	)
}

/**
 * Hook for managing toast notifications
 */
export function useToast() {
	const [toasts, setToasts] = useState<ToastMessage[]>([])

	const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
		const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
		const newToast: ToastMessage = { id, type, message, duration }
		setToasts((prev) => [...prev, newToast])
		return id
	}, [])

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id))
	}, [])

	const success = useCallback(
		(message: string, duration?: number) => addToast('success', message, duration),
		[addToast]
	)

	const error = useCallback(
		(message: string, duration?: number) => addToast('error', message, duration ?? 6000),
		[addToast]
	)

	const warning = useCallback(
		(message: string, duration?: number) => addToast('warning', message, duration),
		[addToast]
	)

	const info = useCallback(
		(message: string, duration?: number) => addToast('info', message, duration),
		[addToast]
	)

	return {
		toasts,
		addToast,
		dismissToast,
		success,
		error,
		warning,
		info,
	}
}
