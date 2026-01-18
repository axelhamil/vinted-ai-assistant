interface ArticleContextProps {
	title: string
	price: number
	brand: string | null
	imageUrl?: string
}

/**
 * Compact article context bar showing item details - light theme
 */
export function ArticleContext({ title, price, brand, imageUrl }: ArticleContextProps) {
	return (
		<section className="px-6 py-4 flex items-center gap-4 bg-surface-secondary border-b border-border">
			{/* Article thumbnail */}
			{imageUrl ? (
				<img
					src={imageUrl}
					alt={title}
					className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-border"
				/>
			) : (
				<div className="w-14 h-14 rounded-lg bg-surface-tertiary flex-shrink-0 flex items-center justify-center border border-border">
					<svg className="w-7 h-7 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
					</svg>
				</div>
			)}

			{/* Article info */}
			<div className="flex-1 min-w-0">
				<h3 className="text-2xl font-medium text-content-primary truncate" title={title}>
					{title}
				</h3>
				<div className="flex items-center gap-2 mt-1">
					<span className="text-2xl font-semibold text-brand">{price}€</span>
					{brand && (
						<>
							<span className="text-content-muted">•</span>
							<span className="text-xl text-content-secondary">{brand}</span>
						</>
					)}
				</div>
			</div>
		</section>
	)
}
