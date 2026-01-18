import { openai } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'
import { injectable } from 'inversify'
import { z } from 'zod'
import type {
	IImageAnalyzer,
	ImageAnalysisResult,
} from '../../../application/interfaces/providers/source-research.provider.interface'

/**
 * Zod schema for image analysis response
 */
const imageAnalysisSchema = z.object({
	brand: z.string().nullable(),
	model: z.string().nullable(),
	category: z.string(),
	colors: z.array(z.string()),
	materials: z.array(z.string()),
	patterns: z.array(z.string()),
	condition: z.string(),
	searchQueries: z.object({
		primary: z.string(),
		secondary: z.array(z.string()),
		visualFeatures: z.string(),
	}),
	estimatedRetailPrice: z.number().optional(),
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
 * AI-powered image analyzer for extracting visual features
 * Uses GPT-4O for image analysis
 */
@injectable()
export class ImageAnalyzerProvider implements IImageAnalyzer {
	private readonly model = 'gpt-4o'

	/**
	 * Analyze photos and extract visual features for search optimization
	 */
	async analyzeImages(
		photoUrls: string[],
		context: { title: string; brand: string | null }
	): Promise<ImageAnalysisResult> {
		const prompt = `Tu es un expert en identification d'articles de mode pour la revente.

Analyse ces photos d'un article et extrais les informations suivantes:

## IDENTIFICATION
- **Marque**: Identifie la marque exacte (logo, étiquette, style caractéristique)
- **Modèle**: Nom du modèle si identifiable (ex: "Air Max 90", "Speedy 30", etc.)
- **Catégorie**: Type d'article (sneakers, sac, veste, pantalon, robe, etc.)

## CARACTÉRISTIQUES VISUELLES
- **Couleurs**: Liste des couleurs principales (ex: ["blanc", "noir", "rouge"])
- **Matières**: Matières visibles (cuir, toile, synthétique, coton, etc.)
- **Motifs**: Patterns visuels (uni, rayé, logo visible, monogram, etc.)
- **État**: État apparent de l'article (neuf avec étiquette, très bon état, bon état, état correct, à rénover)

## REQUÊTES DE RECHERCHE
Génère des requêtes optimisées pour trouver des articles similaires:
- **primary**: Requête principale la plus précise (ex: "Nike Air Max 90 blanc homme 42")
- **secondary**: 2-3 variations de recherche alternatives
- **visualFeatures**: Description des caractéristiques visuelles distinctives pour matcher les résultats

## PRIX RETAIL
Si la marque est identifiable, estime le prix neuf de l'article (en euros).

Contexte article:
- Titre vendeur: ${context.title}
- Marque déclarée: ${context.brand ?? 'Non spécifiée'}

IMPORTANT:
- Sois précis sur la marque et le modèle
- Les requêtes de recherche doivent être optimisées pour trouver des articles similaires
- Le prix retail doit être réaliste pour le marché français`

		// Download images and convert to base64
		const imagePromises = photoUrls.slice(0, 4).map(downloadImageAsBase64)
		const base64Images = await Promise.all(imagePromises)
		const validImages = base64Images.filter((img): img is string => img !== null)

		if (validImages.length === 0) {
			return this.getFallbackResult(context)
		}

		const imageContent = validImages.map((dataUrl) => ({
			type: 'image' as const,
			image: dataUrl,
		}))

		try {
			const { output } = await generateText({
				model: openai(this.model),
				output: Output.object({ schema: imageAnalysisSchema }),
				messages: [
					{
						role: 'user',
						content: [{ type: 'text', text: prompt }, ...imageContent],
					},
				],
			})

			if (!output) {
				return this.getFallbackResult(context)
			}

			return {
				brand: output.brand,
				model: output.model,
				category: output.category,
				colors: output.colors,
				materials: output.materials,
				patterns: output.patterns,
				condition: output.condition,
				searchQueries: {
					primary: output.searchQueries.primary,
					secondary: output.searchQueries.secondary,
					visualFeatures: output.searchQueries.visualFeatures,
				},
				estimatedRetailPrice: output.estimatedRetailPrice,
			}
		} catch {
			return this.getFallbackResult(context)
		}
	}

	/**
	 * Fallback result when AI analysis fails
	 */
	private getFallbackResult(context: { title: string; brand: string | null }): ImageAnalysisResult {
		const searchQuery = context.brand ? `${context.brand} ${context.title}` : context.title

		return {
			brand: context.brand,
			model: null,
			category: 'article',
			colors: [],
			materials: [],
			patterns: [],
			condition: 'bon état',
			searchQueries: {
				primary: searchQuery.slice(0, 100),
				secondary: [context.title.slice(0, 50)],
				visualFeatures: '',
			},
		}
	}
}
