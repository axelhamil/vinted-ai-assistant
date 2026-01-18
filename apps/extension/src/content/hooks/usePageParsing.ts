/**
 * Hook for parsing Vinted article page data
 */

import type { VintedArticleData } from '@vinted-ai/shared/article'
import { useCallback, useEffect, useState } from 'react'
import {
	fetchSellerProfile,
	mergeSellerWithProfile,
	parseVintedArticle,
	waitForPageLoad,
} from '../lib/parser'

interface UsePageParsingResult {
	articleData: VintedArticleData | null
	isLoading: boolean
	error: string | null
}

/**
 * Hook that parses the Vinted article page and enriches seller data
 */
export function usePageParsing(): UsePageParsingResult {
	const [articleData, setArticleData] = useState<VintedArticleData | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const loadArticleData = useCallback(async () => {
		try {
			setIsLoading(true)
			setError(null)

			// Wait for page to fully load
			await waitForPageLoad()

			// Parse article data from DOM
			const data = parseVintedArticle()

			if (data) {
				// Fetch seller profile with timeout (5s max)
				const sellerProfile = await fetchSellerProfile(data.seller.username)

				// Merge seller profile data if available
				if (sellerProfile) {
					data.seller = mergeSellerWithProfile(data.seller, sellerProfile)
				}

				setArticleData(data)
			} else {
				setError('Could not extract article data from page')
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error occurred'
			setError(message)
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadArticleData()
	}, [loadArticleData])

	return { articleData, isLoading, error }
}
