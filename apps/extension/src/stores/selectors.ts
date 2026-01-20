/**
 * Store selectors for performance optimization
 */

import type { AnalysisStore } from './types'

// ============================================================================
// Basic Selectors
// ============================================================================

export const selectArticleData = (state: AnalysisStore) => state.articleData
export const selectCurrentAnalysis = (state: AnalysisStore) => state.currentAnalysis
export const selectIsLoading = (state: AnalysisStore) => state.isLoading
export const selectIsAnalyzing = (state: AnalysisStore) => state.isAnalyzing
export const selectError = (state: AnalysisStore) => state.error
export const selectSidebarOpen = (state: AnalysisStore) => state.sidebarOpen
export const selectCacheInfo = (state: AnalysisStore) => state.cacheInfo
export const selectSettings = (state: AnalysisStore) => state.settings

// ============================================================================
// Derived Selectors
// ============================================================================

export const selectOpportunityScore = (state: AnalysisStore) =>
	state.currentAnalysis?.opportunity.score ?? 0

export const selectMarginPercent = (state: AnalysisStore) =>
	state.currentAnalysis?.opportunity.marginPercent ?? 0

export const selectIsHighOpportunity = (state: AnalysisStore) => {
	const score = state.currentAnalysis?.opportunity.score ?? 0
	return score >= state.settings.scoreThreshold
}

export const selectHasAnalysis = (state: AnalysisStore) => state.currentAnalysis !== null

export const selectAnalysisStatus = (state: AnalysisStore) => state.currentAnalysis?.status ?? null

export const selectNegotiation = (state: AnalysisStore) =>
	state.currentAnalysis?.negotiation ?? null

export const selectMarketPrice = (state: AnalysisStore) =>
	state.currentAnalysis?.marketPrice ?? null
