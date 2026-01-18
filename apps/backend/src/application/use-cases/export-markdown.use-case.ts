import { inject, injectable } from 'inversify'
import { TYPES } from '../di-types'
import type { AnalysisEntity } from '../../domain/entities/analysis.entity'
import { AnalysisNotFoundError } from '../../domain/errors/domain.error'
import type { IAnalysisRepository } from '../interfaces/repositories/analysis.repository.interface'

/**
 * Use case for exporting analysis to markdown format
 * Format: {brand}_{title}_{date}.md
 */
@injectable()
export class ExportMarkdownUseCase {
	constructor(
		@inject(TYPES.AnalysisRepository)
		private readonly analysisRepository: IAnalysisRepository
	) {}

	/**
	 * Export analysis to markdown string
	 */
	async execute(vintedId: string): Promise<ExportMarkdownResult> {
		const entity = await this.analysisRepository.findByVintedId(vintedId)

		if (!entity) {
			throw new AnalysisNotFoundError(vintedId)
		}

		const content = this.generateMarkdown(entity)
		const filename = this.generateFilename(entity)

		return { content, filename }
	}

	/**
	 * Generate filename in format: {brand}_{title}_{date}.md
	 */
	private generateFilename(entity: AnalysisEntity): string {
		const brand = entity.brand ? this.sanitizeForFilename(entity.brand) : 'unknown'
		const title = this.sanitizeForFilename(entity.title)
		const date = this.formatDateForFilename(entity.analyzedAt)

		return `${brand}_${title}_${date}.md`
	}

	/**
	 * Sanitize string for use in filename
	 */
	private sanitizeForFilename(str: string): string {
		return str
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 30)
	}

	/**
	 * Format date for filename (YYYY-MM-DD)
	 */
	private formatDateForFilename(date: Date): string {
		const isoString = date.toISOString()
		return isoString.slice(0, isoString.indexOf('T'))
	}

	/**
	 * Generate markdown content following PRD template
	 */
	private generateMarkdown(entity: AnalysisEntity): string {
		const props = entity.toProps()
		const lines: string[] = []

		// Title
		lines.push(`# ${entity.title}`)
		lines.push('')

		// Infos Article
		lines.push('## Infos Article')
		lines.push(`- **URL:** ${entity.url}`)
		lines.push(`- **Prix demandé:** ${entity.askingPrice.value}€`)
		lines.push(`- **Marque:** ${entity.brand ?? 'Non spécifiée'}`)
		lines.push(`- **Taille:** ${entity.size ?? 'Non spécifiée'}`)
		lines.push(`- **État:** ${entity.condition ?? 'Non spécifié'}`)
		lines.push(
			`- **Vendeur:** ${entity.sellerUsername} (${entity.sellerRating ?? 'N/A'}⭐, ${entity.sellerSalesCount ?? 0} ventes)`
		)
		lines.push('')

		// Analyse IA
		lines.push('## Analyse IA')
		lines.push('')

		// Score Opportunité
		lines.push(`### Score Opportunité: ${entity.opportunityScore.value}/10`)
		lines.push('')

		// Prix Marché
		lines.push('### Prix Marché')
		lines.push(
			`- Fourchette: ${entity.marketPriceRange.low.value}€ - ${entity.marketPriceRange.high.value}€`
		)
		lines.push(`- Moyenne: ${entity.marketPriceRange.average.value}€`)
		lines.push(`- Marge potentielle: +${entity.margin.amount.value}€ (${entity.margin.percent}%)`)
		lines.push('')

		// Signaux
		lines.push('### Signaux')
		const signals = props.opportunity.signals
		for (const signal of signals) {
			const emoji = this.getSignalEmoji(signal.type)
			lines.push(`- ${emoji} **${signal.label}**: ${signal.detail}`)
		}
		lines.push('')

		// Authenticité
		lines.push('### Authenticité')
		lines.push(`Score: ${entity.authenticityScore.value}/10`)
		const flags = props.authenticityCheck.flags
		if (flags.length > 0) {
			lines.push("⚠️ Points d'attention:")
			for (const flag of flags) {
				lines.push(`- ${flag}`)
			}
		}
		lines.push('')

		// Négociation
		lines.push('## Négociation')
		lines.push('')
		lines.push(`**Offre suggérée:** ${props.negotiation.suggestedOffer}€`)
		lines.push('')
		lines.push('**Script:**')
		lines.push(`> ${props.negotiation.script}`)
		lines.push('')
		lines.push('**Arguments:**')
		for (const arg of props.negotiation.arguments) {
			lines.push(`- ${arg}`)
		}
		lines.push('')

		// Revente
		lines.push('## Revente')
		lines.push('')
		lines.push(`- **Prix recommandé:** ${props.resale.recommendedPrice}€`)
		lines.push(`- **Délai estimé:** ${props.resale.estimatedDays} jours`)
		lines.push(`- **Plateformes:** ${props.resale.platforms.map((p) => p.name).join(', ')}`)
		lines.push('')
		lines.push('**Tips:**')
		for (const tip of props.resale.tips) {
			lines.push(`- ${tip}`)
		}
		lines.push('')

		// Footer
		lines.push('---')
		lines.push(`*Analysé le ${this.formatDate(entity.analyzedAt)} par Vinted AI Assistant*`)

		return lines.join('\n')
	}

	/**
	 * Get emoji for signal type
	 */
	private getSignalEmoji(type: 'positive' | 'negative' | 'neutral'): string {
		switch (type) {
			case 'positive':
				return '✅'
			case 'negative':
				return '❌'
			case 'neutral':
				return 'ℹ️'
		}
	}

	/**
	 * Format date for display
	 */
	private formatDate(date: Date): string {
		return date.toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		})
	}
}

/**
 * Result of markdown export
 */
export interface ExportMarkdownResult {
	content: string
	filename: string
}
