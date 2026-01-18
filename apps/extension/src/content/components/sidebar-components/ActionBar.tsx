import type { AnalysisStatus } from '@vinted-ai/shared/analysis'
import { Button, IconButton } from '../primitives/Button'

interface ActionBarProps {
	status: AnalysisStatus
	onUpdateStatus: (status: AnalysisStatus) => Promise<void>
	onExport: () => Promise<void>
	onRefresh: () => Promise<void>
	isUpdatingStatus: boolean
	isExporting: boolean
	isRefreshing: boolean
	cacheInfo?: { fromCache: boolean; timeRemaining: number } | null
	analyzedTimeAgo?: string | null
}

/**
 * Format cache time remaining for display
 */
function formatCacheTime(ms: number): string {
	const minutes = Math.floor(ms / 60000)
	if (minutes < 1) return "moins d'1 min"
	if (minutes === 1) return '1 min'
	if (minutes < 60) return `${minutes} min`
	const hours = Math.floor(minutes / 60)
	if (hours === 1) return '1 heure'
	return `${hours} heures`
}

/**
 * Get status display info
 */
function getStatusInfo(status: AnalysisStatus): { label: string; color: string } {
	switch (status) {
		case 'ANALYZED':
			return { label: 'Analysé', color: 'bg-info' }
		case 'WATCHING':
			return { label: 'Surveillé', color: 'bg-brand' }
		case 'BOUGHT':
			return { label: 'Acheté', color: 'bg-profit' }
		case 'SOLD':
			return { label: 'Vendu', color: 'bg-exceptional' }
		case 'ARCHIVED':
			return { label: 'Archivé', color: 'bg-content-muted' }
	}
}

/**
 * Action bar with status and action buttons - light theme
 */
export function ActionBar({
	status,
	onUpdateStatus,
	onExport,
	onRefresh,
	isUpdatingStatus,
	isExporting,
	isRefreshing,
	cacheInfo,
	analyzedTimeAgo,
}: ActionBarProps) {
	const statusInfo = getStatusInfo(status)

	return (
		<footer className="flex-shrink-0 px-6 py-5 bg-white border-t border-border space-y-4">
			{/* Status indicator */}
			<div className="flex items-center justify-between">
				<span className="text-sm text-content-secondary">Statut:</span>
				<div className="flex items-center gap-2">
					<span className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`} />
					<span className="text-sm font-medium text-content-primary">{statusInfo.label}</span>
				</div>
			</div>

			{/* Action buttons - Row 1: Status actions */}
			<div className="flex gap-2">
				{status === 'ANALYZED' && (
					<Button
						variant="secondary"
						size="sm"
						fullWidth
						disabled={isUpdatingStatus}
						loading={isUpdatingStatus}
						onClick={() => onUpdateStatus('WATCHING')}
						icon={
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
							</svg>
						}
					>
						Surveiller
					</Button>
				)}

				{(status === 'ANALYZED' || status === 'WATCHING') && (
					<Button
						variant="success"
						size="sm"
						fullWidth
						disabled={isUpdatingStatus}
						loading={isUpdatingStatus}
						onClick={() => onUpdateStatus('BOUGHT')}
						icon={
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						}
					>
						Acheté
					</Button>
				)}

				{status === 'BOUGHT' && (
					<Button
						variant="primary"
						size="sm"
						fullWidth
						disabled={isUpdatingStatus}
						loading={isUpdatingStatus}
						onClick={() => onUpdateStatus('SOLD')}
						icon={
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						}
					>
						Vendu
					</Button>
				)}
			</div>

			{/* Action buttons - Row 2: Export and Refresh */}
			<div className="flex gap-2">
				<Button
					variant="secondary"
					size="sm"
					fullWidth
					disabled={isExporting}
					loading={isExporting}
					onClick={onExport}
					icon={
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					}
				>
					Exporter
				</Button>

				<IconButton
					icon={
						<svg className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					}
					variant="secondary"
					size="md"
					disabled={isRefreshing}
					onClick={onRefresh}
					ariaLabel="Rafraîchir l'analyse"
				/>
			</div>

			{/* Cache/timestamp info */}
			<div className="text-center">
				{cacheInfo?.fromCache && cacheInfo.timeRemaining > 0 ? (
					<div className="flex items-center justify-center gap-2 text-sm text-content-muted">
						<span className="w-2 h-2 rounded-full bg-profit animate-pulse" />
						<span>Cache • expire dans {formatCacheTime(cacheInfo.timeRemaining)}</span>
					</div>
				) : analyzedTimeAgo ? (
					<div className="flex items-center justify-center gap-2 text-sm text-content-muted">
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span>Analysé {analyzedTimeAgo}</span>
					</div>
				) : null}
			</div>
		</footer>
	)
}
