/**
 * Main dashboard view
 */

import { BackendStatus } from '../components/BackendStatus'
import { ExtensionToggle } from '../components/ExtensionToggle'
import { StatCard } from '../components/StatCard'
import { AnalysisIcon } from '../icons/AnalysisIcon'
import { BoughtIcon } from '../icons/BoughtIcon'
import { OpportunityIcon } from '../icons/OpportunityIcon'
import { PortfolioIcon } from '../icons/PortfolioIcon'
import { SettingsIcon } from '../icons/SettingsIcon'
import { SoldIcon } from '../icons/SoldIcon'
import type { ExtensionSettings, ExtensionState, PopupView, StatsResponse } from '../types'

interface MainViewProps {
	backendStatus: 'connected' | 'disconnected' | 'checking'
	aiProvider: string
	state: ExtensionState | null
	stats: StatsResponse | null
	settings: ExtensionSettings | null
	onViewChange: (view: PopupView) => void
	onToggleExtension: () => void
	onRetry: () => void
}

export function MainView({
	backendStatus,
	aiProvider,
	state,
	stats,
	settings,
	onViewChange,
	onToggleExtension,
	onRetry,
}: MainViewProps) {
	return (
		<div className="w-80">
			{/* Header */}
			<div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
				<div className="flex items-center justify-between">
					<h1 className="font-bold text-white">Vinted AI Assistant</h1>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => onViewChange('portfolio')}
							className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
							aria-label="Portfolio"
						>
							<PortfolioIcon />
						</button>
						<button
							type="button"
							onClick={() => onViewChange('settings')}
							className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
							aria-label="Settings"
						>
							<SettingsIcon />
						</button>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="p-4">
				{/* Backend Status */}
				<BackendStatus status={backendStatus} aiProvider={aiProvider} />

				{/* Extension Toggle */}
				<ExtensionToggle enabled={state?.enabled ?? false} onToggle={onToggleExtension} />

				{/* Stats */}
				<div className="mb-4">
					<h2 className="mb-2 text-base font-semibold text-gray-900">Statistiques du jour</h2>
					<div className="grid grid-cols-2 gap-2">
						<StatCard
							label="Articles analysés"
							value={state?.todayAnalyzedCount ?? 0}
							icon={<AnalysisIcon />}
						/>
						<StatCard
							label="Opportunités"
							value={stats?.opportunities ?? 0}
							icon={<OpportunityIcon />}
							highlight={stats?.opportunities ? stats.opportunities > 0 : false}
						/>
						<StatCard label="Achetés" value={stats?.bought ?? 0} icon={<BoughtIcon />} />
						<StatCard label="Vendus" value={stats?.sold ?? 0} icon={<SoldIcon />} />
					</div>
				</div>

				{/* Backend disconnected warning */}
				{backendStatus === 'disconnected' && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-3">
						<p className="text-base font-medium text-red-800">Backend non disponible</p>
						<p className="mt-1 text-base text-red-600">
							Lancez le backend avec <code className="rounded bg-red-100 px-1">bun run dev</code>{' '}
							dans apps/backend
						</p>
						<button
							type="button"
							onClick={onRetry}
							className="mt-2 text-base font-medium text-red-700 hover:text-red-800"
						>
							Réessayer
						</button>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="border-t border-gray-100 px-4 py-2">
				<p className="text-center text-base text-gray-400">
					Score seuil: {settings?.scoreThreshold ?? 7} / 10
				</p>
			</div>
		</div>
	)
}
