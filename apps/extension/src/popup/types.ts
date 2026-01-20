/**
 * Popup shared types
 */

export interface ExtensionSettings {
	backendUrl: string
	scoreThreshold: number
	autoOpenSidebar: boolean
	enabled: boolean
}

export interface ExtensionState {
	enabled: boolean
	todayAnalyzedCount: number
	lastResetDate: string
}

export interface BackendHealthResponse {
	status: string
	aiProvider: string
}

export interface StatsResponse {
	today: number
	opportunities: number
	bought: number
	sold: number
}

export interface ApiResponse<T> {
	success: boolean
	data?: T
	error?: string
}

export type PopupView = 'main' | 'settings' | 'portfolio'

export type ArticleStatus = 'WATCHING' | 'BOUGHT' | 'SOLD'

export interface PortfolioArticle {
	id: string
	vintedId: string
	url: string
	title: string
	price: number
	totalPrice?: number
	score: number
	status: ArticleStatus
	imageUrl?: string
	analyzedAt: string
	marginPercent?: number
}

export interface PortfolioFilter {
	status?: ArticleStatus
	minScore?: number
	limit?: number
	offset?: number
}

export interface PortfolioStats {
	watching: number
	bought: number
	sold: number
	opportunities: number
}
