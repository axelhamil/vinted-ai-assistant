/**
 * Inversify identifier symbols for dependency injection
 * These symbols are used to uniquely identify injectable dependencies
 */
export const TYPES = {
	// Repositories
	AnalysisRepository: Symbol.for('AnalysisRepository'),
	StudioPresetRepository: Symbol.for('StudioPresetRepository'),

	// Providers
	AIProvider: Symbol.for('AIProvider'),

	// Use Cases - Analysis
	AnalyzeArticleUseCase: Symbol.for('AnalyzeArticleUseCase'),
	GetAnalysisUseCase: Symbol.for('GetAnalysisUseCase'),
	ExportMarkdownUseCase: Symbol.for('ExportMarkdownUseCase'),

	// Use Cases - Photo Studio
	EditPhotoUseCase: Symbol.for('EditPhotoUseCase'),
	FormFillingUseCase: Symbol.for('FormFillingUseCase'),
} as const

export type Types = typeof TYPES
