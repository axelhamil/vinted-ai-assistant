export function App() {
	return (
		<div className="w-80 p-4">
			<h1 className="text-lg font-bold text-gray-900">Vinted AI Assistant</h1>
			<p className="mt-2 text-sm text-gray-600">
				Extension pour analyser les opportunités de revente sur Vinted.
			</p>
			<div className="mt-4 flex items-center gap-2">
				<div className="h-2 w-2 rounded-full bg-green-500" />
				<span className="text-sm text-gray-700">Backend connecté</span>
			</div>
		</div>
	)
}
