import { useState, useCallback, useEffect } from 'react'
import { Card } from '../primitives/Card'

interface PhotoGalleryCardProps {
	photos: string[]
}

/**
 * Camera icon component
 */
function CameraIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
	)
}

/**
 * Close icon component
 */
function CloseIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
		</svg>
	)
}

/**
 * Chevron icon component
 */
function ChevronIcon({ direction, className }: { direction: 'left' | 'right'; className?: string }) {
	return (
		<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
			{direction === 'left' ? (
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
			) : (
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
			)}
		</svg>
	)
}

/**
 * Lightbox component for full-screen photo viewing
 */
function Lightbox({
	photos,
	currentIndex,
	onClose,
	onPrev,
	onNext,
}: {
	photos: string[]
	currentIndex: number
	onClose: () => void
	onPrev: () => void
	onNext: () => void
}) {
	// Handle keyboard navigation
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
			if (e.key === 'ArrowLeft') onPrev()
			if (e.key === 'ArrowRight') onNext()
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [onClose, onPrev, onNext])

	// Prevent body scroll when lightbox is open
	useEffect(() => {
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = ''
		}
	}, [])

	return (
		<div
			className="fixed inset-0 z-[2147483647] bg-black/95 backdrop-blur-sm flex items-center justify-center"
			onClick={onClose}
		>
			{/* Close button */}
			<button
				onClick={onClose}
				className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
				aria-label="Fermer"
			>
				<CloseIcon className="w-6 h-6 text-white" />
			</button>

			{/* Photo counter */}
			<div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/10 text-white text-base font-medium">
				{currentIndex + 1} / {photos.length}
			</div>

			{/* Previous button */}
			{photos.length > 1 && (
				<button
					onClick={(e) => {
						e.stopPropagation()
						onPrev()
					}}
					className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
					aria-label="Photo précédente"
				>
					<ChevronIcon direction="left" className="w-6 h-6 text-white" />
				</button>
			)}

			{/* Main image */}
			<div
				className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
				onClick={(e) => e.stopPropagation()}
			>
				<img
					src={photos[currentIndex]}
					alt={`Photo ${currentIndex + 1}`}
					className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
				/>
			</div>

			{/* Next button */}
			{photos.length > 1 && (
				<button
					onClick={(e) => {
						e.stopPropagation()
						onNext()
					}}
					className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
					aria-label="Photo suivante"
				>
					<ChevronIcon direction="right" className="w-6 h-6 text-white" />
				</button>
			)}

			{/* Thumbnail strip at the bottom */}
			{photos.length > 1 && (
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-lg bg-white/10 backdrop-blur-sm">
					{photos.map((photo, index) => (
						<button
							key={photo}
							onClick={(e) => {
								e.stopPropagation()
								// Navigate to this photo
								const diff = index - currentIndex
								if (diff > 0) {
									for (let i = 0; i < diff; i++) onNext()
								} else {
									for (let i = 0; i < -diff; i++) onPrev()
								}
							}}
							className={`w-12 h-12 rounded overflow-hidden transition-all ${
								index === currentIndex
									? 'ring-2 ring-white scale-110'
									: 'opacity-60 hover:opacity-100'
							}`}
						>
							<img
								src={photo}
								alt={`Miniature ${index + 1}`}
								className="w-full h-full object-cover"
							/>
						</button>
					))}
				</div>
			)}
		</div>
	)
}

/**
 * Card displaying article photos with lightbox functionality
 */
export function PhotoGalleryCard({ photos }: PhotoGalleryCardProps) {
	const [lightboxOpen, setLightboxOpen] = useState(false)
	const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

	const maxThumbnails = 4
	const visiblePhotos = photos.slice(0, maxThumbnails)
	const remainingCount = photos.length - maxThumbnails

	const openLightbox = useCallback((index: number) => {
		setCurrentPhotoIndex(index)
		setLightboxOpen(true)
	}, [])

	const closeLightbox = useCallback(() => {
		setLightboxOpen(false)
	}, [])

	const goToPrev = useCallback(() => {
		setCurrentPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
	}, [photos.length])

	const goToNext = useCallback(() => {
		setCurrentPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
	}, [photos.length])

	if (photos.length === 0) {
		return null
	}

	return (
		<>
			<Card
				title="Photos Article"
				icon={<CameraIcon className="w-4 h-4" />}
			>
				<div className="space-y-3">
					{/* Photo grid */}
					<div className="flex gap-2">
						{visiblePhotos.map((photo, index) => (
							<button
								key={photo}
								onClick={() => openLightbox(index)}
								className="relative flex-1 aspect-square rounded-lg overflow-hidden group cursor-pointer border border-white/10 hover:border-white/20 transition-all"
							>
								<img
									src={photo}
									alt={`Photo ${index + 1}`}
									className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
								/>
								{/* Hover overlay */}
								<div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
									<svg
										className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
									</svg>
								</div>
							</button>
						))}

						{/* "+X" button for remaining photos */}
						{remainingCount > 0 && (
							<button
								onClick={() => openLightbox(maxThumbnails)}
								className="flex-1 aspect-square rounded-lg bg-white/[0.05] border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all flex items-center justify-center cursor-pointer"
							>
								<span className="text-xl font-semibold text-white/70">
									+{remainingCount}
								</span>
							</button>
						)}
					</div>

					{/* Helper text */}
					<div className="flex items-center gap-2 text-sm text-white/40">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Cliquez pour agrandir • {photos.length} photo{photos.length > 1 ? 's' : ''}</span>
					</div>
				</div>
			</Card>

			{/* Lightbox modal */}
			{lightboxOpen && (
				<Lightbox
					photos={photos}
					currentIndex={currentPhotoIndex}
					onClose={closeLightbox}
					onPrev={goToPrev}
					onNext={goToNext}
				/>
			)}
		</>
	)
}
