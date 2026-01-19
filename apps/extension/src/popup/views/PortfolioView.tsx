/**
 * Portfolio management view
 */

import { useEffect, useState } from 'react'
import { BackIcon } from '../icons/BackIcon'
import { usePortfolio } from '../hooks/usePortfolio'
import { PortfolioTabs, getStatusFromTab, type PortfolioTab } from '../components/portfolio/PortfolioTabs'
import { ArticleList } from '../components/portfolio/ArticleList'

interface PortfolioViewProps {
	onBack: () => void
	scoreThreshold?: number
}

export function PortfolioView({ onBack, scoreThreshold = 7 }: PortfolioViewProps) {
	const [activeTab, setActiveTab] = useState<PortfolioTab>('watching')
	const { articles, stats, isLoading, error, fetchArticles, fetchStats, deleteArticle } =
		usePortfolio()

	// Fetch stats on mount
	useEffect(() => {
		fetchStats()
	}, [fetchStats])

	// Fetch articles when tab changes
	useEffect(() => {
		const status = getStatusFromTab(activeTab)
		if (activeTab === 'opportunities') {
			fetchArticles(undefined, scoreThreshold)
		} else {
			fetchArticles(status)
		}
	}, [activeTab, fetchArticles, scoreThreshold])

	const handleTabChange = (tab: PortfolioTab) => {
		setActiveTab(tab)
	}

	return (
		<div className="w-80">
			{/* Header */}
			<div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
				<button
					type="button"
					onClick={onBack}
					className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
					aria-label="Back"
				>
					<BackIcon />
				</button>
				<h1 className="font-bold text-gray-900">Mon Portfolio</h1>
			</div>

			{/* Tabs */}
			<PortfolioTabs activeTab={activeTab} onTabChange={handleTabChange} stats={stats} />

			{/* Article List */}
			<div className="max-h-[350px] overflow-y-auto">
				<ArticleList
					articles={articles}
					isLoading={isLoading}
					error={error}
					activeTab={activeTab}
					onDeleteArticle={deleteArticle}
				/>
			</div>

			{/* Footer */}
				<div className="border-t border-gray-100 px-4 py-2">
				<p className="text-center text-base text-gray-400">
					{articles.length} article{articles.length !== 1 ? 's' : ''}
				</p>
			</div>
		</div>
	)
}
