/**
 * Inversify identifier symbols for dependency injection
 * These symbols are used to uniquely identify injectable dependencies
 */
export const TYPES = {
	// Repositories
	AnalysisRepository: Symbol.for('AnalysisRepository'),

	// Providers
	AIProvider: Symbol.for('AIProvider'),

	// Use Cases (will be added in future tasks)
	AnalyzeArticleUseCase: Symbol.for('AnalyzeArticleUseCase'),
	GetAnalysisUseCase: Symbol.for('GetAnalysisUseCase'),
	ExportMarkdownUseCase: Symbol.for('ExportMarkdownUseCase'),

	// Infrastructure
	Database: Symbol.for('Database'),
} as const

export type Types = typeof TYPES
