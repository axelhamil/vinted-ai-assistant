import type {
	AnalysisResult,
	AnalysisStatus,
	NegotiationTone,
	OpportunitySignal,
} from '@vinted-ai/shared'
import { useCallback, useState } from 'react'

interface SidebarProps {
	analysis: AnalysisResult
	isOpen: boolean
	onClose: () => void
	onUpdateStatus: (status: AnalysisStatus) => Promise<void>
	onExport: () => Promise<void>
	onRefresh: () => Promise<void>
}

/**
 * Gets the score color based on value
 */
function getScoreColor(score: number): string {
	if (score >= 7) return 'text-green-600'
	if (score >= 5) return 'text-orange-500'
	return 'text-red-500'
}

/**
 * Gets the score background color based on value
 */
function getScoreBgColor(score: number): string {
	if (score >= 7) return 'bg-green-100 border-green-200'
	if (score >= 5) return 'bg-orange-100 border-orange-200'
	return 'bg-red-100 border-red-200'
}

/**
 * Gets the confidence badge styling
 */
function getConfidenceBadge(confidence: 'low' | 'medium' | 'high'): {
	bg: string
	text: string
	label: string
} {
	switch (confidence) {
		case 'high':
			return { bg: 'bg-green-100', text: 'text-green-700', label: 'Haute' }
		case 'medium':
			return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Moyenne' }
		case 'low':
			return { bg: 'bg-red-100', text: 'text-red-700', label: 'Faible' }
	}
}

/**
 * Gets the tone label and emoji based on negotiation tone
 */
function getToneInfo(tone: NegotiationTone): { emoji: string; label: string } {
	switch (tone) {
		case 'friendly':
			return { emoji: '😊', label: 'Amical' }
		case 'direct':
			return { emoji: '💼', label: 'Direct' }
		case 'urgent':
			return { emoji: '⚡', label: 'Urgent' }
	}
}

/**
 * Gets the signal icon based on type
 */
function SignalIcon({ type }: { type: OpportunitySignal['type'] }) {
	switch (type) {
		case 'positive':
			return (
				<span className="text-green-500" aria-hidden="true">
					✅
				</span>
			)
		case 'negative':
			return (
				<span className="text-red-500" aria-hidden="true">
					❌
				</span>
			)
		case 'neutral':
			return (
				<span className="text-blue-500" aria-hidden="true">
					ℹ️
				</span>
			)
	}
}

/**
 * Section component for consistent styling
 */
function Section({
	title,
	children,
	className = '',
}: {
	title: string
	children: React.ReactNode
	className?: string
}) {
	return (
		<div className={`border-b border-gray-100 pb-4 ${className}`}>
			<h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
			{children}
		</div>
	)
}

/**
 * Sidebar component displaying the full analysis details
 * Features:
 * - Header with global score and confidence indicator
 * - Market price section with range and sources
 * - Potential margin section with calculations
 * - Signals section (positive/negative/neutral list)
 * - Action buttons (export, save, mark as bought)
 * - Toggle open/close
 */
export function Sidebar({
	analysis,
	isOpen,
	onClose,
	onUpdateStatus,
	onExport,
	onRefresh,
}: SidebarProps) {
	const [isExporting, setIsExporting] = useState(false)
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
	const [isCopied, setIsCopied] = useState(false)

	const handleCopyScript = useCallback(async (script: string) => {
		try {
			await navigator.clipboard.writeText(script)
			setIsCopied(true)
			setTimeout(() => setIsCopied(false), 2000)
		} catch (error) {
			console.error('Failed to copy script:', error)
		}
	}, [])

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

	const { opportunity, marketPrice, authenticityCheck, negotiation } = analysis
	const confidenceBadge = getConfidenceBadge(marketPrice.confidence)
	const toneInfo = getToneInfo(negotiation.tone)

	return (
		<aside
			className="fixed top-0 right-0 w-96 h-full bg-white shadow-2xl border-l border-gray-200 z-[2147483647] flex flex-col"
			style={{ zIndex: 2147483647 }}
			aria-label="Analyse détaillée"
		>
			{/* Header */}
			<div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-lg font-bold">Analyse IA</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
						aria-label="Fermer le panneau"
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* Score Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
							<span className={`text-2xl font-bold ${getScoreColor(opportunity.score)}`}>
								{opportunity.score}
							</span>
						</div>
						<div>
							<div className="text-white/90 text-sm">Score d'opportunité</div>
							<div className="text-white font-medium">
								{opportunity.score >= 7
									? 'Excellente affaire'
									: opportunity.score >= 5
										? 'Opportunité moyenne'
										: 'Prudence conseillée'}
							</div>
						</div>
					</div>
					<div
						className={`px-2 py-1 rounded text-xs font-medium ${confidenceBadge.bg} ${confidenceBadge.text}`}
					>
						Confiance: {confidenceBadge.label}
					</div>
				</div>
			</div>

			{/* Scrollable Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{/* Article Info */}
				<div className="bg-gray-50 rounded-lg p-3">
					<h3 className="font-medium text-gray-800 truncate" title={analysis.title}>
						{analysis.title}
					</h3>
					<div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
						<span className="font-semibold text-gray-800">{analysis.price}€</span>
						{analysis.brand && (
							<>
								<span>•</span>
								<span>{analysis.brand}</span>
							</>
						)}
					</div>
				</div>

				{/* Prix Marché Section */}
				<Section title="💰 Prix Marché">
					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600">Fourchette estimée</span>
							<span className="font-semibold text-gray-800">
								{marketPrice.low}€ - {marketPrice.high}€
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600">Prix moyen marché</span>
							<span className="font-semibold text-blue-600">{marketPrice.average}€</span>
						</div>
						{marketPrice.sources.length > 0 && (
							<div className="mt-2 pt-2 border-t border-gray-100">
								<div className="text-xs text-gray-500 mb-1">Sources:</div>
								<div className="flex flex-wrap gap-1">
									{marketPrice.sources.map((source) => (
										<span
											key={`${source.name}-${source.price}`}
											className="text-xs bg-gray-100 px-2 py-0.5 rounded"
										>
											{source.name}: {source.price}€
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				</Section>

				{/* Marge Potentielle Section */}
				<Section title="📈 Marge Potentielle">
					<div className={`rounded-lg p-3 border ${getScoreBgColor(opportunity.score)}`}>
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-700">Marge estimée</span>
							<span className={`text-xl font-bold ${getScoreColor(opportunity.score)}`}>
								+{opportunity.margin.toFixed(0)}€
							</span>
						</div>
						<div className="flex justify-between items-center mt-1">
							<span className="text-sm text-gray-600">Pourcentage</span>
							<span className={`font-semibold ${getScoreColor(opportunity.score)}`}>
								+{opportunity.marginPercent.toFixed(0)}%
							</span>
						</div>
					</div>
					<div className="mt-2 text-xs text-gray-500">
						Basé sur le prix moyen marché de {marketPrice.average}€ vs prix demandé de{' '}
						{analysis.price}€
					</div>
				</Section>

				{/* Signaux Section */}
				<Section title="🔍 Signaux">
					<div className="space-y-2">
						{opportunity.signals.length > 0 ? (
							opportunity.signals.map((signal) => (
								<div
									key={`${signal.type}-${signal.label}`}
									className={`flex items-start gap-2 p-2 rounded ${
										signal.type === 'positive'
											? 'bg-green-50'
											: signal.type === 'negative'
												? 'bg-red-50'
												: 'bg-blue-50'
									}`}
								>
									<SignalIcon type={signal.type} />
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium text-gray-800">{signal.label}</div>
										<div className="text-xs text-gray-600">{signal.detail}</div>
									</div>
								</div>
							))
						) : (
							<div className="text-sm text-gray-500 text-center py-2">Aucun signal détecté</div>
						)}
					</div>
				</Section>

				{/* Authenticité Section */}
				<Section title="🔐 Authenticité">
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm text-gray-600">Score authenticité</span>
						<span className={`font-semibold ${getScoreColor(authenticityCheck.score)}`}>
							{authenticityCheck.score}/10
						</span>
					</div>
					{authenticityCheck.flags.length > 0 && (
						<div className="bg-yellow-50 border border-yellow-200 rounded p-2">
							<div className="text-xs font-medium text-yellow-800 mb-1">⚠️ Points d'attention:</div>
							<ul className="text-xs text-yellow-700 space-y-1">
								{authenticityCheck.flags.map((flag) => (
									<li key={flag}>• {flag}</li>
								))}
							</ul>
						</div>
					)}
					{authenticityCheck.flags.length === 0 && (
						<div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
							✓ Aucun problème d'authenticité détecté
						</div>
					)}
				</Section>

				{/* Négociation Section */}
				<Section title="🤝 Négociation">
					{/* Suggested Offer */}
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
						<div className="flex items-center justify-between mb-1">
							<span className="text-sm text-gray-600">Offre suggérée</span>
							<span className="text-xl font-bold text-blue-600">{negotiation.suggestedOffer}€</span>
						</div>
						<div className="text-xs text-gray-500">
							{Math.round(((analysis.price - negotiation.suggestedOffer) / analysis.price) * 100)}%
							de réduction par rapport au prix demandé
						</div>
					</div>

					{/* Tone indicator */}
					<div className="flex items-center gap-2 mb-3">
						<span className="text-sm text-gray-600">Ton recommandé:</span>
						<span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
							{toneInfo.emoji} {toneInfo.label}
						</span>
					</div>

					{/* Script */}
					<div className="mb-3">
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium text-gray-700">Script prêt à envoyer:</span>
							<button
								type="button"
								onClick={() => handleCopyScript(negotiation.script)}
								className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
									isCopied
										? 'bg-green-100 text-green-700'
										: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
								}`}
							>
								{isCopied ? (
									<>
										<svg
											className="w-3.5 h-3.5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M5 13l4 4L19 7"
											/>
										</svg>
										Copié !
									</>
								) : (
									<>
										<svg
											className="w-3.5 h-3.5"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
											/>
										</svg>
										Copier
									</>
								)}
							</button>
						</div>
						<div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
							<p className="text-sm text-gray-700 whitespace-pre-wrap italic">
								"{negotiation.script}"
							</p>
						</div>
					</div>

					{/* Arguments */}
					{negotiation.arguments.length > 0 && (
						<div>
							<span className="text-sm font-medium text-gray-700 block mb-2">Arguments clés:</span>
							<ul className="space-y-1.5">
								{negotiation.arguments.map((argument) => (
									<li key={argument} className="flex items-start gap-2 text-sm text-gray-600">
										<span className="text-blue-500 mt-0.5">•</span>
										<span>{argument}</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</Section>

				{/* Status Badge */}
				<div className="flex items-center justify-between py-2">
					<span className="text-sm text-gray-600">Statut actuel:</span>
					<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
						{analysis.status}
					</span>
				</div>
			</div>

			{/* Footer Actions */}
			<div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50 space-y-2">
				{/* Primary Actions */}
				<div className="flex gap-2">
					<button
						type="button"
						onClick={handleExport}
						disabled={isExporting}
						className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{isExporting ? (
							<div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
						) : (
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						)}
						Export .md
					</button>
					<button
						type="button"
						onClick={onRefresh}
						className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
						title="Rafraîchir l'analyse"
					>
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					</button>
				</div>

				{/* Status Actions */}
				<div className="flex gap-2">
					{analysis.status === 'ANALYZED' && (
						<button
							type="button"
							onClick={() => handleStatusUpdate('WATCHING')}
							disabled={isUpdatingStatus}
							className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							👁️ Surveiller
						</button>
					)}
					{(analysis.status === 'ANALYZED' || analysis.status === 'WATCHING') && (
						<button
							type="button"
							onClick={() => handleStatusUpdate('BOUGHT')}
							disabled={isUpdatingStatus}
							className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							🛒 Acheté
						</button>
					)}
					{analysis.status === 'BOUGHT' && (
						<button
							type="button"
							onClick={() => handleStatusUpdate('SOLD')}
							disabled={isUpdatingStatus}
							className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							💰 Vendu
						</button>
					)}
				</div>

				{/* Analyzed timestamp */}
				<div className="text-xs text-gray-400 text-center pt-2">
					Analysé le{' '}
					{new Date(analysis.analyzedAt).toLocaleDateString('fr-FR', {
						day: 'numeric',
						month: 'short',
						hour: '2-digit',
						minute: '2-digit',
					})}
				</div>
			</div>
		</aside>
	)
}
