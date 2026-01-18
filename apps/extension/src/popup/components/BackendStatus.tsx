/**
 * Backend connection status indicator
 */

interface BackendStatusProps {
	status: 'connected' | 'disconnected' | 'checking'
	aiProvider?: string
}

export function BackendStatus({ status, aiProvider }: BackendStatusProps) {
	return (
		<div className="mb-4 flex items-center justify-between">
			<div className="flex items-center gap-2">
				<div
					className={`h-2.5 w-2.5 rounded-full ${
						status === 'connected'
							? 'bg-green-500'
							: status === 'checking'
								? 'bg-yellow-500 animate-pulse'
								: 'bg-red-500'
					}`}
				/>
				<span className="text-sm text-gray-700">
					{status === 'connected'
						? 'Backend connecté'
						: status === 'checking'
							? 'Connexion...'
							: 'Backend déconnecté'}
				</span>
			</div>
			{status === 'connected' && aiProvider && (
				<span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
					{aiProvider}
				</span>
			)}
		</div>
	)
}
