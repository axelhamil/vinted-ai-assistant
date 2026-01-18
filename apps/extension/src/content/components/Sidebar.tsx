import type { AnalysisResult, AnalysisStatus, VintedSeller } from '@vinted-ai/shared'
import { useCallback, useState, useEffect } from 'react'
import { SidebarHeader, HeroScore, ArticleContext, TabNavigation, ActionBar, type TabId } from './sidebar-components'
import { InsightTab, NegotiateTab, ResellTab, SourcesTab } from './tabs'

interface SidebarProps {
	analysis: AnalysisResult
	isOpen: boolean
	onClose: () => void
	onUpdateStatus: (status: AnalysisStatus) => Promise<void>
	onExport: () => Promise<void>
	onRefresh: () => Promise<void>
	cacheInfo?: { fromCache: boolean; timeRemaining: number } | null
	isRefreshing?: boolean
	analyzedTimeAgo?: string | null
	photos?: string[]
	seller?: VintedSeller
}

/**
 * Extract article image from page
 */
function getArticleImage(): string | undefined {
	const selectors = [
		'section.item-photos__container img.web_ui__Image__content',
		'.item-photos .item-photo img.web_ui__Image__content',
		'[data-testid^="item-photo-"] img',
		'.item-photos img',
	]

	for (const selector of selectors) {
		const img = document.querySelector<HTMLImageElement>(selector)
		if (img?.src) {
			return img.src
		}
	}

	return undefined
}

/**
 * Premium light sidebar component displaying the full analysis details
 * Features:
 * - Light theme with white background
 * - Orange accent with gradient top bar
 * - Animated score ring
 * - Tab-based navigation (Insight, Negotiate, Resell)
 * - Slide-in animation
 */
export function Sidebar({
	analysis,
	isOpen,
	onClose,
	onUpdateStatus,
	onExport,
	onRefresh,
	cacheInfo,
	isRefreshing = false,
	analyzedTimeAgo,
	photos = [],
	seller,
}: SidebarProps) {
	const [isExporting, setIsExporting] = useState(false)
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
	const [activeTab, setActiveTab] = useState<TabId>('insight')
	const [articleImage, setArticleImage] = useState<string | undefined>(undefined)

	// Get article image on mount
	useEffect(() => {
		if (isOpen) {
			setArticleImage(getArticleImage())
		}
	}, [isOpen])

	const handleExport = useCallback(async () => {
		setIsExporting(true)
		try {
			await onExport()
		} finally {
			setIsExporting(false)
		}
	}, [onExport])

	const handleStatusUpdate = useCallback(
		async (status: AnalysisStatus) => {
			setIsUpdatingStatus(true)
			try {
				await onUpdateStatus(status)
			} finally {
				setIsUpdatingStatus(false)
			}
		},
		[onUpdateStatus]
	)

	if (!isOpen) {
		return null
	}

	const { opportunity, marketPrice } = analysis

	return (
		<aside
			className="fixed top-0 right-0 w-[480px] h-full bg-white shadow-sidebar flex flex-col z-[2147483647] animate-slide-in overflow-hidden"
			style={{ zIndex: 2147483647 }}
			aria-label="Analyse détaillée"
		>
			{/* Orange accent bar at top */}
			<div className="h-1 w-full bg-gradient-to-r from-brand to-brand-dark flex-shrink-0" />

			{/* Header */}
			<SidebarHeader onClose={onClose} />

			{/* Hero Score */}
			<HeroScore
				score={opportunity.score}
				confidence={marketPrice.confidence}
				marginPercent={opportunity.marginPercent}
			/>

			{/* Article Context */}
			<ArticleContext
				title={analysis.title}
				price={analysis.price}
				brand={analysis.brand}
				imageUrl={articleImage}
			/>

			{/* Tab Navigation */}
			<TabNavigation activeTab={activeTab} onChange={setActiveTab} />

			{/* Scrollable Tab Content */}
			<div className="flex-1 overflow-y-auto p-5 light-scrollbar bg-surface-secondary">
				{activeTab === 'insight' && <InsightTab analysis={analysis} photos={photos} seller={seller} />}
				{activeTab === 'negotiate' && <NegotiateTab analysis={analysis} />}
				{activeTab === 'resell' && <ResellTab analysis={analysis} />}
				{activeTab === 'sources' && <SourcesTab sources={analysis.marketPrice.sources} />}
			</div>

			{/* Action Bar */}
			<ActionBar
				status={analysis.status}
				onUpdateStatus={handleStatusUpdate}
				onExport={handleExport}
				onRefresh={onRefresh}
				isUpdatingStatus={isUpdatingStatus}
				isExporting={isExporting}
				isRefreshing={isRefreshing}
				cacheInfo={cacheInfo}
				analyzedTimeAgo={analyzedTimeAgo}
			/>
		</aside>
	)
}
