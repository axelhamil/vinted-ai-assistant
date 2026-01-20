/**
 * Suggestion field with apply button for form suggestions
 */

interface SuggestionFieldProps {
	label: string
	value: string
	isMultiline?: boolean
	onApply: () => void
}

export function SuggestionField({
	label,
	value,
	isMultiline = false,
	onApply,
}: SuggestionFieldProps) {
	return (
		<div className="p-4 bg-surface-secondary rounded-xl border border-border">
			<div className="flex items-center justify-between mb-3">
				<span className="text-base font-medium text-content-secondary">{label}</span>
				<button
					type="button"
					onClick={onApply}
					className="text-base text-brand hover:text-brand-dark font-medium transition-colors"
				>
					Appliquer
				</button>
			</div>
			<p
				className={`text-base text-content-primary ${isMultiline ? 'line-clamp-6' : 'line-clamp-2'}`}
			>
				{value}
			</p>
		</div>
	)
}
