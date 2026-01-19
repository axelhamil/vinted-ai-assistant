/**
 * Extension enable/disable toggle
 */

interface ExtensionToggleProps {
	enabled: boolean
	onToggle: () => void
}

export function ExtensionToggle({ enabled, onToggle }: ExtensionToggleProps) {
	return (
		<div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
				<div>
				<p className="text-base font-medium text-gray-900">Extension active</p>
				<p className="text-base text-gray-500">
					{enabled ? 'Analyse automatique activée' : 'Extension en pause'}
				</p>
			</div>
			<button
				type="button"
				onClick={onToggle}
				className={`relative h-6 w-11 rounded-full transition-colors ${
					enabled ? 'bg-indigo-600' : 'bg-gray-300'
				}`}
				aria-label={enabled ? 'Disable extension' : 'Enable extension'}
			>
				<span
					className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
						enabled ? 'left-[22px]' : 'left-0.5'
					}`}
				/>
			</button>
		</div>
	)
}
