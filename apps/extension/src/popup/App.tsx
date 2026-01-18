/**
 * Popup App - View router
 */

import { useState } from 'react'
import { usePopupData } from './hooks/usePopupData'
import { MainView } from './views/MainView'
import { SettingsView } from './views/SettingsView'
import { PortfolioView } from './views/PortfolioView'
import type { PopupView } from './types'

export function App() {
	const [view, setView] = useState<PopupView>('main')
	const {
		isLoading,
		backendStatus,
		aiProvider,
		state,
		stats,
		settings,
		loadData,
		toggleExtension,
		updateSettings,
	} = usePopupData()

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
				onUpdate={updateSettings}
			/>
		)
	}

	if (view === 'portfolio') {
		return (
			<PortfolioView
				onBack={() => setView('main')}
				scoreThreshold={settings?.scoreThreshold}
			/>
		)
	}

	return (
		<MainView
			backendStatus={backendStatus}
			aiProvider={aiProvider}
			state={state}
			stats={stats}
			settings={settings}
			onViewChange={setView}
			onToggleExtension={toggleExtension}
			onRetry={loadData}
		/>
	)
}
