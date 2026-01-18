import { Container } from 'inversify'
import type { IAIProvider } from '../application/interfaces/providers/ai.provider.interface'
import type { IAnalysisRepository } from '../application/interfaces/repositories/analysis.repository.interface'
import { AnalyzeArticleUseCase } from '../application/use-cases/analyze-article.use-case'
import { OpenAIProvider } from '../infrastructure/providers/ai/openai.provider'
import { DrizzleAnalysisRepository } from '../infrastructure/repositories/drizzle-analysis.repository'
import { TYPES } from './types'

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
	container.bind<IAIProvider>(TYPES.AIProvider).to(OpenAIProvider).inSingletonScope()

	// Bind use cases
	container
		.bind<AnalyzeArticleUseCase>(TYPES.AnalyzeArticleUseCase)
		.to(AnalyzeArticleUseCase)
		.inSingletonScope()

	return container
}

/**
 * Default container instance
 */
export const container = createContainer()
