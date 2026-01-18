import { google } from '@ai-sdk/google'
import type {
	AuthenticityCheck,
	Negotiation,
	NegotiationTone,
	Opportunity,
	OpportunitySignal,
	PhotoQuality,
} from '@vinted-ai/shared/analysis'
import { generateText, Output, stepCountIs } from 'ai'
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

const marketPriceSourceSchema = z.object({
	name: z.string(),
	price: z.number(),
	searchQuery: z.string().optional(),
	count: z.number().optional(),
})

const marketPriceEstimationSchema = z.object({
	low: z.number(),
	high: z.number(),
	average: z.number(),
	confidence: z.enum(['low', 'medium', 'high']),
	reasoning: z.string(),
	retailPrice: z.number().optional(),
	sources: z.array(marketPriceSourceSchema).optional(),
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
 * Complete analysis schema (single AI call)
 */
const completeAnalysisSchema = z.object({
	photoQuality: photoQualitySchema,
	authenticityCheck: authenticityCheckSchema,
	detectedBrand: z.string().nullable(),
	detectedModel: z.string().nullable(),
	estimatedCondition: z.string(),
	marketPriceEstimation: marketPriceEstimationSchema,
	opportunity: opportunitySchema,
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
 * Gemini provider implementation using Vercel AI SDK
 */
@injectable()
export class GeminiProvider implements IAIProvider {
	private readonly model = 'gemini-3-flash-preview'
	private readonly apiKey: string | undefined = process.env.GEMINI_API_KEY

	getProviderName(): string {
		return 'gemini'
	}

	async isAvailable(): Promise<boolean> {
		return !!this.apiKey
	}

	/**
	 * Get language instruction for the AI prompt
	 */
	private getLanguageInstruction(language: string): string {
		const languageNames: Record<string, string> = {
			fr: 'français',
			en: 'English',
			de: 'Deutsch',
			es: 'español',
			it: 'italiano',
			nl: 'Nederlands',
			pl: 'polski',
			pt: 'português',
			cs: 'čeština',
			sk: 'slovenčina',
			hu: 'magyar',
			ro: 'română',
			lt: 'lietuvių',
			hr: 'hrvatski',
		}

		const languageName = languageNames[language] || languageNames['fr']
		return `LANGUE DE RÉPONSE OBLIGATOIRE: ${languageName}. Tous les champs textuels (reasoning, script, arguments, issues, flags, signals.label, signals.detail) DOIVENT être rédigés en ${languageName}.`
	}

	/**
	 * Complete analysis in a single AI call (optimized)
	 */
	async analyzeComplete(input: CompleteAnalysisInput): Promise<CompleteAnalysisResult> {
		const { photoUrls, title, brand, condition, price, daysListed, language = 'fr', size } = input

		const languageInstruction = this.getLanguageInstruction(language)

		const prompt = `# RÔLE ET EXPERTISE

Tu es un expert en achat-revente sur Vinted avec 5+ ans d'expérience. Tu connais parfaitement:
- Les prix du marché secondaire français (Vinted, Vestiaire Collective, Leboncoin)
- Les techniques d'authentification visuelle par marque
- La psychologie des vendeurs Vinted et les signaux d'opportunité
- Les stratégies de négociation efficaces

${languageInstruction}

---

# ARTICLE À ANALYSER

| Champ | Valeur |
|-------|--------|
| Titre annonce | ${title} |
| Marque déclarée | ${brand ?? 'Non spécifiée'} |
| État déclaré | ${condition} |
| Prix demandé | ${price}€ |
| En ligne depuis | ${daysListed} jour(s) |
| Taille | ${size ?? 'Non spécifiée'} |

---

# INSTRUCTIONS D'ANALYSE

## 1. QUALITÉ PHOTO (photoQuality)

Évalue la qualité des photos comme indicateur du professionnalisme du vendeur.

**Grille de scoring:**
- 9-10: Photos pro (studio, mannequin, plusieurs angles, zoom détails)
- 7-8: Bonnes photos (lumière naturelle, fond neutre, article bien visible)
- 5-6: Photos correctes (quelques défauts mais article identifiable)
- 3-4: Photos médiocres (sombres, floues, ou mal cadrées)
- 1-2: Photos inutilisables (impossible d'évaluer l'article)

**Critères:**
- \`lighting\`: "poor" (sombre/flash direct/contre-jour) | "average" (correct mais pas optimal) | "good" (lumière naturelle ou studio)
- \`background\`: "messy" (lit défait, désordre visible) | "neutral" (mur blanc, sol simple) | "professional" (fond photo, mannequin)
- \`hasModel\`: true si porté sur personne ou mannequin
- \`issues\`: Liste UNIQUEMENT les problèmes concrets observés (ex: "Photo principale floue", "Étiquette non visible", "Pas de photo des défauts mentionnés")

## 2. AUTHENTICITÉ (authenticityCheck)

Évalue la probabilité que l'article soit authentique.

**Grille de scoring:**
- 9-10: Authentique certain (tous les marqueurs présents et conformes)
- 7-8: Très probablement authentique (marqueurs principaux OK)
- 5-6: Probable authentique (quelques éléments vérifiables)
- 3-4: Doutes sérieux (incohérences ou marqueurs manquants)
- 1-2: Probablement contrefaçon (red flags multiples)

**Points de contrôle par type:**
- Luxe (LV, Gucci, Chanel...): Logo, coutures, quincaillerie, numéro de série, made in, doublure
- Streetwear (Nike, Adidas, Supreme...): Étiquettes, tags, finitions, typo
- Fast fashion (Zara, H&M...): Généralement authentique, vérifier l'état

**Champs:**
- \`flags\`: Liste des éléments suspects OU rassurants (ex: "Logo bien centré ✓", "Coutures régulières ✓", "Étiquette composition absente ⚠")
- \`confidence\`: "low" (photos insuffisantes) | "medium" (évaluation partielle possible) | "high" (tous éléments visibles)

## 3. IDENTIFICATION (detectedBrand, detectedModel, estimatedCondition)

**detectedBrand:**
- Identifie la marque RÉELLE visible sur les photos (logos, étiquettes)
- null si aucune marque identifiable
- Peut différer de la marque déclarée par le vendeur

**detectedModel:**
- Nom précis du modèle si identifiable (ex: "Air Force 1 '07", "Speedy 25", "Chuck Taylor All Star")
- null si modèle non identifiable (article générique sans référence connue)

**estimatedCondition:**
- Décris l'état RÉEL observé en 2-3 mots (ex: "Très bon état", "Traces d'usure légères", "État neuf avec étiquettes")

## 4. ESTIMATION PRIX MARCHÉ (marketPriceEstimation)

**CRUCIAL: Base-toi sur les prix RÉELS de vente sur Vinted FR, pas les prix demandés.**

**Méthodologie:**
1. Identifie la catégorie exacte (marque + type + état)
2. Estime les prix de vente constatés (pas les prix affichés)
3. Ajuste selon l'état observé sur les photos

**Champs:**
- \`low\`: Prix de vente rapide (acheteur pressé, négociation max) - environ -20% du average
- \`high\`: Prix plafond réaliste (patience, état parfait) - environ +20% du average
- \`average\`: Prix de vente médian réaliste pour cet article dans cet état
- \`confidence\`: "low" (article rare/difficilement comparable) | "medium" (quelques références) | "high" (marché bien connu)
- \`reasoning\`: Explique ta logique en 1-2 phrases (mentionne des comparables si possible)
- \`retailPrice\`: Prix neuf boutique si applicable (null pour articles vintage/sans référence)

## 5. SCORE OPPORTUNITÉ (opportunity)

Évalue l'intérêt d'acheter cet article pour le revendre avec marge.

**Formule de scoring:**
\`\`\`
score = (marge_score × 0.35) + (photo_amateur_score × 0.20) + (anciennete_score × 0.15) + (authenticite_score × 0.15) + (taille_score × 0.15)
\`\`\`

**Composantes:**

| Facteur | Poids | Scoring |
|---------|-------|---------|
| Marge potentielle | 35% | >40%: 10pts, 30-40%: 8pts, 20-30%: 6pts, 10-20%: 4pts, <10%: 2pts |
| Photos amateur | 20% | Photos médiocres = vendeur pas pro = négociable → Score inversé (mauvaises photos = plus de points) |
| Ancienneté | 15% | >30j: 10pts, 15-30j: 7pts, 7-14j: 5pts, <7j: 3pts |
| Authenticité | 15% | Score authenticité × 1 |
| Taille | 15% | Voir barème ci-dessous |

**IMPACT DE LA TAILLE (15%):**

Les tailles M et L sont les plus demandées et se revendent mieux/plus vite.

| Taille | Points | Raison |
|--------|--------|--------|
| M, L | 10 pts | Tailles les plus recherchées, revente rapide |
| S, XL | 6 pts | Tailles standard, marché correct |
| XS, XXL+ | 3 pts | Marché plus restreint, revente plus longue |

**Exceptions:**
- Luxe/Vintage rare: toutes tailles se vendent bien (pas de malus)
- Articles unisex: M/L encore plus valorisés
- Chaussures: 40-44 = premium (10pts), 38-39 ou 45-46 = standard (6pts), <38 ou >46 = pénalité (3pts)

**Champs:**
- \`score\`: Score final 1-10 (arrondi)
- \`margin\`: marketPriceEstimation.average - prix demandé (en €, peut être négatif)
- \`marginPercent\`: (margin / prix demandé) × 100
- \`signals\`: 3-5 signaux avec:
  - \`type\`: "positive" (opportunité), "negative" (risque), "neutral" (info)
  - \`label\`: Titre court (ex: "Marge attractive", "Photos amateur", "Article récent", "Taille populaire")
  - \`detail\`: Explication actionable (ex: "Prix 35% sous le marché, bonne marge après frais Vinted")

**Ajoute un signal sur la taille si pertinent:**
- Taille M/L → signal positif "Taille populaire"
- Taille XS/XXL+ → signal négatif "Taille peu demandée"

## 6. NÉGOCIATION (negotiation)

Génère une stratégie de négociation adaptée au contexte.

**Calcul du suggestedOffer:**
- Si marge déjà bonne (>25%): Offre à -10/15% du prix demandé
- Si marge moyenne (10-25%): Offre à -20% du prix demandé
- Si marge faible (<10%): Offre à -25/30% du prix demandé
- Jamais en dessous de marketPriceEstimation.low - 10%

**Choix du tone:**
- \`friendly\`: Annonce récente (<7j), vendeur actif → Approche douce
- \`direct\`: Annonce 7-21j, vendeur avec stock → Aller droit au but
- \`urgent\`: Annonce >21j → Créer de l'urgence ("je peux payer tout de suite")

**Script (3-4 phrases max):**
1. Accroche personnalisée (mentionne l'article)
2. Justification de l'offre (argument factuel)
3. Proposition de prix
4. Ouverture (montrer flexibilité si proche)

**Arguments (3-4):**
Fournis des arguments FACTUELS et VÉRIFIABLES que l'acheteur peut utiliser:
- Prix marché observés
- Ancienneté de l'annonce
- Défauts visibles
- Comparaisons avec autres annonces

---

# EXEMPLE DE RAISONNEMENT (ne pas reproduire, juste comprendre la logique)

Article: Nike Air Max 90, état "Bon", 45€, en ligne 23 jours

→ Photos: 5/10 (amateur, fond chambre, mais article visible)
→ Authenticité: 8/10 (Nike courant, étiquettes visibles, cohérent)
→ Prix marché: 55-75€ (average 65€) pour AM90 bon état
→ Opportunité: 8/10 (marge +44%, photos amateur, annonce ancienne)
→ Négo: Offre 38€, ton urgent ("Bonjour, je suis intéressé par vos Air Max. Je vois qu'elles sont en vente depuis 3 semaines, je vous propose 38€ avec paiement immédiat. Dites-moi si ça vous convient !")

---

## 7. SOURCES - RECHERCHE APPROFONDIE (marketPriceEstimation.sources)

**INSTRUCTION CRITIQUE:** Tu DOIS utiliser Google Search pour trouver AU MINIMUM 8-10 sources de prix différentes. Compare visuellement chaque résultat avec les photos de l'article pour vérifier la pertinence.

**Méthodologie de recherche:**
1. Effectue plusieurs recherches Google avec des variantes:
   - "[marque] [modèle] occasion prix"
   - "[marque] [modèle] vinted"
   - "[marque] [modèle] vestiaire collective"
   - "[titre annonce] prix"
   - "[marque] [type article] [taille] seconde main"

2. Pour chaque résultat trouvé:
   - Vérifie visuellement que l'article correspond aux photos (même modèle, état similaire)
   - Note le prix de VENTE réel (pas le prix demandé)
   - Identifie la plateforme source

3. Sources à consulter obligatoirement:
   - Vinted FR (prioritaire)
   - Vestiaire Collective
   - Leboncoin
   - Ebay FR
   - Google Shopping
   - Videdressing
   - Depop (si pertinent)
   - Marketplace Facebook
   - Sites officiels (pour prix neuf de référence)

**Format pour chaque source:**
- \`name\`: Nom de la source (ex: "Vinted FR", "Vestiaire Collective", "Google Shopping")
- \`price\`: Prix moyen/médian trouvé sur cette source (après comparaison visuelle)
- \`searchQuery\`: La requête de recherche exacte utilisée
- \`count\`: Nombre d'articles similaires trouvés sur cette source

**IMPORTANT:** Ne liste QUE les sources où tu as trouvé des articles VISUELLEMENT similaires aux photos. Minimum 8 sources, maximum 12.

---

Analyse maintenant les photos fournies avec cette méthodologie. Utilise Google Search de manière intensive pour trouver un maximum de sources de prix comparables.`

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

		// Use generateText with Output.object() to combine structured output with Google Search grounding
		const { output } = await generateText({
			model: google(this.model),
			output: Output.object({ schema: completeAnalysisSchema }),
			tools: {
				// Enable Google Search for real-time price data grounding
				google_search: google.tools.googleSearch({}),
			},
			// Allow 15 steps: multiple search calls for 8-10 sources + structured output generation
			stopWhen: stepCountIs(15),
			messages: [
				{
					role: 'user',
					content: [{ type: 'text', text: prompt }, ...imageContent],
				},
			],
		})

		if (!output) {
			throw new Error('Failed to generate structured analysis output')
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
				sources: output.marketPriceEstimation.sources,
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
	 * Analyze photos for quality, authenticity, and market price estimation
	 * @deprecated Use analyzeComplete() for better performance
	 */
	async analyzePhotos(input: PhotoAnalysisInput): Promise<PhotoAnalysisResult> {
		const { photoUrls, title, brand, condition, price } = input

		const prompt = `# RÔLE

Tu es un expert en authentification et évaluation d'articles de mode pour le marché secondaire français (Vinted, Vestiaire Collective).

---

# ARTICLE

- Titre: ${title}
- Marque déclarée: ${brand ?? 'Non spécifiée'}
- État déclaré: ${condition}
- Prix demandé: ${price}€

---

# TÂCHES

## 1. QUALITÉ PHOTO (score 1-10)

| Score | Description |
|-------|-------------|
| 9-10 | Photos professionnelles (studio, mannequin, tous angles) |
| 7-8 | Bonnes photos amateur (lumière naturelle, fond propre) |
| 5-6 | Photos acceptables (quelques défauts, article visible) |
| 3-4 | Photos médiocres (sombres, floues, mal cadrées) |
| 1-2 | Photos inutilisables |

Renseigne: lighting (poor/average/good), background (messy/neutral/professional), hasModel (bool), issues (liste des problèmes concrets).

## 2. AUTHENTICITÉ (score 1-10)

**Critères par catégorie:**
- Luxe: Qualité logo, coutures, quincaillerie, made in, serial
- Streetwear: Étiquettes, tags, finitions, typo conforme
- Fast fashion: Généralement OK, vérifier cohérence

| Score | Interprétation |
|-------|----------------|
| 9-10 | Authentique (tous marqueurs conformes) |
| 7-8 | Très probable (marqueurs principaux OK) |
| 5-6 | Probable (évaluation partielle) |
| 3-4 | Doutes (incohérences détectées) |
| 1-2 | Suspect (red flags multiples) |

Renseigne: flags (éléments observés ✓ ou suspects ⚠), confidence (low/medium/high selon visibilité).

## 3. IDENTIFICATION

- detectedBrand: Marque RÉELLE visible (peut différer de la déclarée). null si non identifiable.
- detectedModel: Modèle précis si connu (ex: "Stan Smith", "Neverfull MM"). null sinon.
- estimatedCondition: État réel en 2-3 mots.

## 4. ESTIMATION PRIX MARCHÉ

**IMPORTANT: Prix de VENTE réels sur Vinted FR, pas prix affichés.**

- low: Prix vente rapide (-20% du average)
- high: Prix max patience (+20% du average)
- average: Prix médian réaliste pour cet article dans cet état
- confidence: low (rare) / medium (quelques refs) / high (marché connu)
- reasoning: Justification 1-2 phrases avec comparables si possible
- retailPrice: Prix neuf si applicable

---

Analyse les photos fournies.`

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
			model: google(this.model),
			output: Output.object({ schema: photoAnalysisResponseSchema }),
			tools: {
				google_search: google.tools.googleSearch({}),
			},
			stopWhen: stepCountIs(5),
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

		const prompt = `# RÔLE

Tu es un expert en achat-revente mode avec une approche data-driven. Tu calcules des scores d'opportunité pour identifier les bonnes affaires.

---

# DONNÉES ARTICLE

| Métrique | Valeur |
|----------|--------|
| Prix demandé | ${price}€ |
| Prix marché LOW | ${marketPriceLow}€ |
| Prix marché HIGH | ${marketPriceHigh}€ |
| Prix marché AVG | ${marketPriceAvg}€ |
| Qualité photos | ${photoQualityScore}/10 |
| Jours en ligne | ${daysListed} |
| Ventes vendeur | ${sellerSalesCount} |
| Note vendeur | ${sellerRating ? `${sellerRating}⭐` : 'N/A'} |
| Score authenticité | ${authenticityScore}/10 |

---

# CALCUL DU SCORE

## Formule pondérée

\`\`\`
SCORE_FINAL = (MARGE × 0.35) + (PHOTO_AMATEUR × 0.20) + (ANCIENNETÉ × 0.15) + (VENDEUR × 0.15) + (AUTHENTICITÉ × 0.15)
\`\`\`

## Barèmes de conversion

### 1. MARGE (35%)
- Marge = (marketPriceAvg - price) / price × 100
- >40%: 10pts | 30-40%: 8pts | 20-30%: 6pts | 10-20%: 4pts | 0-10%: 2pts | <0%: 0pts

### 2. PHOTOS AMATEUR (20%) — SCORE INVERSÉ
- Photos amateur = vendeur pas expert = plus négociable
- photoQualityScore ≤3: 10pts | 4-5: 8pts | 6-7: 5pts | 8-9: 2pts | 10: 0pts

### 3. ANCIENNETÉ (15%)
- Plus c'est vieux, plus le vendeur veut vendre
- >30j: 10pts | 21-30j: 8pts | 14-20j: 6pts | 7-13j: 4pts | <7j: 2pts

### 4. PROFIL VENDEUR (15%)
- Peu de ventes = moins d'expérience en négo
- 0-5 ventes: 10pts | 6-20: 7pts | 21-50: 5pts | 51-100: 3pts | >100: 1pt

### 5. AUTHENTICITÉ (15%)
- Reprendre le score tel quel

---

# OUTPUT

## Calculs à fournir
- score: Score final arrondi (1-10)
- margin: marketPriceAvg - price (en €)
- marginPercent: (margin / price) × 100

## Signaux (3-5 éléments)
Pour chaque signal:
- type: "positive" (favorable à l'achat), "negative" (risque), "neutral" (info)
- label: Titre court (max 4 mots)
- detail: Explication actionable (1 phrase)

**Exemples de signaux positifs:**
- "Marge +35%" → "Prix 35% sous le marché, marge confortable après frais"
- "Photos amateur" → "Vendeur non-pro, négociation facilitée"
- "En ligne 45 jours" → "Annonce ancienne, vendeur probablement pressé de vendre"

**Exemples de signaux négatifs:**
- "Marge faible" → "Seulement 8% de marge, peu rentable après frais Vinted"
- "Vendeur expérimenté" → "200+ ventes, connaît les prix et négocie peu"

**Exemples de signaux neutres:**
- "Authenticité à vérifier" → "Score authenticité moyen, demander photos supplémentaires"

---

Calcule le score et génère les signaux.`

		const { output } = await generateText({
			model: google(this.model),
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

		const prompt = `# RÔLE

Tu es un expert en négociation sur Vinted. Tu génères des scripts de négociation efficaces qui maximisent les chances d'obtenir une réduction tout en restant cordial.

---

# CONTEXTE DE L'ANNONCE

| Donnée | Valeur |
|--------|--------|
| Prix demandé | ${price}€ |
| Prix marché estimé | ${marketPriceAvg}€ |
| Jours en ligne | ${daysListed} |
| Ventes du vendeur | ${sellerSalesCount} |
| État déclaré | ${condition} |
| Ton demandé | ${preferredTone ?? 'À déterminer selon contexte'} |

---

# STRATÉGIE DE NÉGOCIATION

## Calcul de l'offre (suggestedOffer)

**Règle de base:** Ne jamais offrir moins que 70% du prix demandé (sauf si prix très au-dessus du marché).

| Situation | Réduction à proposer | Justification |
|-----------|---------------------|---------------|
| Prix > marché +20% | -25 à -30% | Prix clairement trop élevé |
| Prix = marché ±10% | -15 à -20% | Négociation standard |
| Prix < marché -10% | -10 à -15% | Déjà bien placé, petite négo |
| Prix < marché -25% | -5% ou prix demandé | Très bonne affaire, ne pas risquer de perdre |

**Ajustements:**
- Annonce >21 jours: +5% de réduction (vendeur pressé)
- Vendeur <10 ventes: +5% de réduction (moins d'expérience)
- État "Neuf avec étiquettes": -5% de réduction (premium justifié)

## Choix du ton

${
	preferredTone
		? `**Ton imposé:** ${preferredTone}`
		: `**Sélection automatique:**
- \`friendly\`: Annonce récente (<7j) OU vendeur actif (>50 ventes) → Approche douce, créer le contact
- \`direct\`: Annonce 7-21j ET vendeur moyen (10-50 ventes) → Efficace, pas de fioritures
- \`urgent\`: Annonce >21j OU vendeur débutant (<10 ventes) → Créer l'urgence ("paiement immédiat")`
}

---

# FORMAT DU SCRIPT

**Structure obligatoire (3-4 phrases):**

1. **Accroche** — Montre l'intérêt pour l'article spécifique
2. **Justification** — UN argument factuel pour l'offre basse
3. **Proposition** — Prix précis + avantage pour le vendeur
4. **Ouverture** — Montre de la flexibilité

**Exemples par ton:**

### Friendly
"Bonjour ! Votre [article] me plaît beaucoup, je cherchais exactement ce modèle. Je me permets de vous proposer [X]€ car j'en ai vu plusieurs à ce prix récemment. Je peux payer tout de suite si ça vous convient ! N'hésitez pas à me faire signe 😊"

### Direct
"Bonjour, intéressé par votre article. Je vous propose [X]€ — c'est le prix marché actuel pour ce type de pièce dans cet état. Paiement immédiat possible. Qu'en pensez-vous ?"

### Urgent
"Bonjour ! Je vois que votre article est en vente depuis [N] semaines. Je suis acheteur sérieux et je vous propose [X]€ avec paiement dans l'heure. C'est une offre ferme, dites-moi si ça vous intéresse."

---

# ARGUMENTS DE NÉGOCIATION

Fournis 3-4 arguments FACTUELS que l'acheteur peut utiliser si le vendeur refuse:

**Types d'arguments efficaces:**
- Prix marché: "J'ai vu des articles similaires vendus entre X et Y€ récemment"
- Ancienneté: "L'annonce est en ligne depuis X semaines/jours"
- État: "L'article présente [défaut visible], ce qui justifie un prix plus bas"
- Volume: "Je suis intéressé par plusieurs de vos articles si on s'entend sur les prix"
- Rapidité: "Je peux payer immédiatement, vous évitez l'attente"

**Arguments à éviter:**
- Comparaison avec contrefaçons
- Critique du vendeur
- Mensonges ("j'ai un budget limité" si faux)
- Pression agressive

---

Génère la stratégie de négociation.`

		const { output } = await generateText({
			model: google(this.model),
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
