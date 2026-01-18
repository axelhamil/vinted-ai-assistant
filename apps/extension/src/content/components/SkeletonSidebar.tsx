/**
 * Skeleton Sidebar component displayed during analysis loading
 * Provides visual feedback with animated placeholder elements
 */
export function SkeletonSidebar({ isOpen }: { isOpen: boolean }) {
	if (!isOpen) {
		return null
	}

	return (
		<aside
			className="fixed top-0 right-0 w-96 h-full bg-white shadow-2xl border-l border-gray-200 z-[2147483647] flex flex-col"
			style={{ zIndex: 2147483647 }}
			aria-label="Chargement de l'analyse"
			aria-busy="true"
		>
			{/* Header Skeleton */}
			<div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
				<div className="flex items-center justify-between mb-3">
					<div className="h-6 w-24 bg-white/30 rounded animate-pulse" />
					<div className="h-8 w-8 bg-white/20 rounded-full animate-pulse" />
				</div>

				{/* Score Header Skeleton */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-16 h-16 rounded-full bg-white/30 animate-pulse" />
						<div className="space-y-2">
							<div className="h-3 w-24 bg-white/30 rounded animate-pulse" />
							<div className="h-4 w-32 bg-white/30 rounded animate-pulse" />
						</div>
					</div>
					<div className="h-6 w-20 bg-white/20 rounded animate-pulse" />
				</div>
			</div>

			{/* Content Skeleton */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{/* Article Info Skeleton */}
				<div className="bg-gray-50 rounded-lg p-3">
					<div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
					<div className="flex items-center gap-2">
						<div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse" />
						<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
					</div>
				</div>

				{/* Section Skeletons */}
				<SkeletonSection key="skeleton-section-1" />
				<SkeletonSection key="skeleton-section-2" />
				<SkeletonSection key="skeleton-section-3" />
				<SkeletonSection key="skeleton-section-4" />
				<SkeletonSection key="skeleton-section-5" />
			</div>

			{/* Footer Skeleton */}
			<div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 space-y-2">
				<div className="flex gap-2">
					<div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
					<div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
				</div>
				<div className="flex gap-2">
					<div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
					<div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
				</div>
				<div className="h-3 w-32 bg-gray-200 rounded animate-pulse mx-auto mt-2" />
			</div>
		</aside>
	)
}

/**
 * Individual section skeleton
 */
function SkeletonSection() {
	return (
		<div className="border-b border-gray-100 pb-4">
			{/* Section title */}
			<div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3" />

			{/* Section content lines */}
			<div className="space-y-2">
				<div className="flex justify-between">
					<div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
					<div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
				</div>
				<div className="flex justify-between">
					<div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
					<div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
				</div>
				<div className="h-16 w-full bg-gray-100 rounded-lg animate-pulse mt-2" />
			</div>
		</div>
	)
}
