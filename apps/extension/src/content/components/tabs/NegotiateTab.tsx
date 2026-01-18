import type { AnalysisResult, Negotiation, NegotiationTone } from '@vinted-ai/shared/analysis'
import { useState, useCallback } from 'react'
import { ScriptCard } from '../cards/ScriptCard'
import { Card, CardRow } from '../primitives/Card'
import { Pill } from '../primitives/Pill'
import { Button } from '../primitives/Button'
import { useAnalysisStore } from '../../../stores/analysis.store'

interface NegotiateTabProps {
	analysis: AnalysisResult
}

/**
 * Tone option configuration
 */
const TONE_OPTIONS: { value: NegotiationTone; label: string; emoji: string; description: string }[] = [
	{ value: 'friendly', label: 'Amical', emoji: '😊', description: 'Approche douce et sympathique' },
	{ value: 'direct', label: 'Direct', emoji: '💼', description: 'Efficace et professionnel' },
	{ value: 'urgent', label: 'Urgent', emoji: '⚡', description: 'Crée un sentiment d\'urgence' },
]

/**
 * Negotiate tab displaying negotiation script and offer suggestions
 */
export function NegotiateTab({ analysis }: NegotiateTabProps) {
	const { negotiation: originalNegotiation, price, marketPrice } = analysis
	const regenerateNegotiation = useAnalysisStore((state) => state.regenerateNegotiation)

	// Local state for the current negotiation (can be overridden by regenerated one)
	const [currentNegotiation, setCurrentNegotiation] = useState<Negotiation>(originalNegotiation)
	const [isRegenerating, setIsRegenerating] = useState(false)
	const [selectedTone, setSelectedTone] = useState<NegotiationTone>(originalNegotiation.tone)

	const handleToneChange = useCallback(async (tone: NegotiationTone) => {
		// Skip if already regenerating or if clicking the same tone that's already displayed
		if (isRegenerating) return
		if (tone === currentNegotiation.tone) return

		console.log('[NegotiateTab] Regenerating with tone:', tone)
		setSelectedTone(tone)
		setIsRegenerating(true)

		try {
			const newNegotiation = await regenerateNegotiation(tone)
			console.log('[NegotiateTab] Received new negotiation:', newNegotiation)
			if (newNegotiation) {
				setCurrentNegotiation(newNegotiation)
			} else {
				// Reset selection if regeneration failed
				setSelectedTone(currentNegotiation.tone)
			}
		} catch (error) {
			console.error('[NegotiateTab] Error regenerating:', error)
			setSelectedTone(currentNegotiation.tone)
		} finally {
			setIsRegenerating(false)
		}
	}, [isRegenerating, currentNegotiation.tone, regenerateNegotiation])

	const negotiation = currentNegotiation
	const suggestedDiscount = Math.round(((price - negotiation.suggestedOffer) / price) * 100)
	const belowMarket = Math.round(((marketPrice.average - negotiation.suggestedOffer) / marketPrice.average) * 100)

	return (
		<div className="space-y-4 animate-fade-in">
			{/* Tone Selector */}
			<Card
				title="Choisir le ton"
				icon={
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
					</svg>
				}
			>
				<div className="flex gap-2">
					{TONE_OPTIONS.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => handleToneChange(option.value)}
							disabled={isRegenerating}
							className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
								selectedTone === option.value
									? 'border-brand bg-brand/10 text-brand'
									: 'border-border bg-surface-secondary hover:border-brand/50 text-content-secondary hover:text-content-primary'
							} ${isRegenerating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
						>
							<span className="text-2xl">{option.emoji}</span>
							<span className="text-lg font-medium">{option.label}</span>
						</button>
					))}
				</div>
				{isRegenerating && (
					<div className="flex items-center justify-center gap-2 mt-3 text-lg text-content-muted">
						<svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
						</svg>
						<span>Génération en cours...</span>
					</div>
				)}
			</Card>

			{/* Main Script Card */}
			<ScriptCard
				script={negotiation.script}
				suggestedOffer={negotiation.suggestedOffer}
				currentPrice={price}
				tone={negotiation.tone}
				arguments={negotiation.arguments}
			/>

			{/* Offer Analysis */}
			<Card
				title="Analyse de l'offre"
				icon={
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
					</svg>
				}
			>
				<div className="space-y-3">
					<CardRow
						label="Prix demandé"
						value={`${price}€`}
					/>
					<CardRow
						label="Votre offre"
						value={`${negotiation.suggestedOffer}€`}
						valueClassName="text-brand-indigo"
					/>
					<CardRow
						label="Réduction demandée"
						value={`-${suggestedDiscount}%`}
						valueClassName="text-profit"
					/>

					<div className="pt-3 border-t border-border">
						<CardRow
							label="Prix moyen marché"
							value={`${marketPrice.average}€`}
						/>
						<div className="mt-2 flex items-center gap-2">
							<svg className="w-5 h-5 text-profit" fill="currentColor" viewBox="0 0 20 20">
								<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
							</svg>
							<span className="text-lg text-profit">
								{belowMarket}% sous le prix marché
							</span>
						</div>
					</div>
				</div>
			</Card>

			{/* Tips */}
			<Card
				title="Conseils négociation"
				icon={
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
					</svg>
				}
			>
				<ul className="space-y-3">
					<li className="flex items-start gap-3">
						<Pill variant="info">1</Pill>
						<span className="text-lg text-content-secondary">
							Mentionnez que vous êtes un acheteur sérieux prêt à conclure rapidement
						</span>
					</li>
					<li className="flex items-start gap-3">
						<Pill variant="info">2</Pill>
						<span className="text-lg text-content-secondary">
							Restez poli et amical, même si le vendeur refuse votre première offre
						</span>
					</li>
					<li className="flex items-start gap-3">
						<Pill variant="info">3</Pill>
						<span className="text-lg text-content-secondary">
							Proposez un prix légèrement supérieur si le vendeur refuse, mais restez sous le marché
						</span>
					</li>
				</ul>
			</Card>
		</div>
	)
}
