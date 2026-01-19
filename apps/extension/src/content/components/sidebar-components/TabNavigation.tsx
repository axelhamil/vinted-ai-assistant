export type TabId = 'insight' | 'negotiate' | 'resell' | 'sources' | 'studio'

interface Tab {
	id: TabId
	label: string
	icon: React.ReactNode
}

const tabs: Tab[] = [
	{
		id: 'insight',
		label: 'Analyse',
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
			</svg>
		),
	},
	{
		id: 'negotiate',
		label: 'Négocier',
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
			</svg>
		),
	},
	{
		id: 'resell',
		label: 'Revente',
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
		),
	},
	{
		id: 'sources',
		label: 'Sources',
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
		),
	},
	{
		id: 'studio',
		label: 'Studio',
		icon: (
			<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
		),
	},
]

interface TabNavigationProps {
	activeTab: TabId
	onChange: (tab: TabId) => void
}

/**
 * Tab navigation with sliding orange underline - light theme
 */
export function TabNavigation({ activeTab, onChange }: TabNavigationProps) {
	const activeIndex = tabs.findIndex((tab) => tab.id === activeTab)

	return (
		<nav className="px-6 py-3 border-b border-border bg-white">
			<div className="relative flex">
				{/* Tabs */}
				{tabs.map((tab) => {
					const isActive = tab.id === activeTab

					return (
						<button
							key={tab.id}
							type="button"
							onClick={() => onChange(tab.id)}
							className={`
								flex-1 flex items-center justify-center gap-1.5
								py-3 text-lg font-medium
								transition-colors duration-200
								${isActive ? 'text-brand' : 'text-content-secondary hover:text-content-primary'}
							`}
							aria-selected={isActive}
							role="tab"
						>
							{tab.icon}
							<span>{tab.label}</span>
						</button>
					)
				})}

				{/* Sliding underline - orange gradient */}
				<div
					className="absolute bottom-0 h-0.5 bg-gradient-to-r from-brand to-brand-dark rounded-full transition-all duration-200"
					style={{
						width: `${100 / tabs.length}%`,
						left: `${(activeIndex * 100) / tabs.length}%`,
					}}
				/>
			</div>
		</nav>
	)
}
