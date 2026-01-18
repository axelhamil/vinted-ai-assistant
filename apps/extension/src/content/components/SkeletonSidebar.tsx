interface SkeletonSidebarProps {
	isOpen: boolean
	loadingMessage?: string
}

/**
 * Skeleton Sidebar component displayed during analysis loading
 * Light theme with shimmer animation and orange accent
 */
export function SkeletonSidebar({ isOpen, loadingMessage = 'Analyse en cours...' }: SkeletonSidebarProps) {
	if (!isOpen) {
		return null
	}

	return (
		<aside
			className="fixed top-0 right-0 w-96 h-full bg-white shadow-sidebar flex flex-col z-[2147483647] animate-slide-in overflow-hidden"
			style={{ zIndex: 2147483647 }}
			aria-label="Chargement de l'analyse"
			aria-busy="true"
		>
			{/* Orange accent bar at top */}
			<div className="h-1 w-full bg-gradient-to-r from-brand to-brand-dark flex-shrink-0" />

			{/* Header with loading status */}
			<div className="flex-shrink-0 h-[72px] px-5 flex items-center justify-between bg-white border-b border-border">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
						<div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
					</div>
					<div>
						<span className="text-base font-semibold text-content-primary">Vinted</span>
						<span className="text-base font-semibold text-brand">AI</span>
					</div>
				</div>
				<div className="w-10 h-10 rounded-lg shimmer" />
			</div>

			{/* Loading Status Banner */}
			<div className="px-5 py-4 bg-brand/5 border-b border-brand/10">
				<div className="flex items-center gap-3">
					<div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
					<div className="flex-1">
						<p className="text-base font-medium text-content-primary">{loadingMessage}</p>
						<p className="text-sm text-content-secondary mt-0.5">Un seul appel IA optimisé</p>
					</div>
				</div>
			</div>

			{/* Hero Score Skeleton */}
			<div className="py-6 px-5 flex flex-col items-center gap-4 border-b border-border bg-white">
				{/* Score ring placeholder */}
				<div className="w-[140px] h-[140px] rounded-full shimmer" />
				{/* Label placeholder */}
				<div className="h-6 w-48 rounded shimmer" />
				{/* Badges row */}
				<div className="flex items-center gap-3">
					<div className="h-7 w-32 rounded-full shimmer" />
					<div className="h-7 w-16 rounded-full shimmer" />
				</div>
			</div>

			{/* Article Context Skeleton */}
			<div className="px-5 py-3 flex items-center gap-3 bg-surface-secondary border-b border-border">
				<div className="w-12 h-12 rounded-lg shimmer flex-shrink-0" />
				<div className="flex-1 space-y-2">
					<div className="h-4 w-3/4 rounded shimmer" />
					<div className="h-3 w-1/2 rounded shimmer" />
				</div>
			</div>

			{/* Tab Navigation Skeleton */}
			<div className="px-5 py-2 border-b border-border bg-white">
				<div className="flex gap-4">
					<div className="flex-1 h-10 rounded shimmer" />
					<div className="flex-1 h-10 rounded shimmer" />
					<div className="flex-1 h-10 rounded shimmer" />
				</div>
			</div>

			{/* Content Skeleton */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-secondary">
				{/* Card skeletons */}
				<SkeletonCard />
				<SkeletonCard />
				<SkeletonCard />
				<SkeletonCard />
			</div>

			{/* Footer Skeleton */}
			<div className="flex-shrink-0 px-5 py-4 bg-white border-t border-border space-y-4">
				<div className="flex items-center justify-between">
					<div className="h-4 w-12 rounded shimmer" />
					<div className="h-4 w-20 rounded shimmer" />
				</div>
				<div className="flex gap-2">
					<div className="flex-1 h-9 rounded-lg shimmer" />
					<div className="flex-1 h-9 rounded-lg shimmer" />
				</div>
				<div className="flex gap-2">
					<div className="flex-1 h-9 rounded-lg shimmer" />
					<div className="w-10 h-9 rounded-lg shimmer" />
				</div>
				<div className="h-3 w-40 rounded shimmer mx-auto" />
			</div>
		</aside>
	)
}

/**
 * Individual card skeleton with light theme
 */
function SkeletonCard() {
	return (
		<div className="p-4 rounded-xl bg-white border border-border shadow-card">
			{/* Card title */}
			<div className="flex items-center gap-2.5 mb-4">
				<div className="w-8 h-8 rounded-lg shimmer" />
				<div className="h-4 w-28 rounded shimmer" />
			</div>

			{/* Card content */}
			<div className="space-y-3">
				<div className="flex justify-between">
					<div className="h-8 w-24 rounded shimmer" />
					<div className="h-6 w-16 rounded shimmer" />
				</div>
				<div className="h-2 w-full rounded-full shimmer" />
				<div className="flex justify-between pt-2">
					<div className="h-4 w-20 rounded shimmer" />
					<div className="h-4 w-20 rounded shimmer" />
				</div>
			</div>
		</div>
	)
}
