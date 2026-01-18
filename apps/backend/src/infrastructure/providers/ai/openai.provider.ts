import { openai } from '@ai-sdk/openai'
import type {
	AuthenticityCheck,
	Negotiation,
	NegotiationTone,
	Opportunity,
	OpportunitySignal,
	PhotoQuality,
} from '@vinted-ai/shared'
import { generateObject } from 'ai'
import { z } from 'zod'
import type {
	IAIProvider,
	NegotiationInput,
	OpportunityScoringInput,
	PhotoAnalysisInput,
	PhotoAnalysisResult,
} from '../../../application/interfaces/providers/ai.provider.interface'

/**
 * Zod schemas for structured AI outputs
 */
const photoQualitySchema = z.object({
	score: z.number().min(1).max(10),
	hasModel: z.boolean(),
	lighting: z.enum(['poor', 'average', 'good']),
	background: z.enum(['messy', 'neutral', 'professional']),
	issues: z.array(z.string()),
})

const authenticityCheckSchema = z.object({
	score: z.number().min(1).max(10),
	flags: z.array(z.string()),
	confidence: z.enum(['low', 'medium', 'high']),
})

const photoAnalysisResponseSchema = z.object({
	photoQuality: photoQualitySchema,
	authenticityCheck: authenticityCheckSchema,
	detectedBrand: z.string().nullable(),
	detectedModel: z.string().nullable(),
	estimatedCondition: z.string(),
})

const opportunitySignalSchema = z.object({
	type: z.enum(['positive', 'negative', 'neutral']),
	label: z.string(),
	detail: z.string(),
})

const opportunitySchema = z.object({
	score: z.number().min(1).max(10),
	margin: z.number(),
	marginPercent: z.number(),
	signals: z.array(opportunitySignalSchema),
})

const negotiationSchema = z.object({
	suggestedOffer: z.number(),
	script: z.string(),
	arguments: z.array(z.string()),
	tone: z.enum(['friendly', 'direct', 'urgent']),
})

/**
 * OpenAI provider implementation using Vercel AI SDK
 */
export class OpenAIProvider implements IAIProvider {
	private readonly model = 'gpt-4o'
	private readonly apiKey: string | undefined

	constructor(apiKey?: string) {
		this.apiKey = apiKey ?? process.env.OPENAI_API_KEY
	}

	getProviderName(): string {
		return 'openai'
	}

	async isAvailable(): Promise<boolean> {
		return !!this.apiKey
	}

	/**
	 * Analyze photos for quality and authenticity
	 */
	async analyzePhotos(input: PhotoAnalysisInput): Promise<PhotoAnalysisResult> {
		const { photoUrls, title, brand, condition, price } = input

		const prompt = `Tu es un expert en évaluation d'articles de mode pour la revente.

Analyse ces photos d'un article Vinted et fournis:

1. **Qualité Photo** (score 1-10):
   - Éclairage (poor/average/good)
   - Fond (messy/neutral/professional)
   - Présence mannequin ou porté
   - Problèmes détectés

2. **Authenticité** (score 1-10):
   - Logos visibles et qualité
   - Étiquettes (présentes, lisibles, cohérentes)
   - Finitions et coutures
   - Red flags éventuels
   - Niveau de confiance (low/medium/high)

3. **Identification**:
   - Marque détectée
   - Modèle si identifiable
   - État réel estimé

Contexte article:
- Titre: ${title}
- Marque déclarée: ${brand ?? 'Non spécifiée'}
- État déclaré: ${condition}
- Prix: ${price}€

Analyse les photos et réponds avec des informations structurées.`

		const imageContent = photoUrls.slice(0, 4).map((url) => ({
			type: 'image' as const,
			image: url,
		}))

		const { object } = await generateObject({
			model: openai(this.model),
			schema: photoAnalysisResponseSchema,
			messages: [
				{
					role: 'user',
					content: [{ type: 'text', text: prompt }, ...imageContent],
				},
			],
		})

		return {
			photoQuality: object.photoQuality as PhotoQuality,
			authenticityCheck: object.authenticityCheck as AuthenticityCheck,
			detectedBrand: object.detectedBrand,
			detectedModel: object.detectedModel,
			estimatedCondition: object.estimatedCondition,
		}
	}

	/**
	 * Calculate opportunity score based on multiple factors
	 */
	async scoreOpportunity(input: OpportunityScoringInput): Promise<Opportunity> {
		const {
			price,
			marketPriceLow,
			marketPriceHigh,
			marketPriceAvg,
			photoQualityScore,
			daysListed,
			sellerSalesCount,
			sellerRating,
			authenticityScore,
		} = input

		const prompt = `Tu es un expert en achat-revente streetwear/vintage.

Calcule le score d'opportunité (1-10) pour cet article:

**Article:**
- Prix demandé: ${price}€
- Prix marché estimé: ${marketPriceLow}€ - ${marketPriceHigh}€ (moyenne: ${marketPriceAvg}€)
- Qualité photos: ${photoQualityScore}/10 (photos amateur = opportunité car vendeur pas pro)
- Ancienneté annonce: ${daysListed} jours
- Vendeur: ${sellerSalesCount} ventes${sellerRating ? `, ${sellerRating}⭐` : ''}
- Score authenticité: ${authenticityScore}/10

**Signaux à évaluer:**
- Marge potentielle (poids: 35%)
- Photos amateur = vendeur pas pro (poids: 20%)
- Annonce ancienne = négociable (poids: 15%)
- Profil vendeur (poids: 15%)
- Authenticité (poids: 15%)

Fournis:
1. Score global 1-10
2. Liste de signaux (positifs/négatifs/neutres) avec détails
3. Marge estimée en € et %

Un score élevé (7+) indique une bonne opportunité d'achat pour revente.`

		const { object } = await generateObject({
			model: openai(this.model),
			schema: opportunitySchema,
			prompt,
		})

		return {
			score: object.score,
			margin: object.margin,
			marginPercent: object.marginPercent,
			signals: object.signals as OpportunitySignal[],
		}
	}

	/**
	 * Generate a negotiation script and suggested offer
	 */
	async generateNegotiation(input: NegotiationInput): Promise<Negotiation> {
		const { price, marketPriceAvg, daysListed, sellerSalesCount, condition, preferredTone } = input

		const toneInstruction = preferredTone
			? `Utilise un ton ${preferredTone === 'friendly' ? 'amical et chaleureux' : preferredTone === 'direct' ? 'direct et professionnel' : 'urgent mais poli'}.`
			: 'Choisis le ton le plus adapté à la situation.'

		const prompt = `Tu es un expert en négociation sur Vinted.

Génère un script de négociation pour cet article:

**Contexte:**
- Prix demandé: ${price}€
- Prix marché: ${marketPriceAvg}€
- Ancienneté annonce: ${daysListed} jours
- Profil vendeur: ${sellerSalesCount} ventes
- État: ${condition}

**Objectif:** Obtenir le meilleur prix possible tout en restant cordial.

${toneInstruction}

Fournis:
1. Prix d'offre suggéré (réaliste, généralement 15-25% sous le prix demandé selon le contexte)
2. Script prêt à copier/coller (en français)
3. 3-4 arguments clés à utiliser
4. Ton utilisé (friendly/direct/urgent)

Le script doit:
- Être poli mais ferme
- Mentionner un argument concret (prix marché, ancienneté, défaut)
- Proposer un prix précis
- Rester court (3-4 phrases max)`

		const { object } = await generateObject({
			model: openai(this.model),
			schema: negotiationSchema,
			prompt,
		})

		return {
			suggestedOffer: object.suggestedOffer,
			script: object.script,
			arguments: object.arguments,
			tone: object.tone as NegotiationTone,
		}
	}
}
