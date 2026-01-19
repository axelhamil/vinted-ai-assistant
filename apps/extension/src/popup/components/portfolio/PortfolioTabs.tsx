/**
 * Portfolio navigation tabs
 */

import type { ArticleStatus, PortfolioStats } from '../../types'

export type PortfolioTab = 'watching' | 'bought' | 'sold' | 'opportunities'

interface PortfolioTabsProps {
	activeTab: PortfolioTab
	onTabChange: (tab: PortfolioTab) => void
	stats: PortfolioStats | null
}

interface TabConfig {
	id: PortfolioTab
	label: string
	count: number
}

export function PortfolioTabs({ activeTab, onTabChange, stats }: PortfolioTabsProps) {
	const tabs: TabConfig[] = [
		{ id: 'watching', label: 'Surveillance', count: stats?.watching ?? 0 },
		{ id: 'bought', label: 'Achats', count: stats?.bought ?? 0 },
		{ id: 'sold', label: 'Ventes', count: stats?.sold ?? 0 },
		{ id: 'opportunities', label: 'Opportunités', count: stats?.opportunities ?? 0 },
	]

	return (
		<div className="flex border-b border-gray-200">
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					onClick={() => onTabChange(tab.id)}
					className={`flex-1 px-2 py-2 text-base font-medium transition-colors ${
						activeTab === tab.id
							? 'border-b-2 border-indigo-600 text-indigo-600'
							: 'text-gray-500 hover:text-gray-700'
					}`}
				>
					{tab.label}
					{tab.count > 0 && (
						<span
							className={`ml-1 rounded-full px-1.5 py-0.5 text-sm ${
								activeTab === tab.id
									? 'bg-indigo-100 text-indigo-700'
									: 'bg-gray-100 text-gray-600'
							}`}
						>
							{tab.count}
						</span>
					)}
				</button>
			))}
		</div>
	)
}

export function getStatusFromTab(tab: PortfolioTab): ArticleStatus | undefined {
	switch (tab) {
		case 'watching':
			return 'WATCHING'
		case 'bought':
			return 'BOUGHT'
		case 'sold':
			return 'SOLD'
		case 'opportunities':
			return undefined
	}
}
