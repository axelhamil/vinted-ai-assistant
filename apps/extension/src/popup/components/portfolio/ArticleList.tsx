/**
 * List of portfolio articles
 */

import type { PortfolioArticle } from '../../types'
import { ArticleCard } from './ArticleCard'
import { EmptyState } from './EmptyState'
import type { PortfolioTab } from './PortfolioTabs'

interface ArticleListProps {
	articles: PortfolioArticle[]
	isLoading: boolean
	error: string | null
	activeTab: PortfolioTab
}

function getEmptyMessage(tab: PortfolioTab): { title: string; description: string } {
	switch (tab) {
		case 'watching':
			return {
				title: 'Aucun article en surveillance',
				description: 'Marquez des articles comme "à surveiller" pour les retrouver ici',
			}
		case 'bought':
			return {
				title: 'Aucun achat enregistré',
				description: 'Vos articles achetés apparaîtront ici',
			}
		case 'sold':
			return {
				title: 'Aucune vente enregistrée',
				description: 'Vos articles vendus apparaîtront ici',
			}
		case 'opportunities':
			return {
				title: 'Aucune opportunité détectée',
				description: "Les articles avec un bon score d'opportunité apparaîtront ici",
			}
	}
}

export function ArticleList({ articles, isLoading, error, activeTab }: ArticleListProps) {
	if (isLoading) {
		return (
			<div className="flex flex-col gap-2 p-3">
				{[...Array(3)].map((_, i) => (
					<div
						key={`skeleton-${i}`}
						className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
					>
						<div className="h-12 w-12 animate-pulse rounded-md bg-gray-200" />
						<div className="flex-1">
							<div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
							<div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-200" />
						</div>
						<div className="h-6 w-10 animate-pulse rounded-full bg-gray-200" />
					</div>
				))}
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center p-6 text-center">
				<div className="mb-2 text-red-500">
					<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<p className="text-sm font-medium text-gray-900">Erreur de chargement</p>
				<p className="mt-1 text-xs text-gray-500">{error}</p>
			</div>
		)
	}

	if (articles.length === 0) {
		const { title, description } = getEmptyMessage(activeTab)
		return <EmptyState title={title} description={description} />
	}

	return (
		<div className="flex flex-col gap-2 p-3">
			{articles.map((article) => (
				<ArticleCard key={article.id} article={article} />
			))}
		</div>
	)
}
