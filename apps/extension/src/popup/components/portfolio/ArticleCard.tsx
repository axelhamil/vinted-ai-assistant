/**
 * Individual article card in portfolio list
 */

import { ExternalLinkIcon } from '../../icons/ExternalLinkIcon'
import { StarIcon } from '../../icons/StarIcon'
import { TrashIcon } from '../../icons/TrashIcon'
import type { PortfolioArticle } from '../../types'

interface ArticleCardProps {
	article: PortfolioArticle
	onDelete?: (vintedId: string) => void
}

function getScoreColor(score: number): string {
	if (score <= 3) return 'bg-red-100 text-red-700'
	if (score <= 5) return 'bg-yellow-100 text-yellow-700'
	if (score <= 7) return 'bg-blue-100 text-blue-700'
	if (score <= 9) return 'bg-green-100 text-green-700'
	return 'bg-orange-100 text-orange-700'
}

function formatPrice(price: number): string {
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'EUR',
	}).format(price)
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr)
	return new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
	}).format(date)
}

export function ArticleCard({ article, onDelete }: ArticleCardProps) {
	const handleClick = () => {
		chrome.tabs.create({ url: article.url })
	}

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation()
		onDelete?.(article.vintedId)
	}

	return (
		<div className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-50">
			{/* Main clickable area */}
			<button
				type="button"
				onClick={handleClick}
				className="flex flex-1 items-center gap-3 text-left"
			>
				{/* Thumbnail */}
				<div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
					{article.imageUrl ? (
						<img
							src={article.imageUrl}
							alt={article.title}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center text-gray-400">
							<svg
								aria-hidden="true"
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
					)}
				</div>

				{/* Content */}
				<div className="min-w-0 flex-1">
					<p className="truncate text-base font-medium text-gray-900">{article.title}</p>
					<div className="mt-1 flex items-center gap-2">
						<span className="text-base font-semibold text-gray-900">
							{formatPrice(article.price)}
						</span>
						<span className="text-base text-gray-400">{formatDate(article.analyzedAt)}</span>
					</div>
				</div>

				{/* Score badge */}
				<div className="flex flex-col items-end gap-1">
					<span
						className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-base font-semibold ${getScoreColor(article.score)}`}
					>
						<StarIcon />
						{article.score}
					</span>
					{article.marginPercent !== undefined && (
						<span
							className={`text-base font-medium ${
								article.marginPercent > 30
									? 'text-green-600'
									: article.marginPercent > 15
										? 'text-yellow-600'
										: 'text-red-600'
							}`}
						>
							{article.marginPercent > 0 ? '+' : ''}
							{article.marginPercent.toFixed(0)}%
						</span>
					)}
				</div>

				{/* External link icon */}
				<span className="text-gray-400">
					<ExternalLinkIcon />
				</span>
			</button>

			{/* Delete button */}
			{onDelete && (
				<button
					type="button"
					onClick={handleDelete}
					className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
					title="Supprimer"
				>
					<TrashIcon />
				</button>
			)}
		</div>
	)
}
