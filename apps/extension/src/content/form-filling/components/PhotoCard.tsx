/**
 * Photo card component for the photo grid
 */

interface PhotoCardProps {
	photoId: string
	originalDataUrl: string
	filename: string
	isSelected: boolean
	isProcessing: boolean
	hasEdited: boolean
	onSelect: () => void
	onRemove: () => void
}

export function PhotoCard({
	photoId,
	originalDataUrl,
	filename,
	isSelected,
	isProcessing,
	hasEdited,
	onSelect,
	onRemove,
}: PhotoCardProps) {
	return (
		<div
			key={photoId}
			className={`group relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
				isSelected ? 'border-brand ring-2 ring-brand/20' : 'border-border hover:border-brand/50'
			}`}
			onClick={onSelect}
			onKeyDown={(e) => e.key === 'Enter' && onSelect()}
		>
			<img src={originalDataUrl} alt={filename} className="w-full h-full object-cover" />
			{/* Processing overlay */}
			{isProcessing && (
				<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
					<div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
				</div>
			)}
			{/* Edited badge */}
			{hasEdited && !isProcessing && (
				<div className="absolute top-1 right-1 w-5 h-5 bg-profit rounded-full flex items-center justify-center">
					<svg
						aria-hidden="true"
						className="w-3 h-3 text-white"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
					</svg>
				</div>
			)}
			{/* Remove button */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation()
					onRemove()
				}}
				className="absolute top-1 left-1 w-5 h-5 bg-black/50 hover:bg-danger rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
				style={{ opacity: isSelected ? 1 : undefined }}
			>
				<svg
					aria-hidden="true"
					className="w-3 h-3 text-white"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
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
