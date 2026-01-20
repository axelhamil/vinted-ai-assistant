/**
 * Lightbox modal for viewing photos in full size
 */

interface LightboxProps {
	photoUrl: string
	onClose: () => void
}

export function Lightbox({ photoUrl, onClose }: LightboxProps) {
	return (
		<dialog
			open
			className="fixed inset-0 z-[999999] bg-black/90 flex items-center justify-center p-8 m-0 border-none max-w-none max-h-none w-screen h-screen"
			onClick={onClose}
			onKeyDown={(e) => e.key === 'Escape' && onClose()}
		>
			<button
				type="button"
				onClick={onClose}
				className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center"
			>
				<svg
					aria-hidden="true"
					className="w-8 h-8 text-white"
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
			<img
				src={photoUrl}
				alt="Aperçu retouché"
				className="max-w-full max-h-full object-contain rounded-lg"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			/>
		</dialog>
	)
}
