import { useCallback, useEffect, useState } from 'react'

// Types matching background service worker
interface ExtensionSettings {
	backendUrl: string
	scoreThreshold: number
	autoOpenSidebar: boolean
	enabled: boolean
}

interface ExtensionState {
	enabled: boolean
	todayAnalyzedCount: number
	lastResetDate: string
}

interface BackendHealthResponse {
	status: string
	aiProvider: string
}

interface StatsResponse {
	today: number
	opportunities: number
	bought: number
	sold: number
}

interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

type PopupView = 'main' | 'settings'

// Send message to background service worker
async function sendMessage<T>(message: Record<string, unknown>): Promise<ApiResponse<T>> {
	return new Promise((resolve) => {
		chrome.runtime.sendMessage(message, (response: ApiResponse<T>) => {
			resolve(response)
		})
	})
}

export function App() {
	const [view, setView] = useState<PopupView>('main')
	const [isLoading, setIsLoading] = useState(true)
	const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>(
		'checking'
	)
	const [aiProvider, setAiProvider] = useState<string>('')
	const [state, setState] = useState<ExtensionState | null>(null)
	const [stats, setStats] = useState<StatsResponse | null>(null)
	const [settings, setSettings] = useState<ExtensionSettings | null>(null)

	// Load initial data
	const loadData = useCallback(async () => {
		setIsLoading(true)

		// Check backend status
		setBackendStatus('checking')
		const healthResponse = await sendMessage<BackendHealthResponse>({
			type: 'CHECK_BACKEND_STATUS',
		})
		if (healthResponse.success && healthResponse.data) {
			setBackendStatus('connected')
			setAiProvider(healthResponse.data.aiProvider)
		} else {
			setBackendStatus('disconnected')
		}

		// Get extension state
		const stateResponse = await sendMessage<ExtensionState>({ type: 'GET_STATE' })
		if (stateResponse.success && stateResponse.data) {
			setState(stateResponse.data)
		}

		// Get stats (only if backend is connected)
		if (healthResponse.success) {
			const statsResponse = await sendMessage<StatsResponse>({ type: 'GET_STATS' })
			if (statsResponse.success && statsResponse.data) {
				setStats(statsResponse.data)
			}
		}

		// Get settings
		const settingsResponse = await sendMessage<ExtensionSettings>({ type: 'GET_SETTINGS' })
		if (settingsResponse.success && settingsResponse.data) {
			setSettings(settingsResponse.data)
		}

		setIsLoading(false)
	}, [])

	useEffect(() => {
		loadData()
	}, [loadData])

	// Toggle extension enabled/disabled
	const handleToggleExtension = async () => {
		const response = await sendMessage<{ enabled: boolean }>({
			type: 'TOGGLE_EXTENSION',
		})
		if (response.success && response.data) {
			setState((prev) => (prev ? { ...prev, enabled: response.data?.enabled ?? false } : null))
		}
	}

	// Update settings
	const handleUpdateSettings = async (newSettings: Partial<ExtensionSettings>) => {
		const response = await sendMessage<ExtensionSettings>({
			type: 'UPDATE_SETTINGS',
			settings: newSettings,
		})
		if (response.success && response.data) {
			setSettings(response.data)
		}
	}

	if (isLoading) {
		return (
			<div className="flex min-h-[200px] w-80 items-center justify-center p-4">
				<div className="flex flex-col items-center gap-2">
					<div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
					<span className="text-sm text-gray-500">Chargement...</span>
				</div>
			</div>
		)
	}

	if (view === 'settings') {
		return (
			<SettingsView
				settings={settings}
				onBack={() => setView('main')}
				onUpdate={handleUpdateSettings}
			/>
		)
	}

	return (
		<div className="w-80">
			{/* Header */}
			<div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
				<div className="flex items-center justify-between">
					<h1 className="font-bold text-white">Vinted AI Assistant</h1>
					<button
						type="button"
						onClick={() => setView('settings')}
						className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
						aria-label="Settings"
					>
						<SettingsIcon />
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="p-4">
				{/* Backend Status */}
				<div className="mb-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div
							className={`h-2.5 w-2.5 rounded-full ${
								backendStatus === 'connected'
									? 'bg-green-500'
									: backendStatus === 'checking'
										? 'bg-yellow-500 animate-pulse'
										: 'bg-red-500'
							}`}
						/>
						<span className="text-sm text-gray-700">
							{backendStatus === 'connected'
								? 'Backend connecté'
								: backendStatus === 'checking'
									? 'Connexion...'
									: 'Backend déconnecté'}
						</span>
					</div>
					{backendStatus === 'connected' && aiProvider && (
						<span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
							{aiProvider}
						</span>
					)}
				</div>

				{/* Extension Toggle */}
				<div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
					<div>
						<p className="text-sm font-medium text-gray-900">Extension active</p>
						<p className="text-xs text-gray-500">
							{state?.enabled ? 'Analyse automatique activée' : 'Extension en pause'}
						</p>
					</div>
					<button
						type="button"
						onClick={handleToggleExtension}
						className={`relative h-6 w-11 rounded-full transition-colors ${
							state?.enabled ? 'bg-indigo-600' : 'bg-gray-300'
						}`}
						aria-label={state?.enabled ? 'Disable extension' : 'Enable extension'}
					>
						<span
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
								state?.enabled ? 'left-[22px]' : 'left-0.5'
							}`}
						/>
					</button>
				</div>

				{/* Stats */}
				<div className="mb-4">
					<h2 className="mb-2 text-sm font-semibold text-gray-900">Statistiques du jour</h2>
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
						<p className="text-sm font-medium text-red-800">Backend non disponible</p>
						<p className="mt-1 text-xs text-red-600">
							Lancez le backend avec <code className="rounded bg-red-100 px-1">bun run dev</code>{' '}
							dans apps/backend
						</p>
						<button
							type="button"
							onClick={loadData}
							className="mt-2 text-xs font-medium text-red-700 hover:text-red-800"
						>
							Réessayer
						</button>
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="border-t border-gray-100 px-4 py-2">
				<p className="text-center text-xs text-gray-400">
					Score seuil: {settings?.scoreThreshold ?? 7} / 10
				</p>
			</div>
		</div>
	)
}

// Settings View Component
interface SettingsViewProps {
	settings: ExtensionSettings | null
	onBack: () => void
	onUpdate: (settings: Partial<ExtensionSettings>) => Promise<void>
}

function SettingsView({ settings, onBack, onUpdate }: SettingsViewProps) {
	const [localSettings, setLocalSettings] = useState<ExtensionSettings | null>(settings)
	const [isSaving, setIsSaving] = useState(false)

	const handleSave = async () => {
		if (!localSettings) return
		setIsSaving(true)
		await onUpdate(localSettings)
		setIsSaving(false)
		onBack()
	}

	if (!localSettings) {
		return (
			<div className="w-80 p-4">
				<p className="text-sm text-gray-500">Erreur de chargement des paramètres</p>
			</div>
		)
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
				<h1 className="font-bold text-gray-900">Paramètres</h1>
			</div>

			{/* Settings Form */}
			<div className="p-4">
				{/* Backend URL */}
				<div className="mb-4">
					<label htmlFor="backendUrl" className="mb-1 block text-sm font-medium text-gray-700">
						URL Backend
					</label>
					<input
						type="url"
						id="backendUrl"
						value={localSettings.backendUrl}
						onChange={(e) => setLocalSettings({ ...localSettings, backendUrl: e.target.value })}
						className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
						placeholder="http://localhost:3000"
					/>
				</div>

				{/* Score Threshold */}
				<div className="mb-4">
					<label htmlFor="scoreThreshold" className="mb-1 block text-sm font-medium text-gray-700">
						Seuil score opportunité
					</label>
					<div className="flex items-center gap-3">
						<input
							type="range"
							id="scoreThreshold"
							min="1"
							max="10"
							value={localSettings.scoreThreshold}
							onChange={(e) =>
								setLocalSettings({
									...localSettings,
									scoreThreshold: Number.parseInt(e.target.value, 10),
								})
							}
							className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
						/>
						<span className="w-8 text-center text-sm font-semibold text-indigo-600">
							{localSettings.scoreThreshold}
						</span>
					</div>
					<p className="mt-1 text-xs text-gray-500">
						Les articles avec un score &ge; {localSettings.scoreThreshold} seront mis en évidence
					</p>
				</div>

				{/* Auto-open Sidebar */}
				<div className="mb-4 flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-gray-700">Ouvrir sidebar auto</p>
						<p className="text-xs text-gray-500">Ouvre la sidebar après analyse</p>
					</div>
					<button
						type="button"
						onClick={() =>
							setLocalSettings({
								...localSettings,
								autoOpenSidebar: !localSettings.autoOpenSidebar,
							})
						}
						className={`relative h-6 w-11 rounded-full transition-colors ${
							localSettings.autoOpenSidebar ? 'bg-indigo-600' : 'bg-gray-300'
						}`}
						aria-label={localSettings.autoOpenSidebar ? 'Disable auto-open' : 'Enable auto-open'}
					>
						<span
							className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
								localSettings.autoOpenSidebar ? 'left-[22px]' : 'left-0.5'
							}`}
						/>
					</button>
				</div>

				{/* Save Button */}
				<button
					type="button"
					onClick={handleSave}
					disabled={isSaving}
					className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isSaving ? 'Enregistrement...' : 'Enregistrer'}
				</button>
			</div>
		</div>
	)
}

// Stat Card Component
interface StatCardProps {
	label: string
	value: number
	icon: React.ReactNode
	highlight?: boolean
}

function StatCard({ label, value, icon, highlight }: StatCardProps) {
	return (
		<div
			className={`rounded-lg border p-2 ${
				highlight ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
			}`}
		>
			<div className="flex items-center gap-2">
				<span className={highlight ? 'text-green-600' : 'text-gray-400'}>{icon}</span>
				<span className={`text-lg font-bold ${highlight ? 'text-green-700' : 'text-gray-900'}`}>
					{value}
				</span>
			</div>
			<p className="mt-0.5 text-xs text-gray-500">{label}</p>
		</div>
	)
}

// Icon Components
function SettingsIcon() {
	return (
		<svg
			className="h-5 w-5"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
			/>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
			/>
		</svg>
	)
}

function BackIcon() {
	return (
		<svg
			className="h-5 w-5"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
		</svg>
	)
}

function AnalysisIcon() {
	return (
		<svg
			className="h-4 w-4"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
			/>
		</svg>
	)
}

function OpportunityIcon() {
	return (
		<svg
			className="h-4 w-4"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
			/>
		</svg>
	)
}

function BoughtIcon() {
	return (
		<svg
			className="h-4 w-4"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
			/>
		</svg>
	)
}

function SoldIcon() {
	return (
		<svg
			className="h-4 w-4"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	)
}
