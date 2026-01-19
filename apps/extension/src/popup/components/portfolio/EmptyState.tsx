/**
 * Empty state component for portfolio lists
 */

interface EmptyStateProps {
	title: string
	description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center p-8 text-center">
			<div className="mb-3 text-gray-300">
				<svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={1.5}
						d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
					/>
				</svg>
			</div>
				<p className="text-base font-medium text-gray-600">{title}</p>
			<p className="mt-1 text-base text-gray-400">{description}</p>
		</div>
	)
}
