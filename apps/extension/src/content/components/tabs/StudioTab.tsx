import { useState, useCallback } from 'react'
import type {
	StudioPreset,
	StudioEditedPhotoResponse,
	StudioBatchEditResponse,
} from '../../../background/message-types'
import { Card } from '../primitives/Card'
import { Button } from '../primitives/Button'

interface StudioTabProps {
	photos: string[]
}

type ProcessingState = 'idle' | 'loading' | 'success' | 'error'

/**
 * Studio tab for AI-powered photo editing
 * Features:
 * - Preset selection (system + custom)
 * - Single or batch photo editing
 * - Before/after comparison
 * - Custom prompt editor
 */
export function StudioTab({ photos }: StudioTabProps) {
	const [presets, setPresets] = useState<StudioPreset[]>([])
	const [selectedPreset, setSelectedPreset] = useState<StudioPreset | null>(null)
	const [selectedPhoto, setSelectedPhoto] = useState<string | null>(photos[0] || null)
	const [editedPhoto, setEditedPhoto] = useState<string | null>(null)
	const [processingState, setProcessingState] = useState<ProcessingState>('idle')
	const [error, setError] = useState<string | null>(null)
	const [presetsLoaded, setPresetsLoaded] = useState(false)
	const [showCustomPrompt, setShowCustomPrompt] = useState(false)
	const [customPrompt, setCustomPrompt] = useState('')
	const [batchResults, setBatchResults] = useState<StudioBatchEditResponse | null>(null)

	// Load presets on mount
	const loadPresets = useCallback(async () => {
		if (presetsLoaded) return

		try {
			const response = await chrome.runtime.sendMessage({
				type: 'STUDIO_GET_PRESETS',
				filter: 'all',
			})

			if (response.success && response.data) {
				setPresets(response.data.presets)
				if (response.data.presets.length > 0) {
					setSelectedPreset(response.data.presets[0])
				}
			}
			setPresetsLoaded(true)
		} catch (err) {
			console.error('Failed to load presets:', err)
		}
	}, [presetsLoaded])

	// Load presets when component is shown
	if (!presetsLoaded) {
		loadPresets()
	}

	// Edit single photo with selected preset
	const handleEditPhoto = useCallback(async () => {
		if (!selectedPhoto || (!selectedPreset && !customPrompt)) return

		setProcessingState('loading')
		setError(null)
		setEditedPhoto(null)

		try {
			let response: { success: boolean; data?: StudioEditedPhotoResponse; error?: string }

			if (showCustomPrompt && customPrompt) {
				response = await chrome.runtime.sendMessage({
					type: 'STUDIO_EDIT_PHOTO_CUSTOM',
					image: selectedPhoto,
					promptTemplate: customPrompt,
					stripMetadata: true,
				})
			} else if (selectedPreset) {
				response = await chrome.runtime.sendMessage({
					type: 'STUDIO_EDIT_PHOTO',
					image: selectedPhoto,
					presetId: selectedPreset.id,
					stripMetadata: true,
				})
			} else {
				throw new Error('No preset or custom prompt selected')
			}

			if (response.success && response.data) {
				setEditedPhoto(response.data.dataUrl)
				setProcessingState('success')
			} else {
				throw new Error(response.error || 'Failed to edit photo')
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to edit photo')
			setProcessingState('error')
		}
	}, [selectedPhoto, selectedPreset, showCustomPrompt, customPrompt])

	// Edit all photos in batch
	const handleBatchEdit = useCallback(async () => {
		if (photos.length === 0 || !selectedPreset) return

		setProcessingState('loading')
		setError(null)
		setBatchResults(null)

		try {
			const response = await chrome.runtime.sendMessage({
				type: 'STUDIO_EDIT_PHOTO_BATCH',
				images: photos,
				presetId: selectedPreset.id,
				stripMetadata: true,
			})

			if (response.success && response.data) {
				setBatchResults(response.data)
				setProcessingState('success')
			} else {
				throw new Error(response.error || 'Failed to edit photos')
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to edit photos')
			setProcessingState('error')
		}
	}, [photos, selectedPreset])

	// Download edited photo
	const handleDownload = useCallback(
		(dataUrl: string, filename?: string) => {
			const link = document.createElement('a')
			link.href = dataUrl
			link.download = filename || `studio-edited-${Date.now()}.png`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		},
		[]
	)

	// Download all batch results as ZIP
	const handleDownloadAll = useCallback(async () => {
		if (!batchResults) return

		// For simplicity, download each individually (ZIP would require a library)
		for (let i = 0; i < batchResults.results.length; i++) {
			const result = batchResults.results[i]
			if (result && result.success && result.dataUrl) {
				handleDownload(result.dataUrl, `studio-edited-${i + 1}.png`)
				// Small delay between downloads
				await new Promise((resolve) => setTimeout(resolve, 100))
			}
		}
	}, [batchResults, handleDownload])

	if (photos.length === 0) {
		return (
			<Card className="p-6">
				<div className="text-center text-content-secondary">
					<svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					<p className="text-base">Aucune photo disponible</p>
					<p className="text-sm mt-1 opacity-75">Les photos de l'article apparaitront ici</p>
				</div>
			</Card>
		)
	}

	return (
		<div className="space-y-4 animate-fade-in">
			{/* Photo Selection */}
			<Card>
				<div className="p-4 border-b border-border">
					<h3 className="text-base font-semibold text-content-primary">Photos</h3>
				</div>
				<div className="p-4">
					<div className="grid grid-cols-4 gap-2">
						{photos.map((photo, index) => (
							<button
								key={index}
								type="button"
								onClick={() => {
									setSelectedPhoto(photo)
									setEditedPhoto(null)
								}}
								className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
									selectedPhoto === photo
										? 'border-brand ring-2 ring-brand/20'
										: 'border-border hover:border-brand/50'
								}`}
							>
								<img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
								{selectedPhoto === photo && (
									<div className="absolute inset-0 bg-brand/10 flex items-center justify-center">
										<div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center">
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
											</svg>
										</div>
									</div>
								)}
							</button>
						))}
					</div>
				</div>
			</Card>

			{/* Preset Selection */}
			<Card>
				<div className="p-4 border-b border-border flex items-center justify-between">
					<h3 className="text-base font-semibold text-content-primary">Style Studio</h3>
					<button
						type="button"
						onClick={() => setShowCustomPrompt(!showCustomPrompt)}
						className="text-sm text-brand hover:text-brand-dark transition-colors"
					>
						{showCustomPrompt ? 'Utiliser un preset' : 'Prompt personnalisé'}
					</button>
				</div>
				<div className="p-4">
					{showCustomPrompt ? (
						<div className="space-y-3">
							<textarea
								value={customPrompt}
								onChange={(e) => setCustomPrompt(e.target.value)}
								placeholder="Décrivez le style souhaité...&#10;&#10;Ex: Fond blanc studio professionnel avec éclairage doux et ombres légères"
								className="w-full h-32 px-3 py-2 text-sm border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
							/>
							<p className="text-xs text-content-secondary">
								Astuce: Soyez précis sur le fond, l'éclairage et l'ambiance souhaitée
							</p>
						</div>
					) : (
						<div className="grid grid-cols-2 gap-3">
							{presets.map((preset) => (
								<button
									key={preset.id}
									type="button"
									onClick={() => setSelectedPreset(preset)}
									className={`p-3 rounded-lg border-2 text-left transition-all ${
										selectedPreset?.id === preset.id
											? 'border-brand bg-brand/5'
											: 'border-border hover:border-brand/50'
									}`}
								>
									<div className="font-medium text-sm text-content-primary">{preset.name}</div>
									{preset.description && (
										<div className="text-xs text-content-secondary mt-1 line-clamp-2">
											{preset.description}
										</div>
									)}
								</button>
							))}
						</div>
					)}
				</div>
			</Card>

			{/* Preview / Comparison */}
			{(selectedPhoto || editedPhoto) && (
				<Card>
					<div className="p-4 border-b border-border">
						<h3 className="text-base font-semibold text-content-primary">
							{editedPhoto ? 'Avant / Après' : 'Aperçu'}
						</h3>
					</div>
					<div className="p-4">
						<div className="grid grid-cols-2 gap-4">
							{selectedPhoto && (
								<div className="space-y-2">
									<span className="text-xs font-medium text-content-secondary">Original</span>
									<div className="aspect-square rounded-lg overflow-hidden border border-border">
										<img src={selectedPhoto} alt="Original" className="w-full h-full object-cover" />
									</div>
								</div>
							)}
							{editedPhoto ? (
								<div className="space-y-2">
									<span className="text-xs font-medium text-content-secondary">Retouché</span>
									<div className="aspect-square rounded-lg overflow-hidden border border-border">
										<img src={editedPhoto} alt="Edited" className="w-full h-full object-cover" />
									</div>
								</div>
							) : (
								<div className="space-y-2">
									<span className="text-xs font-medium text-content-secondary">Résultat</span>
									<div className="aspect-square rounded-lg overflow-hidden border border-border bg-surface-secondary flex items-center justify-center">
										{processingState === 'loading' ? (
											<div className="flex flex-col items-center">
												<div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
												<span className="text-xs text-content-secondary mt-2">Retouche en cours...</span>
											</div>
										) : (
											<span className="text-sm text-content-secondary">Cliquez sur Retoucher</span>
										)}
									</div>
								</div>
							)}
						</div>
					</div>
				</Card>
			)}

			{/* Error Display */}
			{error && (
				<Card className="p-4 bg-red-50 border-red-200">
					<div className="flex items-start gap-3">
						<svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div>
							<p className="text-sm font-medium text-red-800">Erreur</p>
							<p className="text-sm text-red-600 mt-1">{error}</p>
						</div>
					</div>
				</Card>
			)}

			{/* Batch Results */}
			{batchResults && (
				<Card>
					<div className="p-4 border-b border-border flex items-center justify-between">
						<h3 className="text-base font-semibold text-content-primary">
							Résultats ({batchResults.successCount}/{batchResults.results.length})
						</h3>
						{batchResults.successCount > 0 && (
							<Button variant="secondary" size="sm" onClick={handleDownloadAll}>
								Tout télécharger
							</Button>
						)}
					</div>
					<div className="p-4">
						<div className="grid grid-cols-4 gap-2">
							{batchResults.results.map((result, index) => (
								<div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border">
									{result.success && result.dataUrl ? (
										<>
											<img src={result.dataUrl} alt={`Edited ${index + 1}`} className="w-full h-full object-cover" />
											<button
												type="button"
												onClick={() => handleDownload(result.dataUrl as string, `edited-${index + 1}.png`)}
												className="absolute bottom-1 right-1 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors"
											>
												<svg className="w-4 h-4 text-content-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
												</svg>
											</button>
										</>
									) : (
										<div className="w-full h-full bg-red-50 flex items-center justify-center">
											<svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
											</svg>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</Card>
			)}

			{/* Action Buttons */}
			<div className="flex gap-3">
				<Button
					variant="primary"
					className="flex-1"
					onClick={handleEditPhoto}
					disabled={processingState === 'loading' || (!selectedPreset && !customPrompt)}
				>
					{processingState === 'loading' ? (
						<>
							<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
							Retouche en cours...
						</>
					) : (
						'Retoucher la photo'
					)}
				</Button>

				{editedPhoto && (
					<Button variant="secondary" onClick={() => handleDownload(editedPhoto)}>
						<svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
						Télécharger
					</Button>
				)}
			</div>

			{/* Batch Edit Button */}
			{photos.length > 1 && (
				<Button
					variant="secondary"
					className="w-full"
					onClick={handleBatchEdit}
					disabled={processingState === 'loading' || !selectedPreset}
				>
					Retoucher les {photos.length} photos
				</Button>
			)}
		</div>
	)
}
