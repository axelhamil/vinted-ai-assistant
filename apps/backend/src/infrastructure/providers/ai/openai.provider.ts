import { openai } from '@ai-sdk/openai'
import type {
	AuthenticityCheck,
	Negotiation,
	NegotiationTone,
	Opportunity,
	OpportunitySignal,
	PhotoQuality,
} from '@vinted-ai/shared/analysis'
import { generateText, Output } from 'ai'
import { injectable } from 'inversify'
import { z } from 'zod'
import type {
	CompleteAnalysisInput,
	CompleteAnalysisResult,
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

const marketPriceEstimationSchema = z.object({
	low: z.number(),
	high: z.number(),
	average: z.number(),
	confidence: z.enum(['low', 'medium', 'high']),
	reasoning: z.string(),
	retailPrice: z.number().optional(),
})

const photoAnalysisResponseSchema = z.object({
	photoQuality: photoQualitySchema,
	authenticityCheck: authenticityCheckSchema,
	detectedBrand: z.string().nullable(),
	detectedModel: z.string().nullable(),
	estimatedCondition: z.string(),
	marketPriceEstimation: marketPriceEstimationSchema,
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
 * Complete analysis schema (single AI call - all results combined)
 */
const completeAnalysisSchema = z.object({
	// Photo quality
	photoQuality: photoQualitySchema,
	// Authenticity
	authenticityCheck: authenticityCheckSchema,
	// Detection
	detectedBrand: z.string().nullable(),
	detectedModel: z.string().nullable(),
	estimatedCondition: z.string(),
	// Market price
	marketPriceEstimation: marketPriceEstimationSchema,
	// Opportunity
	opportunity: opportunitySchema,
	// Negotiation
	negotiation: negotiationSchema,
})

/**
 * Download an image and convert to base64 data URL
 */
async function downloadImageAsBase64(url: string): Promise<string | null> {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
				'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
				Referer: 'https://www.vinted.fr/',
			},
		})

		if (!response.ok) {
			return null
		}

		const arrayBuffer = await response.arrayBuffer()
		const base64 = Buffer.from(arrayBuffer).toString('base64')
		const contentType = response.headers.get('content-type') || 'image/webp'

		return `data:${contentType};base64,${base64}`
	} catch {
		return null
	}
}

/**
 * OpenAI provider implementation using Vercel AI SDK
 */
@injectable()
export class OpenAIProvider implements IAIProvider {
	private readonly model = 'gpt-4o'
	private readonly apiKey: string | undefined = process.env.OPENAI_API_KEY

	getProviderName(): string {
		return 'openai'
	}

	async isAvailable(): Promise<boolean> {
		return !!this.apiKey
	}

	/**
	 * Complete analysis in a single AI call (optimized)
	 * Combines: photo analysis + opportunity scoring + negotiation generation
	 */
	async analyzeComplete(input: CompleteAnalysisInput): Promise<CompleteAnalysisResult> {
		const { photoUrls, title, brand, condition, price, daysListed } = input

		const prompt = `Tu es un expert en évaluation d'articles de mode pour la revente sur Vinted, spécialisé dans l'estimation des prix et l'analyse d'opportunités.

Analyse ces photos d'un article Vinted et fournis une analyse COMPLÈTE incluant:

## 1. QUALITÉ PHOTO (score 1-10)
- Éclairage (poor/average/good)
- Fond (messy/neutral/professional)
- Présence mannequin ou porté (hasModel: true/false)
- Problèmes détectés (issues: tableau de strings)

## 2. AUTHENTICITÉ (score 1-10)
- Logos visibles et qualité
- Étiquettes (présentes, lisibles, cohérentes)
- Finitions et coutures
- Red flags éventuels (flags: tableau de strings)
- Niveau de confiance (low/medium/high)

## 3. IDENTIFICATION
- Marque détectée (detectedBrand, peut être null)
- Modèle précis si identifiable (detectedModel, peut être null)
- État réel estimé (estimatedCondition)

## 4. ESTIMATION PRIX MARCHÉ
- **low**: Prix minimum (vente rapide)
- **high**: Prix maximum (patience)
- **average**: Prix moyen réaliste
- **confidence**: Ta confiance (low/medium/high)
- **reasoning**: Explication (2-3 phrases)
- **retailPrice**: Prix neuf si marque connue (optionnel)

## 5. SCORE OPPORTUNITÉ (1-10)
Calcule en fonction de:
- Marge potentielle = average - prix demandé (poids: 40%)
- Photos amateur = opportunité car vendeur pas pro (poids: 25%)
- Annonce ancienne = négociable (poids: 20%)
- Authenticité (poids: 15%)

Fournis:
- score: 1-10 (7+ = bonne opportunité)
- margin: marge en € (average - prix)
- marginPercent: marge en %
- signals: liste de signaux [{type: positive/negative/neutral, label: string, detail: string}]

## 6. NÉGOCIATION
Génère un script de négociation:
- suggestedOffer: prix d'offre suggéré (15-25% sous le prix demandé selon contexte)
- script: message prêt à copier (français, 3-4 phrases, poli mais ferme)
- arguments: 3-4 arguments clés
- tone: friendly/direct/urgent (choisis le plus adapté)

---

**Contexte article:**
- Titre: ${title}
- Marque déclarée: ${brand ?? 'Non spécifiée'}
- État déclaré: ${condition}
- Prix demandé: ${price}€
- Ancienneté annonce: ${daysListed} jours

IMPORTANT: Sois précis et réaliste. Base-toi sur ta connaissance du marché de la mode d'occasion en France.`

		// Download images
		const imagePromises = photoUrls.slice(0, 4).map(downloadImageAsBase64)
		const base64Images = await Promise.all(imagePromises)
		const validImages = base64Images.filter((img): img is string => img !== null)

		if (validImages.length === 0) {
			throw new Error('Failed to download any images for analysis')
		}

		const imageContent = validImages.map((dataUrl) => ({
			type: 'image' as const,
			image: dataUrl,
		}))

		const { output } = await generateText({
			model: openai(this.model),
			output: Output.object({ schema: completeAnalysisSchema }),
			messages: [
				{
					role: 'user',
					content: [{ type: 'text', text: prompt }, ...imageContent],
				},
			],
		})

		if (!output) {
			throw new Error('Failed to generate complete analysis output')
		}

		return {
			photoQuality: output.photoQuality as PhotoQuality,
			authenticityCheck: output.authenticityCheck as AuthenticityCheck,
			detectedBrand: output.detectedBrand,
			detectedModel: output.detectedModel,
			estimatedCondition: output.estimatedCondition,
			marketPriceEstimation: {
				low: output.marketPriceEstimation.low,
				high: output.marketPriceEstimation.high,
				average: output.marketPriceEstimation.average,
				confidence: output.marketPriceEstimation.confidence as 'low' | 'medium' | 'high',
				reasoning: output.marketPriceEstimation.reasoning,
				retailPrice: output.marketPriceEstimation.retailPrice,
			},
			opportunity: {
				score: output.opportunity.score,
				margin: output.opportunity.margin,
				marginPercent: output.opportunity.marginPercent,
				signals: output.opportunity.signals as OpportunitySignal[],
			},
			negotiation: {
				suggestedOffer: output.negotiation.suggestedOffer,
				script: output.negotiation.script,
				arguments: output.negotiation.arguments,
				tone: output.negotiation.tone as NegotiationTone,
			},
		}
	}

	/**
	 * Analyze photos for quality and authenticity
	 * @deprecated Use analyzeComplete() for better performance
	 */
	async analyzePhotos(input: PhotoAnalysisInput): Promise<PhotoAnalysisResult> {
		const { photoUrls, title, brand, condition, price } = input

		const prompt = `Tu es un expert en évaluation d'articles de mode pour la revente sur Vinted, spécialisé dans l'estimation des prix de marché.

Analyse ces photos d'un article Vinted et fournis:

## 1. QUALITÉ PHOTO (score 1-10)
- Éclairage (poor/average/good)
- Fond (messy/neutral/professional)
- Présence mannequin ou porté
- Problèmes détectés

## 2. AUTHENTICITÉ (score 1-10)
- Logos visibles et qualité
- Étiquettes (présentes, lisibles, cohérentes)
- Finitions et coutures
- Red flags éventuels
- Niveau de confiance (low/medium/high)

## 3. IDENTIFICATION
- Marque détectée (regarde bien les logos, étiquettes)
- Modèle précis si identifiable (ex: "Air Max 90", "Speedy 30")
- État réel estimé

## 4. ESTIMATION PRIX MARCHÉ (TRÈS IMPORTANT)
Estime le prix de revente réaliste sur Vinted/marché secondaire français:
- **low**: Prix minimum (vente rapide, négociation)
- **high**: Prix maximum (patience, bon état)
- **average**: Prix moyen réaliste
- **confidence**: Ta confiance dans l'estimation (low/medium/high)
- **reasoning**: Explique ton raisonnement (2-3 phrases)
- **retailPrice**: Prix neuf si c'est une marque connue (optionnel)

Pour l'estimation, prends en compte:
- La marque et le modèle identifiés
- L'état visible sur les photos
- Les prix habituels sur Vinted pour ce type d'article
- La demande pour ce type de produit
- Si c'est une pièce rare/collector ou commune

Contexte article:
- Titre vendeur: ${title}
- Marque déclarée: ${brand ?? 'Non spécifiée'}
- État déclaré: ${condition}
- Prix demandé: ${price}€

IMPORTANT: Sois précis et réaliste dans ton estimation de prix. Base-toi sur ta connaissance du marché de la mode d'occasion en France.`

		// Download images and convert to base64 (OpenAI cannot access Vinted CDN directly)
		const imagePromises = photoUrls.slice(0, 4).map(downloadImageAsBase64)
		const base64Images = await Promise.all(imagePromises)
		const validImages = base64Images.filter((img): img is string => img !== null)

		if (validImages.length === 0) {
			throw new Error('Failed to download any images for analysis')
		}

		const imageContent = validImages.map((dataUrl) => ({
			type: 'image' as const,
			image: dataUrl,
		}))

		const { output } = await generateText({
			model: openai(this.model),
			output: Output.object({ schema: photoAnalysisResponseSchema }),
			messages: [
				{
					role: 'user',
					content: [{ type: 'text', text: prompt }, ...imageContent],
				},
			],
		})

		if (!output) {
			throw new Error('Failed to generate photo analysis output')
		}

		return {
			photoQuality: output.photoQuality as PhotoQuality,
			authenticityCheck: output.authenticityCheck as AuthenticityCheck,
			detectedBrand: output.detectedBrand,
			detectedModel: output.detectedModel,
			estimatedCondition: output.estimatedCondition,
			marketPriceEstimation: {
				low: output.marketPriceEstimation.low,
				high: output.marketPriceEstimation.high,
				average: output.marketPriceEstimation.average,
				confidence: output.marketPriceEstimation.confidence as 'low' | 'medium' | 'high',
				reasoning: output.marketPriceEstimation.reasoning,
				retailPrice: output.marketPriceEstimation.retailPrice,
			},
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

		const { output } = await generateText({
			model: openai(this.model),
			output: Output.object({ schema: opportunitySchema }),
			prompt,
		})

		if (!output) {
			throw new Error('Failed to generate opportunity score output')
		}

		return {
			score: output.score,
			margin: output.margin,
			marginPercent: output.marginPercent,
			signals: output.signals as OpportunitySignal[],
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

		const { output } = await generateText({
			model: openai(this.model),
			output: Output.object({ schema: negotiationSchema }),
			prompt,
		})

		if (!output) {
			throw new Error('Failed to generate negotiation output')
		}

		return {
			suggestedOffer: output.suggestedOffer,
			script: output.script,
			arguments: output.arguments,
			tone: output.tone as NegotiationTone,
		}
	}
}
