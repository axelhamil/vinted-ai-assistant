import { openai } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'
import { injectable } from 'inversify'
import { z } from 'zod'
import type {
	IAIMatcher,
	ImageAnalysisResult,
	MatchVerification,
	ScrapedListing,
} from '../../../application/interfaces/providers/source-research.provider.interface'

/**
 * Zod schema for match verification
 */
const matchVerificationSchema = z.object({
	isMatch: z.boolean(),
	confidence: z.number().min(0).max(100),
	matchDetails: z.object({
		brandMatch: z.boolean(),
		modelMatch: z.boolean(),
		conditionMatch: z.boolean(),
		sizeMatch: z.boolean(),
		colorMatch: z.boolean(),
	}),
	reason: z.string(),
})

const batchMatchResponseSchema = z.object({
	results: z.array(
		z.object({
			listingIndex: z.number(),
			verification: matchVerificationSchema,
		})
	),
})

/**
 * AI-powered listing matcher for verifying search result relevance
 */
@injectable()
export class AIMatcherProvider implements IAIMatcher {
	private readonly model = 'gpt-4o-mini' // Use faster model for matching

	/**
	 * Verify if listings match the original article
	 */
	async verifyMatches(
		listings: ScrapedListing[],
		originalContext: {
			title: string
			brand: string | null
			condition: string
			imageAnalysis: ImageAnalysisResult
		}
	): Promise<Array<ScrapedListing & { verification: MatchVerification }>> {
		if (listings.length === 0) {
			return []
		}

		// Process in batches of 10 to avoid token limits
		const batchSize = 10
		const results: Array<ScrapedListing & { verification: MatchVerification }> = []

		for (let i = 0; i < listings.length; i += batchSize) {
			const batch = listings.slice(i, i + batchSize)
			const batchResults = await this.processBatch(batch, originalContext, i)
			results.push(...batchResults)
		}

		// Sort by confidence score (highest first)
		return results.sort((a, b) => b.verification.confidence - a.verification.confidence)
	}

	/**
	 * Process a batch of listings
	 */
	private async processBatch(
		listings: ScrapedListing[],
		originalContext: {
			title: string
			brand: string | null
			condition: string
			imageAnalysis: ImageAnalysisResult
		},
		startIndex: number
	): Promise<Array<ScrapedListing & { verification: MatchVerification }>> {
		const { imageAnalysis, title, brand, condition } = originalContext

		const listingsDescription = listings
			.map(
				(l, idx) => `
[${startIndex + idx}] ${l.platform.toUpperCase()}
- Titre: ${l.title}
- Prix: ${l.price}€
- État: ${l.condition ?? 'Non spécifié'}
- URL: ${l.url}
`
			)
			.join('\n')

		const prompt = `Tu es un expert en matching d'articles de mode.

## ARTICLE ORIGINAL
- Titre: ${title}
- Marque: ${brand ?? imageAnalysis.brand ?? 'Non identifiée'}
- Modèle: ${imageAnalysis.model ?? 'Non identifié'}
- Catégorie: ${imageAnalysis.category}
- Couleurs: ${imageAnalysis.colors.join(', ') || 'Non spécifiées'}
- Matières: ${imageAnalysis.materials.join(', ') || 'Non spécifiées'}
- État: ${condition}
- Caractéristiques visuelles: ${imageAnalysis.searchQueries.visualFeatures}

## LISTINGS À VÉRIFIER
${listingsDescription}

## INSTRUCTIONS
Pour chaque listing, détermine s'il correspond au même article (ou très similaire):
1. **isMatch**: true si c'est probablement le même produit ou très similaire
2. **confidence**: score de 0-100 (100 = correspondance parfaite)
3. **matchDetails**: détaille les correspondances
   - brandMatch: même marque
   - modelMatch: même modèle ou très similaire
   - conditionMatch: état comparable
   - sizeMatch: taille compatible (si info disponible)
   - colorMatch: couleurs similaires
4. **reason**: explication courte (1 phrase)

CRITÈRES DE MATCHING:
- La marque doit correspondre (si identifiable)
- Le type d'article doit être le même
- Les caractéristiques visuelles principales doivent matcher
- Un score >= 70 indique une bonne correspondance
- Accepte les variations de nommage (Nike Air Max 90 = Air Max 90 Nike)

Retourne les résultats dans l'ordre des indices.`

		try {
			const { output } = await generateText({
				model: openai(this.model),
				output: Output.object({ schema: batchMatchResponseSchema }),
				prompt,
			})

			if (!output) {
				throw new Error('No output from AI')
			}

			return listings.map((listing, idx) => {
				const result = output.results.find((r) => r.listingIndex === startIndex + idx)
				const verification: MatchVerification = result?.verification ?? {
					isMatch: false,
					confidence: 0,
					matchDetails: {
						brandMatch: false,
						modelMatch: false,
						conditionMatch: false,
						sizeMatch: false,
						colorMatch: false,
					},
					reason: 'Vérification échouée',
				}

				return {
					...listing,
					relevanceScore: verification.confidence,
					verification,
				}
			})
		} catch (error) {
			console.error('[AIMatcher] Batch verification failed:', error)
			// Return all listings with low confidence on error
			return listings.map((listing) => ({
				...listing,
				relevanceScore: 30,
				verification: {
					isMatch: true, // Keep them but with low confidence
					confidence: 30,
					matchDetails: {
						brandMatch: false,
						modelMatch: false,
						conditionMatch: false,
						sizeMatch: false,
						colorMatch: false,
					},
					reason: 'Vérification automatique - confiance faible',
				},
			}))
		}
	}
}
