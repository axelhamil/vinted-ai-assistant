interface ErrorDisplayProps {
	message: string
	onRetry?: () => void
	isRetrying?: boolean
}

/**
 * Error display component with retry button
 * Light theme
 */
export function ErrorDisplay({ message, onRetry, isRetrying = false }: ErrorDisplayProps) {
	return (
		<div
			className="fixed top-4 right-4 bg-white rounded-xl shadow-card border border-danger/30 p-4 min-w-[280px] max-w-sm z-[2147483647]"
			style={{ zIndex: 2147483647 }}
			role="alert"
			aria-live="assertive"
		>
			{/* Header */}
			<div className="flex items-start gap-3">
				{/* Error Icon */}
				<div className="flex-shrink-0 w-10 h-10 bg-danger/10 rounded-full flex items-center justify-center">
					<svg
						className="w-5 h-5 text-danger"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<h3 className="text-base font-semibold text-content-primary">Erreur d'analyse</h3>
					<p className="text-base text-content-secondary mt-1">{message}</p>
				</div>
			</div>

			{/* Retry Button */}
			{onRetry && (
				<div className="mt-4">
					<button
						type="button"
						onClick={onRetry}
						disabled={isRetrying}
						className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-danger text-white rounded-lg text-base font-medium hover:bg-danger/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{isRetrying ? (
							<>
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
								<span>Nouvelle tentative...</span>
							</>
						) : (
							<>
								<svg
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								<span>Réessayer</span>
							</>
						)}
					</button>
				</div>
			)}

			{/* Tips */}
			<div className="mt-3 pt-3 border-t border-border">
				<p className="text-sm text-content-muted">
					Vérifiez que le backend est en cours d'exécution sur localhost:3000
				</p>
			</div>
		</div>
	)
}
