import type { NegotiationTone } from '@vinted-ai/shared/analysis'
import { useCallback, useState } from 'react'
import { Button } from '../primitives/Button'
import { Card } from '../primitives/Card'
import { Pill } from '../primitives/Pill'

interface ScriptCardProps {
	script: string
	suggestedOffer: number
	currentPrice: number
	tone: NegotiationTone
	arguments: string[]
}

/**
 * Get tone info
 */
function getToneInfo(tone: NegotiationTone): {
	emoji: string
	label: string
	variant: 'info' | 'warning' | 'success'
} {
	switch (tone) {
		case 'friendly':
			return { emoji: '😊', label: 'Amical', variant: 'success' }
		case 'direct':
			return { emoji: '💼', label: 'Direct', variant: 'info' }
		case 'urgent':
			return { emoji: '⚡', label: 'Urgent', variant: 'warning' }
	}
}

/**
 * Card displaying negotiation script with copy functionality
 */
export function ScriptCard({
	script,
	suggestedOffer,
	currentPrice,
	tone,
	arguments: args,
}: ScriptCardProps) {
	const [isCopied, setIsCopied] = useState(false)
	const toneInfo = getToneInfo(tone)
	const discount = Math.round(((currentPrice - suggestedOffer) / currentPrice) * 100)

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(script)
			setIsCopied(true)
			setTimeout(() => setIsCopied(false), 2000)
		} catch (error) {
			console.error('Failed to copy:', error)
		}
	}, [script])

	return (
		<Card
			title="Script Négociation"
			iconColor="orange"
			icon={
				<svg
					aria-hidden="true"
					className="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
					/>
				</svg>
			}
		>
			<div className="space-y-4">
				{/* Offer and tone */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/20">
							<span className="text-2xl font-bold text-brand">{suggestedOffer}€</span>
						</div>
						<span className="text-xl text-content-secondary">-{discount}%</span>
					</div>
					<Pill variant={toneInfo.variant}>
						{toneInfo.emoji} {toneInfo.label}
					</Pill>
				</div>

				{/* Script text */}
				<div className="relative">
					<div className="p-4 rounded-lg bg-surface-secondary border border-border">
						<p className="text-xl text-content-primary italic leading-relaxed">"{script}"</p>
					</div>

					{/* Copy button */}
					<Button
						variant={isCopied ? 'success' : 'secondary'}
						size="sm"
						className="absolute -top-2 -right-2"
						onClick={handleCopy}
						icon={
							isCopied ? (
								<svg
									aria-hidden="true"
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							) : (
								<svg
									aria-hidden="true"
									className="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
							)
						}
					>
						{isCopied ? 'Copié!' : 'Copier'}
					</Button>
				</div>

				{/* Arguments */}
				{args.length > 0 && (
					<div className="pt-3 border-t border-border">
						<h5 className="text-xl text-content-muted mb-2">Arguments clés:</h5>
						<ul className="space-y-1.5">
							{args.map((arg) => (
								<li key={arg} className="flex items-start gap-2 text-lg text-content-secondary">
									<span className="text-brand mt-0.5">•</span>
									{arg}
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</Card>
	)
}
