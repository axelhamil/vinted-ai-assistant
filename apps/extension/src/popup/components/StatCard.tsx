/**
 * Statistics card component
 */

interface StatCardProps {
	label: string
	value: number
	icon: React.ReactNode
	highlight?: boolean
}

export function StatCard({ label, value, icon, highlight }: StatCardProps) {
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
