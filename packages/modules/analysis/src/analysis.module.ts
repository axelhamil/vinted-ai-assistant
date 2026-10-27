import type { GeminiClient } from "@packages/ai/gemini-client";
import { fetchListingImages } from "@packages/ai/images";
import type { IInstrumentation, ILogger, IUnitOfWork } from "@packages/ddd-kit";
import type { Db } from "@packages/drizzle/config";
import { defineModule } from "inwire";
import type { IAnalysisRepository } from "./application/ports/analysis.repository.port";
import type { IListingFactsReader } from "./application/ports/listing-facts-reader.port";
import type { INegotiationWriter } from "./application/ports/negotiation-writer.port";
import { PortfolioService } from "./application/services/portfolio.service";
import { AnalyzeListingUseCase } from "./application/use-cases/analyze-listing.use-case";
import { ChangeAnalysisStatusUseCase } from "./application/use-cases/change-analysis-status.use-case";
import { RegenerateNegotiationUseCase } from "./application/use-cases/regenerate-negotiation.use-case";
import { GeminiListingFactsReader } from "./infrastructure/ai/gemini-listing-facts-reader";
import { GeminiNegotiationWriter } from "./infrastructure/ai/gemini-negotiation-writer";
import { DrizzleAnalysisRepository } from "./infrastructure/repositories/drizzle-analysis.repository";

const now = (): Date => new Date();

export interface AnalysisAiPrerequisites {
  GeminiClient: GeminiClient;
  logger: ILogger;
}

export const analysisAiModule = defineModule<AnalysisAiPrerequisites>()((b) =>
  b
    .add(
      "IListingFactsReader",
      (c): IListingFactsReader =>
        new GeminiListingFactsReader(
          c.GeminiClient,
          (urls) => fetchListingImages(urls),
          c.logger,
        ),
    )
    .add(
      "INegotiationWriter",
      (c): INegotiationWriter =>
        new GeminiNegotiationWriter(c.GeminiClient, c.logger),
    ),
);

export interface AnalysisPrerequisites {
  db: Db;
  logger: ILogger;
  unitOfWork: IUnitOfWork;
  IInstrumentation: IInstrumentation;
  IListingFactsReader: IListingFactsReader;
  INegotiationWriter: INegotiationWriter;
}

export const analysisModule = defineModule<AnalysisPrerequisites>()((b) =>
  b
    .add(
      "IAnalysisRepository",
      (c): IAnalysisRepository =>
        new DrizzleAnalysisRepository(c.db, c.logger, c.IInstrumentation),
    )
    .add(
      "AnalyzeListingUseCase",
      (c) =>
        new AnalyzeListingUseCase(
          c.IAnalysisRepository,
          c.IListingFactsReader,
          c.INegotiationWriter,
          c.unitOfWork,
          c.logger,
          now,
        ),
    )
    .add(
      "ChangeAnalysisStatusUseCase",
      (c) =>
        new ChangeAnalysisStatusUseCase(c.IAnalysisRepository, c.unitOfWork),
    )
    .add(
      "RegenerateNegotiationUseCase",
      (c) =>
        new RegenerateNegotiationUseCase(
          c.IAnalysisRepository,
          c.INegotiationWriter,
          c.unitOfWork,
          now,
        ),
    )
    .add(
      "PortfolioService",
      (c) => new PortfolioService(c.IAnalysisRepository),
    ),
);
