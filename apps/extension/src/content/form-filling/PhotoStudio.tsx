/**
 * Photo Studio component for the listing creation page
 * Allows users to import, edit with NanoBanana presets, and drag & drop photos to Vinted
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
	StudioPreset,
	StudioEditedPhotoResponse,
	StudioBatchEditResponse,
} from '../../background/message-types'
import { VINTED_AI_PHOTO_TYPE, injectFilesIntoVintedUpload, type VintedAIPhotoData } from './vinted-drop-handler'
import { fileToDataUrl, dataUrlToFile } from './utils/data-url-to-file'

type ProcessingState = 'idle' | 'loading' | 'success' | 'error'

interface ImportedPhoto {
	id: string
	originalDataUrl: string
	editedDataUrl: string | null
	filename: string
	isProcessing: boolean
}

interface PhotoStudioProps {
	onPhotosChange?: (photos: string[]) => void
}

/**
 * Photo Studio for editing and transferring photos to Vinted
 */
export function PhotoStudio({ onPhotosChange }: PhotoStudioProps) {
	const [photos, setPhotos] = useState<ImportedPhoto[]>([])
	const [presets, setPresets] = useState<StudioPreset[]>([])
	const [selectedPreset, setSelectedPreset] = useState<StudioPreset | null>(null)
	const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
	const [processingState, setProcessingState] = useState<ProcessingState>('idle')
	const [error, setError] = useState<string | null>(null)
	const [presetsLoaded, setPresetsLoaded] = useState(false)
	const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)

	const fileInputRef = useRef<HTMLInputElement>(null)

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

	useEffect(() => {
		loadPresets()
	}, [loadPresets])

	// Notify parent when photos change
	useEffect(() => {
		const photoUrls = photos.map((p) => p.editedDataUrl || p.originalDataUrl)
		onPhotosChange?.(photoUrls)
	}, [photos, onPhotosChange])

	// Handle file selection
	const handleFileSelect = useCallback(async (files: FileList | null) => {
		if (!files || files.length === 0) return

		const newPhotos: ImportedPhoto[] = []

		for (const file of Array.from(files)) {
			if (!file.type.startsWith('image/')) continue

			try {
				const dataUrl = await fileToDataUrl(file)
				newPhotos.push({
					id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					originalDataUrl: dataUrl,
					editedDataUrl: null,
					filename: file.name,
					isProcessing: false,
				})
			} catch (err) {
				console.error('Failed to read file:', err)
			}
		}

		setPhotos((prev) => [...prev, ...newPhotos])

		// Select first photo if none selected
		if (!selectedPhotoId && newPhotos.length > 0 && newPhotos[0]) {
			setSelectedPhotoId(newPhotos[0].id)
		}
	}, [selectedPhotoId])

	// Handle drop on import zone
	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		handleFileSelect(e.dataTransfer.files)
	}, [handleFileSelect])

	// Edit single photo
	const handleEditPhoto = useCallback(async (photoId: string) => {
		if (!selectedPreset) return

		const photo = photos.find((p) => p.id === photoId)
		if (!photo) return

		setPhotos((prev) =>
			prev.map((p) => (p.id === photoId ? { ...p, isProcessing: true } : p))
		)
		setError(null)

		try {
			const response: { success: boolean; data?: StudioEditedPhotoResponse; error?: string } =
				await chrome.runtime.sendMessage({
					type: 'STUDIO_EDIT_PHOTO',
					image: photo.originalDataUrl,
					presetId: selectedPreset.id,
					stripMetadata: true,
				})

			if (response.success && response.data) {
				setPhotos((prev) =>
					prev.map((p) =>
						p.id === photoId
							? { ...p, editedDataUrl: response.data!.dataUrl, isProcessing: false }
							: p
					)
				)
			} else {
				throw new Error(response.error || 'Failed to edit photo')
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to edit photo')
			setPhotos((prev) =>
				prev.map((p) => (p.id === photoId ? { ...p, isProcessing: false } : p))
			)
		}
	}, [photos, selectedPreset])

	// Edit all photos
	const handleEditAll = useCallback(async () => {
		if (!selectedPreset || photos.length === 0) return

		setProcessingState('loading')
		setError(null)

		// Mark all as processing
		setPhotos((prev) => prev.map((p) => ({ ...p, isProcessing: true })))

		try {
			const images = photos.map((p) => p.originalDataUrl)
			const response: { success: boolean; data?: StudioBatchEditResponse; error?: string } =
				await chrome.runtime.sendMessage({
					type: 'STUDIO_EDIT_PHOTO_BATCH',
					images,
					presetId: selectedPreset.id,
					stripMetadata: true,
				})

			if (response.success && response.data) {
				setPhotos((prev) =>
					prev.map((photo, index) => {
						const result = response.data!.results[index]
						return {
							...photo,
							editedDataUrl: result?.success ? (result.dataUrl || null) : null,
							isProcessing: false,
						}
					})
				)
				setProcessingState('success')
			} else {
				throw new Error(response.error || 'Failed to edit photos')
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to edit photos')
			setPhotos((prev) => prev.map((p) => ({ ...p, isProcessing: false })))
			setProcessingState('error')
		}
	}, [photos, selectedPreset])

	// Handle drag start for edited photo
	const handlePhotoDragStart = useCallback((e: React.DragEvent, photo: ImportedPhoto) => {
		const dataUrl = photo.editedDataUrl || photo.originalDataUrl
		const photoData: VintedAIPhotoData = {
			dataUrl,
			filename: `studio-${Date.now()}.png`,
		}

		e.dataTransfer.setData(VINTED_AI_PHOTO_TYPE, JSON.stringify(photoData))
		e.dataTransfer.setData('text/uri-list', dataUrl)
		e.dataTransfer.effectAllowed = 'copy'

		// Create drag image
		const img = new Image()
		img.src = dataUrl
		e.dataTransfer.setDragImage(img, 50, 50)
	}, [])

	// Transfer all edited photos to Vinted
	const handleTransferAll = useCallback(() => {
		const editedPhotos = photos.filter((p) => p.editedDataUrl)
		if (editedPhotos.length === 0) return

		const files = editedPhotos.map((p) =>
			dataUrlToFile(
				p.editedDataUrl!,
				`studio-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.png`
			)
		)

		const success = injectFilesIntoVintedUpload(files)
		if (success) {
			// Clear the studio after successful transfer
			setPhotos([])
			setSelectedPhotoId(null)
		}
	}, [photos])

	// Remove photo
	const handleRemovePhoto = useCallback((photoId: string) => {
		setPhotos((prev) => prev.filter((p) => p.id !== photoId))
		if (selectedPhotoId === photoId) {
			setSelectedPhotoId(photos.find((p) => p.id !== photoId)?.id || null)
		}
	}, [photos, selectedPhotoId])

	const selectedPhoto = photos.find((p) => p.id === selectedPhotoId)
	const editedCount = photos.filter((p) => p.editedDataUrl).length
	const isAnyProcessing = photos.some((p) => p.isProcessing)

	return (
		<div className="space-y-5">
			{/* Import Zone */}
			<div
				onDrop={handleDrop}
				onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
				onClick={() => fileInputRef.current?.click()}
				className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-brand hover:bg-brand/5 transition-all"
			>
				<input
					ref={fileInputRef}
					type="file"
					accept="image/*"
					multiple
					onChange={(e) => handleFileSelect(e.target.files)}
					className="hidden"
				/>
				<svg className="w-12 h-12 mx-auto mb-4 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
				<p className="text-lg font-medium text-content-primary">Importer des photos</p>
				<p className="text-base text-content-secondary mt-2">Glissez vos photos ici ou cliquez pour sélectionner</p>
			</div>

			{/* Photo Grid */}
			{photos.length > 0 && (
				<div>
					<div className="flex items-center justify-between mb-3">
						<span className="text-base font-medium text-content-secondary">
							{photos.length} photo{photos.length > 1 ? 's' : ''} importée{photos.length > 1 ? 's' : ''}
						</span>
						{photos.length > 0 && (
							<button
								type="button"
								onClick={() => { setPhotos([]); setSelectedPhotoId(null) }}
								className="text-base text-content-secondary hover:text-danger transition-colors"
							>
								Tout supprimer
							</button>
						)}
					</div>
					<div className="grid grid-cols-4 gap-3">
						{photos.map((photo) => (
							<div
								key={photo.id}
								className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
									selectedPhotoId === photo.id
										? 'border-brand ring-2 ring-brand/20'
										: 'border-border hover:border-brand/50'
								}`}
								onClick={() => setSelectedPhotoId(photo.id)}
							>
								<img
									src={photo.originalDataUrl}
									alt={photo.filename}
									className="w-full h-full object-cover"
								/>
								{/* Processing overlay */}
								{photo.isProcessing && (
									<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
										<div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
									</div>
								)}
								{/* Edited badge */}
								{photo.editedDataUrl && !photo.isProcessing && (
									<div className="absolute top-1 right-1 w-5 h-5 bg-profit rounded-full flex items-center justify-center">
										<svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
										</svg>
									</div>
								)}
								{/* Remove button */}
								<button
									type="button"
									onClick={(e) => { e.stopPropagation(); handleRemovePhoto(photo.id) }}
									className="absolute top-1 left-1 w-5 h-5 bg-black/50 hover:bg-danger rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
									style={{ opacity: selectedPhotoId === photo.id ? 1 : undefined }}
								>
									<svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Preset Selection */}
			{photos.length > 0 && (
				<div>
					<span className="text-base font-medium text-content-secondary block mb-3">Style de retouche</span>
					<div className="grid grid-cols-2 gap-3">
						{presets.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => setSelectedPreset(preset)}
								className={`p-3 rounded-lg border text-left transition-all ${
									selectedPreset?.id === preset.id
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
			)}

			{/* Preview / Comparison */}
			{selectedPhoto && (
				<div>
					<span className="text-base font-medium text-content-secondary block mb-3">
						{selectedPhoto.editedDataUrl ? 'Avant / Après' : 'Aperçu'}
					</span>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<span className="text-base text-content-secondary">Original</span>
							<div className="aspect-square rounded-lg overflow-hidden border border-border">
								<img src={selectedPhoto.originalDataUrl} alt="Original" className="w-full h-full object-cover" />
							</div>
						</div>
						<div className="space-y-2">
							<span className="text-base text-content-secondary">Résultat</span>
							<div className="aspect-square rounded-lg overflow-hidden border border-border bg-surface-secondary flex items-center justify-center">
								{selectedPhoto.isProcessing ? (
									<div className="flex flex-col items-center">
										<div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
										<span className="text-base text-content-secondary mt-3">Retouche...</span>
									</div>
								) : selectedPhoto.editedDataUrl ? (
									<img src={selectedPhoto.editedDataUrl} alt="Edited" className="w-full h-full object-cover" />
								) : (
									<span className="text-base text-content-secondary text-center px-3">Cliquez sur Retoucher</span>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Error Display */}
			{error && (
				<div className="p-4 bg-red-50 rounded-lg border border-red-200">
					<p className="text-base text-red-600">{error}</p>
				</div>
			)}

			{/* Action Buttons */}
			{photos.length > 0 && (
				<div className="space-y-3">
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => selectedPhotoId && handleEditPhoto(selectedPhotoId)}
							disabled={!selectedPhoto || selectedPhoto.isProcessing || !selectedPreset}
							className="flex-1 py-3 px-5 bg-gradient-to-r from-brand to-brand-dark text-white text-base font-medium rounded-xl hover:from-brand-dark hover:to-brand-darker disabled:opacity-50 disabled:cursor-not-allowed transition-all"
						>
							Retoucher
						</button>
						{photos.length > 1 && (
							<button
								type="button"
								onClick={handleEditAll}
								disabled={isAnyProcessing || !selectedPreset}
								className="flex-1 py-3 px-5 bg-white border border-border text-content-primary text-base font-medium rounded-xl hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							>
								Tout retoucher
							</button>
						)}
					</div>
				</div>
			)}

			{/* Draggable Photos Section */}
			{editedCount > 0 && (
				<div className="pt-4 border-t border-border">
					<div className="flex items-center justify-between mb-3">
						<span className="text-base font-medium text-content-secondary">
							Photos prêtes ({editedCount})
						</span>
						<button
							type="button"
							onClick={handleTransferAll}
							className="text-base text-brand hover:text-brand-dark font-medium transition-colors"
						>
							Tout transférer
						</button>
					</div>
					<p className="text-base text-content-secondary mb-3">
						Glissez vers la zone d'upload Vinted
					</p>
					<div className="flex gap-3 flex-wrap">
						{photos.filter((p) => p.editedDataUrl).map((photo) => (
							<div
								key={photo.id}
								draggable
								onDragStart={(e) => handlePhotoDragStart(e, photo)}
								onClick={() => setLightboxPhoto(photo.editedDataUrl)}
								className="w-24 h-24 rounded-lg overflow-hidden border-2 border-profit cursor-grab active:cursor-grabbing hover:scale-105 transition-transform shadow-sm"
								title="Cliquez pour agrandir, glissez vers Vinted"
							>
								<img
									src={photo.editedDataUrl!}
									alt="Ready"
									className="w-full h-full object-cover pointer-events-none"
								/>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Empty State */}
			{photos.length === 0 && (
				<div className="text-center py-6">
					<p className="text-lg text-content-secondary">
						Importez des photos pour commencer la retouche
					</p>
				</div>
			)}

			{/* Lightbox Modal */}
			{lightboxPhoto && (
				<div
					className="fixed inset-0 z-[999999] bg-black/90 flex items-center justify-center p-8"
					onClick={() => setLightboxPhoto(null)}
				>
					<button
						type="button"
						onClick={() => setLightboxPhoto(null)}
						className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center"
					>
						<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
					<img
						src={lightboxPhoto}
						alt="Photo retouchée"
						className="max-w-full max-h-full object-contain rounded-lg"
						onClick={(e) => e.stopPropagation()}
					/>
				</div>
			)}
		</div>
	)
}
