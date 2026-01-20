import type { NegotiationTone } from '@vinted-ai/shared/analysis'
import type { AIMessage } from '../../interfaces/providers/ai.provider.interface'

/**
 * Input for building negotiation regeneration prompt
 */
export interface NegotiationPromptInput {
	price: number
	marketPriceAvg: number
	daysListed: number
	sellerSalesCount: number
	condition: string
	preferredTone: NegotiationTone
}

/**
 * Build the prompt for negotiation regeneration
 */
function buildNegotiationPromptText(input: NegotiationPromptInput): string {
	const { price, marketPriceAvg, daysListed, sellerSalesCount, condition, preferredTone } = input

	const toneInstructions = {
		friendly:
			"Utilise un ton amical et décontracté. Montre ton enthousiasme pour l'article. Crée une connexion personnelle.",
		direct:
			'Sois direct et professionnel. Va droit au but avec des faits. Pas de bavardage inutile.',
		urgent:
			"Crée un sentiment d'urgence. Mentionne que tu peux payer immédiatement. Suggère que tu as d'autres options.",
	}

	return `# GÉNÉRATION DE SCRIPT DE NÉGOCIATION

Tu es un expert en négociation sur Vinted. Génère un script de négociation optimisé.

## CONTEXTE DE L'ARTICLE

| Donnée | Valeur |
|--------|--------|
| Prix demandé | ${price}€ |
| Prix marché moyen | ${marketPriceAvg}€ |
| En ligne depuis | ${daysListed} jour(s) |
| Ventes vendeur | ${sellerSalesCount} |
| État | ${condition} |

## TON DEMANDÉ: ${preferredTone.toUpperCase()}

${toneInstructions[preferredTone]}

## CALCUL DE L'OFFRE

- Si prix > marché (+10%): Offre agressive à -20/25%
- Si prix ≈ marché (±10%): Offre à -15%
- Si prix < marché (-10%): Offre à -10%
- Si article ancien (>21j): Ajouter -5% supplémentaire
- Minimum: Ne jamais descendre sous 70% du prix marché low

## FORMAT DE RÉPONSE

Génère:
1. suggestedOffer: Prix d'offre calculé (entier en €)
2. script: Message de négociation (3-4 phrases max)
3. arguments: 3-4 arguments factuels pour justifier l'offre
4. tone: Le ton utilisé (${preferredTone})

Le script doit:
- Être personnalisé et naturel
- Mentionner l'article
- Justifier le prix proposé
- Laisser une ouverture pour négociation`
}

/**
 * Build the AI message for negotiation regeneration
 */
export function buildNegotiationMessage(input: NegotiationPromptInput): AIMessage {
	const prompt = buildNegotiationPromptText(input)
	return { role: 'user', content: prompt }
}
