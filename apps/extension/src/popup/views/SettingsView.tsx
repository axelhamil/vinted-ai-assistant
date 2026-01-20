/**
 * Settings configuration view
 */

import { useState } from 'react'
import { BackIcon } from '../icons/BackIcon'
import type { ExtensionSettings } from '../types'

interface SettingsViewProps {
	settings: ExtensionSettings | null
	onBack: () => void
	onUpdate: (settings: Partial<ExtensionSettings>) => Promise<void>
}

export function SettingsView({ settings, onBack, onUpdate }: SettingsViewProps) {
	const [localSettings, setLocalSettings] = useState<ExtensionSettings | null>(settings)
	const [isSaving, setIsSaving] = useState(false)

	const handleSave = async () => {
		if (!localSettings) return
		setIsSaving(true)
		await onUpdate(localSettings)
		setIsSaving(false)
		onBack()
	}

	if (!localSettings) {
		return (
			<div className="w-80 p-4">
				<p className="text-base text-gray-500">Erreur de chargement des paramètres</p>
			</div>
		)
	}

	return (
		<div className="w-80">
			{/* Header */}
			<div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
				<button
					type="button"
					onClick={onBack}
					className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
					aria-label="Back"
				>
					<BackIcon />
				</button>
				<h1 className="font-bold text-gray-900">Paramètres</h1>
			</div>

			{/* Settings Form */}
			<div className="p-4">
				{/* Backend URL */}
				<div className="mb-4">
					<label htmlFor="backendUrl" className="mb-1 block text-base font-medium text-gray-700">
						URL Backend
					</label>
					<input
						type="url"
						id="backendUrl"
						value={localSettings.backendUrl}
						onChange={(e) => setLocalSettings({ ...localSettings, backendUrl: e.target.value })}
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
						placeholder="http://localhost:3000"
					/>
				</div>

				{/* Score Threshold */}
				<div className="mb-4">
					<label
						htmlFor="scoreThreshold"
						className="mb-1 block text-base font-medium text-gray-700"
					>
						Seuil score opportunité
					</label>
					<div className="flex items-center gap-3">
						<input
							type="range"
							id="scoreThreshold"
							min="1"
							max="10"
							value={localSettings.scoreThreshold}
							onChange={(e) =>
								setLocalSettings({
									...localSettings,
									scoreThreshold: Number.parseInt(e.target.value, 10),
								})
							}
							className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
						/>
						<span className="w-8 text-center text-lg font-semibold text-indigo-600">
							{localSettings.scoreThreshold}
						</span>
					</div>
					<p className="mt-1 text-base text-gray-500">
						Les articles avec un score &ge; {localSettings.scoreThreshold} seront mis en évidence
					</p>
				</div>

				{/* Auto-open Sidebar */}
				<div className="mb-4 flex items-center justify-between">
					<div>
						<p className="text-base font-medium text-gray-700">Ouvrir sidebar auto</p>
						<p className="text-base text-gray-500">Ouvre la sidebar après analyse</p>
					</div>
					<button
						type="button"
						onClick={() =>
							setLocalSettings({
								...localSettings,
								autoOpenSidebar: !localSettings.autoOpenSidebar,
							})
						}
						className={`relative h-6 w-11 rounded-full transition-colors ${
							localSettings.autoOpenSidebar ? 'bg-indigo-600' : 'bg-gray-300'
						}`}
						aria-label={localSettings.autoOpenSidebar ? 'Disable auto-open' : 'Enable auto-open'}
					>
						<span
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
								localSettings.autoOpenSidebar ? 'left-[22px]' : 'left-0.5'
							}`}
						/>
					</button>
				</div>

				{/* Save Button */}
				<button
					type="button"
					onClick={handleSave}
					disabled={isSaving}
					className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-base font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isSaving ? 'Enregistrement...' : 'Enregistrer'}
				</button>
			</div>
		</div>
	)
}
