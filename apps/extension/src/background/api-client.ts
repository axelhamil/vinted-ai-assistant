/**
 * API client for backend communication
 */

import type {
	AnalysisResult,
	ApiResponse,
	BackendHealthResponse,
	ExportMarkdownResponse,
	Negotiation,
	NegotiationTone,
	PortfolioResponse,
	PortfolioStatsResponse,
	StatsResponse,
	VintedArticleData,
} from './message-types'
import { getSettings, incrementAnalyzedCount } from './state-manager'

// ============================================================================
// Generic API Request
// ============================================================================

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
	const settings = await getSettings()
	const url = `${settings.backendUrl}${endpoint}`

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			return {
				success: false,
				error:
					errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
			}
		}

		// Handle markdown export (returns text, not JSON)
		const contentType = response.headers.get('Content-Type')
		if (contentType?.includes('text/markdown')) {
			const text = await response.text()
			return { success: true, data: text as T }
		}

		const data = await response.json()
		return { success: true, data }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		return { success: false, error: `Network error: ${errorMessage}` }
	}
}

// ============================================================================
// Health Check
// ============================================================================

export async function checkBackendStatus(): Promise<ApiResponse<BackendHealthResponse>> {
	return apiRequest<BackendHealthResponse>('/api/health')
}

// ============================================================================
// Analysis API
// ============================================================================

export async function analyzeArticle(
	articleData: VintedArticleData & { forceRefresh?: boolean }
): Promise<ApiResponse<AnalysisResult>> {
	// Convert Date objects to ISO strings for JSON serialization
	const payload = {
		...articleData,
		listedAt: articleData.listedAt?.toISOString() ?? null,
		forceRefresh: articleData.forceRefresh ?? false,
	}

	const result = await apiRequest<AnalysisResult>('/api/analyze', {
		method: 'POST',
		body: JSON.stringify(payload),
	})

	if (result.success) {
		await incrementAnalyzedCount()
	}

	return result
}

export async function getAnalysis(vintedId: string): Promise<ApiResponse<AnalysisResult>> {
	return apiRequest<AnalysisResult>(`/api/analyses/${vintedId}`)
}

export async function updateAnalysisStatus(
	vintedId: string,
	status: string
): Promise<ApiResponse<AnalysisResult>> {
	return apiRequest<AnalysisResult>(`/api/analyses/${vintedId}/status`, {
		method: 'PATCH',
		body: JSON.stringify({ status }),
	})
}

// ============================================================================
// Export API
// ============================================================================

export async function exportMarkdown(vintedId: string): Promise<ApiResponse<ExportMarkdownResponse>> {
	const settings = await getSettings()
	const url = `${settings.backendUrl}/api/analyses/${vintedId}/export`

	try {
		const response = await fetch(url, {
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}))
			return {
				success: false,
				error:
					errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
			}
		}

		const content = await response.text()

		// Extract filename from Content-Disposition header
		const contentDisposition = response.headers.get('Content-Disposition')
		let filename = 'analysis.md'

		if (contentDisposition) {
			// Parse filename from Content-Disposition: attachment; filename="something.md"
			const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/i)
			if (filenameMatch?.[1]) {
				filename = filenameMatch[1]
			}
		}

		return { success: true, data: { content, filename } }
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		return { success: false, error: `Network error: ${errorMessage}` }
	}
}

// ============================================================================
// Stats API
// ============================================================================

export async function getStats(): Promise<ApiResponse<StatsResponse>> {
	return apiRequest<StatsResponse>('/api/stats')
}

// ============================================================================
// Negotiation API
// ============================================================================

export async function regenerateNegotiation(
	vintedId: string,
	tone: NegotiationTone
): Promise<ApiResponse<Negotiation>> {
	return apiRequest<Negotiation>(`/api/analyses/${vintedId}/regenerate-negotiation`, {
		method: 'POST',
		body: JSON.stringify({ tone }),
	})
}

// ============================================================================
// Portfolio API
// ============================================================================

export async function getPortfolio(filter: {
	status?: 'WATCHING' | 'BOUGHT' | 'SOLD'
	minScore?: number
	limit?: number
	offset?: number
}): Promise<ApiResponse<PortfolioResponse>> {
	const params = new URLSearchParams()
	if (filter.status) params.set('status', filter.status)
	if (filter.minScore !== undefined) params.set('minScore', filter.minScore.toString())
	if (filter.limit !== undefined) params.set('limit', filter.limit.toString())
	if (filter.offset !== undefined) params.set('offset', filter.offset.toString())

	const queryString = params.toString()
	const endpoint = `/api/portfolio${queryString ? `?${queryString}` : ''}`

	return apiRequest<PortfolioResponse>(endpoint)
}

export async function getPortfolioStats(): Promise<ApiResponse<PortfolioStatsResponse>> {
	return apiRequest<PortfolioStatsResponse>('/api/portfolio/stats')
}

export async function deletePortfolioItem(
	vintedId: string
): Promise<ApiResponse<{ success: boolean }>> {
	return apiRequest<{ success: boolean }>(`/api/portfolio/${vintedId}`, {
		method: 'DELETE',
	})
}
