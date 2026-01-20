/**
 * Preset selector component for photo editing styles
 */

import type { StudioPreset } from '../../../background/message-types'

interface PresetSelectorProps {
	presets: StudioPreset[]
	selectedPresetId: string | null
	onSelect: (preset: StudioPreset) => void
}

export function PresetSelector({ presets, selectedPresetId, onSelect }: PresetSelectorProps) {
	return (
		<div>
			<span className="text-base font-medium text-content-secondary block mb-3">
				Style de retouche
			</span>
			<div className="grid grid-cols-2 gap-3">
				{presets.map((preset) => (
					<button
						key={preset.id}
						type="button"
						onClick={() => onSelect(preset)}
						className={`p-3 rounded-lg border text-left transition-all ${
							selectedPresetId === preset.id
								? 'border-brand bg-brand/5'
								: 'border-border hover:border-brand/50'
						}`}
					>
						<div className="font-medium text-base text-content-primary truncate">{preset.name}</div>
						{preset.description && (
							<div className="text-base text-content-secondary mt-1 line-clamp-1">
								{preset.description}
							</div>
						)}
					</button>
				))}
			</div>
		</div>
	)
}
