import { Container } from 'inversify'
import { GeminiProvider } from '../adapters/providers/ai/gemini.provider'
import { DrizzleAnalysisRepository } from '../adapters/persistence/drizzle-analysis.repository'
import { TYPES } from './di-types'
import type { IAIProvider } from './interfaces/providers/ai.provider.interface'
import type { IAnalysisRepository } from './interfaces/repositories/analysis.repository.interface'
import { AnalyzeArticleUseCase } from './use-cases/analyze-article.use-case'
import { ExportMarkdownUseCase } from './use-cases/export-markdown.use-case'
import { GetAnalysisUseCase } from './use-cases/get-analysis.use-case'

/**
 * Create and configure the Inversify DI container
 */
export function createContainer(): Container {
	const container = new Container()

	// Bind repositories
	container
		.bind<IAnalysisRepository>(TYPES.AnalysisRepository)
		.to(DrizzleAnalysisRepository)
		.inSingletonScope()

	// Bind AI provider
	container.bind<IAIProvider>(TYPES.AIProvider).to(GeminiProvider).inSingletonScope()

	// Bind use cases
	container
		.bind<AnalyzeArticleUseCase>(TYPES.AnalyzeArticleUseCase)
		.to(AnalyzeArticleUseCase)
		.inSingletonScope()

	container
		.bind<GetAnalysisUseCase>(TYPES.GetAnalysisUseCase)
		.to(GetAnalysisUseCase)
		.inSingletonScope()

	container
		.bind<ExportMarkdownUseCase>(TYPES.ExportMarkdownUseCase)
		.to(ExportMarkdownUseCase)
		.inSingletonScope()

	return container
}

/**
 * Default container instance
 */
export const container = createContainer()
