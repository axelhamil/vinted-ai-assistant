/**
 * Main app component for form filling suggestions on Vinted listing creation page
 */

import { useState, useCallback } from 'react'
import type { StudioFormSuggestionsResponse } from '../../background/message-types'
import { PhotoStudio } from './PhotoStudio'

type AnalysisState = 'idle' | 'extracting' | 'analyzing' | 'success' | 'error'
type ActiveTab = 'suggestions' | 'studio'

interface FormSuggestions extends StudioFormSuggestionsResponse {
	// Extended with any local state if needed
}

/**
 * Applies suggestions to the Vinted form fields
 */
function applySuggestionToForm(field: string, value: string): void {
	// Try to find the corresponding form field and fill it
	// Vinted uses React-controlled inputs, so we need to trigger the right events

	const fieldSelectors: Record<string, string[]> = {
		title: ['input[name="title"]', '[data-testid="title-input"]', '#title'],
		description: ['textarea[name="description"]', '[data-testid="description-input"]', '#description'],
		price: ['input[name="price"]', '[data-testid="price-input"]', '#price', 'input[type="number"][name*="price"]'],
	}

	const selectors = fieldSelectors[field]
	if (!selectors) return

	for (const selector of selectors) {
		const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)
		if (element) {
			// Focus and set value
			element.focus()
			element.value = value

			// Trigger events to notify React of the change
			const inputEvent = new Event('input', { bubbles: true })
			const changeEvent = new Event('change', { bubbles: true })
			element.dispatchEvent(inputEvent)
			element.dispatchEvent(changeEvent)

			console.log(`[Vinted AI Studio] Applied ${field}:`, value.substring(0, 50) + '...')
			return
		}
	}
}

/**
 * Form filling suggestion panel component - Full-height sidebar
 */
export function FormFillingApp() {
	const [activeTab, setActiveTab] = useState<ActiveTab>('studio')
	const [analysisState, setAnalysisState] = useState<AnalysisState>('idle')
	const [suggestions, setSuggestions] = useState<FormSuggestions | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [sharedPhotos, setSharedPhotos] = useState<string[]>([])

	// Derive photoCount from sharedPhotos
	const photoCount = sharedPhotos.length

	// Analyze photos for form suggestions
	const handleAnalyze = useCallback(async () => {
		if (sharedPhotos.length === 0) {
			setError('Aucune photo. Importez des photos dans l\'onglet Studio.')
			return
		}

		setAnalysisState('analyzing')
		setError(null)
		setSuggestions(null)

		try {
			const response = await chrome.runtime.sendMessage({
				type: 'STUDIO_ANALYZE_FORM',
				photos: sharedPhotos,
				language: 'fr',
			})

			if (response.success && response.data) {
				setSuggestions(response.data)
				setAnalysisState('success')
			} else {
				throw new Error(response.error || 'Analyse failed')
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Erreur lors de l\'analyse')
			setAnalysisState('error')
		}
	}, [sharedPhotos])

	// Apply a single suggestion
	const handleApplySuggestion = useCallback((field: string, value: string) => {
		applySuggestionToForm(field, value)
	}, [])

	// Apply all suggestions
	const handleApplyAll = useCallback(() => {
		if (!suggestions) return

		if (suggestions.suggestedTitle) {
			applySuggestionToForm('title', suggestions.suggestedTitle)
		}
		if (suggestions.suggestedDescription) {
			applySuggestionToForm('description', suggestions.suggestedDescription)
		}
	}, [suggestions])

	return (
		<aside className="fixed top-0 right-0 z-[2147483647] w-[480px] h-full bg-white shadow-sidebar flex flex-col pointer-events-auto font-sans">
			{/* Header */}
			<div className="p-5 border-b border-border bg-gradient-to-r from-brand/5 to-brand-dark/5">
				<div className="flex items-center gap-3 mb-4">
					<div className="w-10 h-10 rounded-lg bg-gradient-to-r from-brand to-brand-dark flex items-center justify-center">
						<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<div>
						<h3 className="text-xl font-semibold text-content-primary">Assistant IA</h3>
						<p className="text-base text-content-secondary">
							{activeTab === 'studio' ? 'Studio photo' : 'Suggestions'}
							{photoCount > 0 && ` • ${photoCount} photo${photoCount > 1 ? 's' : ''}`}
						</p>
					</div>
				</div>
				{/* Tab Toggle */}
				<div className="flex bg-surface-secondary rounded-xl p-1.5">
					<button
						type="button"
						onClick={() => setActiveTab('studio')}
						className={`flex-1 py-3 px-6 text-lg font-medium rounded-lg transition-all ${
							activeTab === 'studio'
								? 'bg-white text-content-primary shadow-sm'
								: 'text-content-secondary hover:text-content-primary'
						}`}
					>
						<span className="flex items-center justify-center gap-2">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
							</svg>
							Studio
						</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab('suggestions')}
						className={`flex-1 py-3 px-6 text-lg font-medium rounded-lg transition-all ${
							activeTab === 'suggestions'
								? 'bg-white text-content-primary shadow-sm'
								: 'text-content-secondary hover:text-content-primary'
						}`}
					>
						<span className="flex items-center justify-center gap-2">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							Suggestions
						</span>
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-5 light-scrollbar">
				{/* Studio Tab - always mounted, hidden when not active */}
				<div className={activeTab === 'studio' ? 'block' : 'hidden'}>
					<PhotoStudio onPhotosChange={setSharedPhotos} />
				</div>

				{/* Suggestions Tab - always mounted, hidden when not active */}
				<div className={activeTab === 'suggestions' ? 'block' : 'hidden'}>
					{analysisState === 'idle' && (
						<div className="text-center py-8">
							<div className="w-20 h-20 mx-auto mb-5 rounded-full bg-surface-secondary flex items-center justify-center">
								<svg className="w-10 h-10 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</div>
							<p className="text-lg text-content-secondary mb-3">
								{photoCount > 0
									? `${photoCount} photo${photoCount > 1 ? 's' : ''} prête${photoCount > 1 ? 's' : ''} pour l'analyse`
									: 'Importez des photos dans l\'onglet Studio'}
							</p>
							<p className="text-base text-content-secondary opacity-75">
								L'IA analysera vos photos pour suggérer titre, description et autres détails
							</p>
						</div>
					)}

					{analysisState === 'analyzing' && (
						<div className="text-center py-10">
							<div className="w-14 h-14 mx-auto mb-5 border-4 border-brand border-t-transparent rounded-full animate-spin" />
							<p className="text-lg text-content-secondary">Analyse en cours...</p>
							<p className="text-base text-content-secondary mt-2 opacity-75">
								L'IA examine vos photos
							</p>
						</div>
					)}

					{analysisState === 'error' && error && (
						<div className="p-5 bg-red-50 rounded-xl border border-red-200">
							<div className="flex items-start gap-4">
								<svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<div>
									<p className="text-base font-medium text-red-800">Erreur</p>
									<p className="text-base text-red-600 mt-1">{error}</p>
								</div>
							</div>
						</div>
					)}

					{analysisState === 'success' && suggestions && (
						<div className="space-y-5">
							{/* Title suggestion */}
							<SuggestionField
								label="Titre suggéré"
								value={suggestions.suggestedTitle}
								onApply={() => handleApplySuggestion('title', suggestions.suggestedTitle)}
							/>

							{/* Description suggestion */}
							<SuggestionField
								label="Description suggérée"
								value={suggestions.suggestedDescription}
								isMultiline
								onApply={() => handleApplySuggestion('description', suggestions.suggestedDescription)}
							/>

							{/* Condition */}
							<InfoField
								label="État"
								value={conditionLabels[suggestions.suggestedCondition] || suggestions.suggestedCondition}
							/>

							{/* Brand */}
							{suggestions.suggestedBrand && (
								<InfoField label="Marque" value={suggestions.suggestedBrand} />
							)}

							{/* Colors */}
							{suggestions.suggestedColors.length > 0 && (
								<InfoField label="Couleurs" value={suggestions.suggestedColors.join(', ')} />
							)}

							{/* Category */}
							{suggestions.suggestedCategory && (
								<InfoField label="Catégorie" value={suggestions.suggestedCategory} />
							)}

							{/* Size */}
							{suggestions.suggestedSize && (
								<InfoField label="Taille" value={suggestions.suggestedSize} />
							)}

							{/* Material */}
							{suggestions.suggestedMaterial && (
								<InfoField label="Matière" value={suggestions.suggestedMaterial} />
							)}

							{/* Price Suggestion */}
							<PriceSuggestionField
								suggestedPrice={suggestions.suggestedPrice}
								priceRange={suggestions.priceRange}
								priceConfidence={suggestions.priceConfidence}
								priceReasoning={suggestions.priceReasoning}
								onApply={() => handleApplySuggestion('price', suggestions.suggestedPrice.toString())}
							/>
						</div>
					)}
				</div>
			</div>

			{/* Footer - only show for suggestions tab */}
			{activeTab === 'suggestions' && (
				<div className="p-5 border-t border-border bg-surface-secondary">
					{analysisState === 'success' && suggestions ? (
						<button
							type="button"
							onClick={handleApplyAll}
							className="w-full py-3.5 text-lg bg-gradient-to-r from-brand to-brand-dark text-white font-medium rounded-xl hover:from-brand-dark hover:to-brand-darker transition-all"
						>
							Appliquer titre et description
						</button>
					) : (
						<button
							type="button"
							onClick={handleAnalyze}
							disabled={analysisState === 'analyzing' || photoCount === 0}
							className={`
								w-full py-3.5 text-lg font-medium rounded-xl transition-all
								${photoCount === 0
									? 'bg-surface-tertiary text-content-secondary cursor-not-allowed'
									: 'bg-gradient-to-r from-brand to-brand-dark text-white hover:from-brand-dark hover:to-brand-darker'
								}
								${analysisState === 'analyzing' ? 'opacity-50 cursor-not-allowed' : ''}
							`}
						>
							{analysisState === 'analyzing' ? 'Analyse en cours...' : 'Analyser les photos'}
						</button>
					)}
				</div>
			)}
		</aside>
	)
}

/**
 * Suggestion field with apply button
 */
function SuggestionField({
	label,
	value,
	isMultiline = false,
	onApply,
}: {
	label: string
	value: string
	isMultiline?: boolean
	onApply: () => void
}) {
	return (
		<div className="p-4 bg-surface-secondary rounded-xl border border-border">
			<div className="flex items-center justify-between mb-3">
				<span className="text-base font-medium text-content-secondary">{label}</span>
				<button
					type="button"
					onClick={onApply}
					className="text-base text-brand hover:text-brand-dark font-medium transition-colors"
				>
					Appliquer
				</button>
			</div>
			<p className={`text-base text-content-primary ${isMultiline ? 'line-clamp-6' : 'line-clamp-2'}`}>
				{value}
			</p>
		</div>
	)
}

/**
 * Info field (read-only)
 */
function InfoField({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between py-3 border-b border-border last:border-0">
			<span className="text-base text-content-secondary">{label}</span>
			<span className="text-base font-medium text-content-primary">{value}</span>
		</div>
	)
}

/**
 * Condition labels in French
 */
const conditionLabels: Record<string, string> = {
	new_with_tags: 'Neuf avec étiquette',
	new: 'Neuf sans étiquette',
	very_good: 'Très bon état',
	good: 'Bon état',
	satisfactory: 'Satisfaisant',
}

/**
 * Confidence labels and colors
 */
const confidenceConfig: Record<'low' | 'medium' | 'high', { label: string; color: string; bgColor: string }> = {
	low: { label: 'Faible', color: 'text-orange-600', bgColor: 'bg-orange-100' },
	medium: { label: 'Moyenne', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
	high: { label: 'Élevée', color: 'text-green-600', bgColor: 'bg-green-100' },
}

/**
 * Price suggestion field with range and confidence indicator
 */
function PriceSuggestionField({
	suggestedPrice,
	priceRange,
	priceConfidence,
	priceReasoning,
	onApply,
}: {
	suggestedPrice: number
	priceRange: { low: number; high: number }
	priceConfidence: 'low' | 'medium' | 'high'
	priceReasoning: string
	onApply: () => void
}) {
	const confidence = confidenceConfig[priceConfidence]

	return (
		<div className="p-4 bg-gradient-to-r from-brand/5 to-brand-dark/5 rounded-xl border border-brand/20 mt-4">
			<div className="flex items-center justify-between mb-3">
				<span className="text-base font-medium text-content-secondary flex items-center gap-2">
					<svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Prix suggéré
				</span>
				<button
					type="button"
					onClick={onApply}
					className="text-base text-brand hover:text-brand-dark font-medium transition-colors"
				>
					Appliquer
				</button>
			</div>

			{/* Main price */}
			<div className="text-3xl font-bold text-content-primary mb-2">
				{suggestedPrice} €
			</div>

			{/* Price range */}
			<div className="flex items-center gap-2 mb-3">
				<span className="text-base text-content-secondary">
					Fourchette : {priceRange.low} € - {priceRange.high} €
				</span>
			</div>

			{/* Confidence badge */}
			<div className="flex items-center gap-2 mb-3">
				<span className="text-sm text-content-secondary">Confiance :</span>
				<span className={`text-sm font-medium px-2 py-0.5 rounded-full ${confidence.bgColor} ${confidence.color}`}>
					{confidence.label}
				</span>
			</div>

			{/* Reasoning */}
			<p className="text-sm text-content-secondary italic border-t border-border/50 pt-3 mt-2">
				{priceReasoning}
			</p>
		</div>
	)
}
