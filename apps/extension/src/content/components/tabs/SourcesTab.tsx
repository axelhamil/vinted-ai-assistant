import type { MarketPriceSource } from '@vinted-ai/shared/analysis'
import { Card } from '../primitives/Card'

interface SourcesTabProps {
	sources: MarketPriceSource[]
}

/**
 * Google icon component
 */
function GoogleIcon() {
	return (
		<svg className="w-6 h-6" viewBox="0 0 24 24">
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
			/>
		</svg>
	)
}

/**
 * Empty state when no sources are available
 */
function EmptyState({ message }: { message: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<div className="w-16 h-16 rounded-full bg-surface-tertiary flex items-center justify-center mb-4">
				<svg className="w-8 h-8 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</div>
			<p className="text-xl text-content-secondary">{message}</p>
			<p className="text-lg text-content-muted mt-2">
				Les sources seront affichées lors de la prochaine analyse avec recherche Google.
			</p>
		</div>
	)
}

/**
 * Source card component displaying a single source
 */
function SourceCard({ source }: { source: MarketPriceSource }) {
	return (
		<Card>
			{/* Header */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-3">
					<GoogleIcon />
					<span className="text-xl font-medium text-content-primary">{source.name}</span>
				</div>
				<span className="text-2xl font-bold text-brand">{source.price}€</span>
			</div>

			{/* Search Query */}
			{source.searchQuery && (
				<div className="flex items-center gap-2 text-lg text-content-secondary mb-3 p-2 rounded-lg bg-surface-secondary">
					<svg className="w-5 h-5 text-content-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
					<span className="truncate">"{source.searchQuery}"</span>
				</div>
			)}

			{/* Price Range */}
			{source.priceRange && (
				<div className="flex items-center justify-between text-lg mb-3 p-2 rounded-lg bg-surface-secondary">
					<span className="text-content-secondary">Fourchette de prix</span>
					<span className="font-medium text-content-primary">
						{source.priceRange.min}€ — {source.priceRange.max}€
					</span>
				</div>
			)}

			{/* Article count */}
			{source.count !== undefined && source.count > 0 && (
				<div className="flex items-center gap-2 text-lg text-content-secondary">
					<svg className="w-5 h-5 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
					</svg>
					<span>{source.count} articles trouvés</span>
				</div>
			)}

			{/* Listings */}
			{source.listings && source.listings.length > 0 && (
				<div className="mt-4 space-y-2">
					<h5 className="text-lg text-content-muted mb-2">Exemples trouvés:</h5>
					{source.listings.slice(0, 3).map((listing, i) => (
						<a
							key={`${listing.url}-${i}`}
							href={listing.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary hover:bg-surface-tertiary transition-colors group"
						>
							{listing.imageUrl && (
								<img
									src={listing.imageUrl}
									alt={listing.title}
									className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-border"
								/>
							)}
							<div className="flex-1 min-w-0">
								<div className="text-lg text-content-primary truncate group-hover:text-brand transition-colors">
									{listing.title}
								</div>
								<div className="text-xl font-semibold text-profit">{listing.price}€</div>
							</div>
							<svg className="w-5 h-5 text-content-muted group-hover:text-brand transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
							</svg>
						</a>
					))}
				</div>
			)}

			{/* URL link if available */}
			{source.url && (
				<a
					href={source.url}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-brand/10 border border-brand/20 text-brand hover:bg-brand/20 transition-colors"
				>
					<span className="text-lg font-medium">Voir la source</span>
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
				</a>
			)}
		</Card>
	)
}

/**
 * Sources tab displaying all sources used for market price estimation
 */
export function SourcesTab({ sources }: SourcesTabProps) {
	// Handle undefined or empty sources
	const sourcesArray = sources ?? []

	return (
		<div className="space-y-4 animate-fade-in">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h3 className="text-2xl font-semibold text-content-primary">
					Sources de l'estimation
				</h3>
				{sourcesArray.length > 0 && (
					<span className="text-lg text-content-muted">
						{sourcesArray.length} source{sourcesArray.length > 1 ? 's' : ''}
					</span>
				)}
			</div>

			{/* Info banner */}
			<div className="p-4 rounded-xl bg-info/10 border border-info/20">
				<div className="flex items-start gap-3">
					<svg className="w-6 h-6 text-info flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
						<path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
					</svg>
					<div>
						<p className="text-lg text-info font-medium mb-1">Sources Google Search</p>
						<p className="text-base text-content-secondary">
							Ces sources sont utilisées par l'IA pour estimer le prix marché de l'article.
							Les prix sont basés sur des articles similaires trouvés en ligne.
						</p>
					</div>
				</div>
			</div>

			{/* Sources list */}
			{sourcesArray.length === 0 ? (
				<EmptyState message="Aucune source disponible" />
			) : (
				<div className="space-y-4">
					{sourcesArray.map((source, idx) => (
						<SourceCard key={`${source.name}-${idx}`} source={source} />
					))}
				</div>
			)}
		</div>
	)
}
