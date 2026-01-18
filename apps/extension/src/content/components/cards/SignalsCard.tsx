import type { OpportunitySignal } from '@vinted-ai/shared/analysis'
import { useState } from 'react'
import { Card } from '../primitives/Card'
import { SignalPill } from '../primitives/Pill'

interface SignalsCardProps {
	signals: OpportunitySignal[]
}

/**
 * Card displaying opportunity signals as expandable pills - light theme
 */
export function SignalsCard({ signals }: SignalsCardProps) {
	const [expandedSignal, setExpandedSignal] = useState<string | null>(null)

	if (signals.length === 0) {
		return (
			<Card
				title={`Signaux (0)`}
				iconColor="blue"
				icon={
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				}
			>
				<p className="text-xl text-content-secondary text-center py-4">
					Aucun signal détecté
				</p>
			</Card>
		)
	}

	// Group signals by type
	const positiveSignals = signals.filter((s) => s.type === 'positive')
	const negativeSignals = signals.filter((s) => s.type === 'negative')
	const neutralSignals = signals.filter((s) => s.type === 'neutral')

	const toggleSignal = (label: string) => {
		setExpandedSignal((prev) => (prev === label ? null : label))
	}

	return (
		<Card
			title={`Signaux (${signals.length})`}
			iconColor="blue"
			icon={
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			}
		>
			<div className="space-y-3">
				{/* Pills grid */}
				<div className="flex flex-wrap gap-2">
					{positiveSignals.map((signal) => (
						<SignalPill
							key={signal.label}
							type="positive"
							label={signal.label}
							onClick={() => toggleSignal(signal.label)}
						/>
					))}
					{negativeSignals.map((signal) => (
						<SignalPill
							key={signal.label}
							type="negative"
							label={signal.label}
							onClick={() => toggleSignal(signal.label)}
						/>
					))}
					{neutralSignals.map((signal) => (
						<SignalPill
							key={signal.label}
							type="neutral"
							label={signal.label}
							onClick={() => toggleSignal(signal.label)}
						/>
					))}
				</div>

				{/* Expanded signal detail */}
				{expandedSignal && (
					<div className="p-3 rounded-lg bg-surface-secondary border border-border animate-fade-in">
						<div className="flex items-start justify-between">
							<div>
								<h5 className="text-xl font-medium text-content-primary mb-1">
									{expandedSignal}
								</h5>
								<p className="text-lg text-content-secondary">
									{signals.find((s) => s.label === expandedSignal)?.detail}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setExpandedSignal(null)}
								className="text-content-muted hover:text-content-secondary transition-colors"
							>
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</div>
				)}
			</div>
		</Card>
	)
}
