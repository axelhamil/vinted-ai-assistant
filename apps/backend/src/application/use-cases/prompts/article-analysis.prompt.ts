import { SUPPORTED_LANGUAGES } from '../../constants'
import type { AIMessage, ContentPart } from '../../interfaces/providers/ai.provider.interface'

/**
 * Input for building article analysis message
 */
export interface ArticleAnalysisPromptInput {
	/** Base64 encoded images (already downloaded) */
	images: string[]
	title: string
	brand: string | null
	condition: string
	price: number
	/** Shipping cost in euros (null = free shipping or not available) */
	shippingCost: number | null
	daysListed: number
	size?: string
	language: string
}

/**
 * Get language name for instruction
 */
function getLanguageName(code: string): string {
	return SUPPORTED_LANGUAGES[code] ?? SUPPORTED_LANGUAGES.fr ?? 'français'
}

/**
 * Build the prompt text for article analysis
 */
function buildPromptText(params: {
	title: string
	brand: string | null
	condition: string
	price: number
	shippingCost: number | null
	daysListed: number
	size?: string
	languageName: string
}): string {
	const { title, brand, condition, price, shippingCost, daysListed, size, languageName } = params
	const totalCost = price + (shippingCost ?? 0)
	const shippingDisplay = shippingCost !== null ? `${shippingCost}€` : 'Gratuit'

	return `# RÔLE ET EXPERTISE

Tu es un expert en achat-revente sur Vinted avec 5+ ans d'expérience. Tu connais parfaitement:
- Les prix du marché secondaire français (Vinted, Vestiaire Collective, Leboncoin)
- Les techniques d'authentification visuelle par marque
- La psychologie des vendeurs Vinted et les signaux d'opportunité
- Les stratégies de négociation efficaces

LANGUE DE RÉPONSE OBLIGATOIRE: ${languageName}. Tous les champs textuels (reasoning, script, arguments, issues, flags, signals.label, signals.detail) DOIVENT être rédigés en ${languageName}.

---

# ARTICLE À ANALYSER

| Champ | Valeur |
|-------|--------|
| Titre annonce | ${title} |
| Marque déclarée | ${brand ?? 'Non spécifiée'} |
| État déclaré | ${condition} |
| Prix demandé | ${price}€ |
| Frais de port | ${shippingDisplay} |
| **Coût total d'achat** | **${totalCost}€** |
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
- \`margin\`: marketPriceEstimation.average - coût total d'achat (prix + frais de port) (en €, peut être négatif)
- \`marginPercent\`: (margin / coût total d'achat) × 100
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

Article: Nike Air Max 90, état "Bon", 45€ + 3.50€ frais de port = 48.50€ coût total, en ligne 23 jours

→ Photos: 5/10 (amateur, fond chambre, mais article visible)
→ Authenticité: 8/10 (Nike courant, étiquettes visibles, cohérent)
→ Prix marché: 55-75€ (average 65€) pour AM90 bon état
→ Marge: 65€ - 48.50€ = +16.50€ (+34%)
→ Opportunité: 8/10 (marge +34%, photos amateur, annonce ancienne)
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
}

/**
 * Build the complete AI message for article analysis
 * NOTE: Images must be pre-downloaded base64 strings
 */
export function buildArticleAnalysisMessage(input: ArticleAnalysisPromptInput): AIMessage {
	const { images, language, ...articleData } = input

	if (images.length === 0) {
		throw new Error('At least one image is required for analysis')
	}

	const languageName = getLanguageName(language)
	const prompt = buildPromptText({ ...articleData, languageName })

	const content: ContentPart[] = [
		{ type: 'text', text: prompt },
		...images.map((img) => ({ type: 'image' as const, image: img })),
	]

	return { role: 'user', content }
}
