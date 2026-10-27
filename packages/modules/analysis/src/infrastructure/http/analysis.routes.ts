import { zValidator } from "@hono/zod-validator";
import { AppErrorException, type Result } from "@packages/ddd-kit";
import { Hono, type ValidationTargets } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  ANALYSIS_ERROR_MESSAGES,
  type AnalysisErrorCode,
} from "../../application/analysis-errors";
import type { ListingDto } from "../../application/dto/analysis.dto";
import {
  toAnalysisDto,
  toPortfolioDto,
} from "../../application/dto/analysis.presenter";
import type { PortfolioService } from "../../application/services/portfolio.service";
import type { AnalyzeListingUseCase } from "../../application/use-cases/analyze-listing.use-case";
import type { ChangeAnalysisStatusUseCase } from "../../application/use-cases/change-analysis-status.use-case";
import type { DeleteAnalysisUseCase } from "../../application/use-cases/delete-analysis.use-case";
import type { RegenerateNegotiationUseCase } from "../../application/use-cases/regenerate-negotiation.use-case";

export interface AnalysisRoutesDeps {
  AnalyzeListingUseCase: AnalyzeListingUseCase;
  ChangeAnalysisStatusUseCase: ChangeAnalysisStatusUseCase;
  RegenerateNegotiationUseCase: RegenerateNegotiationUseCase;
  DeleteAnalysisUseCase: DeleteAnalysisUseCase;
  PortfolioService: PortfolioService;
}

const DEFAULT_LANGUAGE = "fr";

const ANALYZE_BODY_LIMIT_BYTES = 1024 * 1024;

const MAX_EUROS = 10_000_000;

const euros = z.number().max(MAX_EUROS);

const priceEuros = euros.min(0.01);

const vintedListingUrl = z.url({
  protocol: /^https$/,
  hostname: /^(www\.)?vinted\.[a-z]{2,}(\.[a-z]{2,})?$/i,
});

const optionalNumber = z.preprocess(
  (raw) => (raw === "" ? undefined : raw),
  z.coerce.number().optional(),
);

const analyzeBodySchema = z.object({
  vintedId: z.string().min(1),
  url: vintedListingUrl,
  title: z.string().min(1),
  description: z.string(),
  price: priceEuros,
  totalPrice: priceEuros.nullable(),
  shippingCost: euros.min(0).nullable(),
  brand: z.string().nullable(),
  size: z.string().nullable(),
  condition: z.string().min(1),
  photos: z.array(z.url()).min(1),
  listedAt: z.iso.datetime({ offset: true }).nullable(),
  seller: z.object({
    username: z.string().min(1),
    rating: z.number().min(0).max(5).nullable(),
    salesCount: z.number().int().nonnegative().nullable(),
  }),
  language: z.string().default(DEFAULT_LANGUAGE),
  forceRefresh: z.boolean().default(false),
});

const statusBodySchema = z.object({ status: z.string() });

const toneBodySchema = z.object({ tone: z.string() });

const portfolioQuerySchema = z.object({
  limit: optionalNumber,
  offset: optionalNumber,
  minScore: optionalNumber,
  status: z.string().optional(),
});

const statsQuerySchema = z.object({ minScore: optionalNumber });

type AnalyzeBody = z.infer<typeof analyzeBodySchema>;

function failure(code: AnalysisErrorCode): AppErrorException {
  return new AppErrorException({
    code,
    message: ANALYSIS_ERROR_MESSAGES[code],
  });
}

function succeeded<T>(result: Result<T, AnalysisErrorCode>): T {
  if (result.isFailure) throw failure(result.getError());

  return result.getValue();
}

function validated<T extends z.ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) throw failure("ANALYSIS_INPUT_INVALID");
  });
}

function cents(euroAmount: number): number {
  return Math.round(euroAmount * 100);
}

function optionalCents(euroAmount: number | null): number | null {
  return euroAmount === null ? null : cents(euroAmount);
}

function toListingDto(body: AnalyzeBody): ListingDto {
  return {
    vintedId: body.vintedId,
    url: body.url,
    title: body.title,
    description: body.description,
    brand: body.brand,
    size: body.size,
    condition: body.condition,
    priceCents: cents(body.price),
    totalPriceCents: optionalCents(body.totalPrice),
    shippingCostCents: optionalCents(body.shippingCost),
    listedAt: body.listedAt === null ? null : new Date(body.listedAt),
    photos: body.photos,
    seller: body.seller,
    language: body.language,
  };
}

export function createAnalysisRoutes(deps: AnalysisRoutesDeps) {
  return new Hono()
    .post(
      "/analyses",
      bodyLimit({
        maxSize: ANALYZE_BODY_LIMIT_BYTES,
        onError: () => {
          throw new HTTPException(413, {
            message: "The request body exceeds 1 MB",
          });
        },
      }),
      validated("json", analyzeBodySchema),
      async (c) => {
        const body = c.req.valid("json");
        const analysis = succeeded(
          await deps.AnalyzeListingUseCase.execute({
            listing: toListingDto(body),
            forceRefresh: body.forceRefresh,
          }),
        );

        return c.json(toAnalysisDto(analysis), 201);
      },
    )
    .get("/analyses/:vintedId", async (c) => {
      const analysis = succeeded(
        await deps.PortfolioService.get({ vintedId: c.req.param("vintedId") }),
      );

      return c.json(toAnalysisDto(analysis));
    })
    .patch(
      "/analyses/:vintedId/status",
      validated("json", statusBodySchema),
      async (c) => {
        const analysis = succeeded(
          await deps.ChangeAnalysisStatusUseCase.execute({
            vintedId: c.req.param("vintedId"),
            status: c.req.valid("json").status,
          }),
        );

        return c.json(toAnalysisDto(analysis));
      },
    )
    .post(
      "/analyses/:vintedId/negotiation",
      validated("json", toneBodySchema),
      async (c) => {
        const analysis = succeeded(
          await deps.RegenerateNegotiationUseCase.execute({
            vintedId: c.req.param("vintedId"),
            tone: c.req.valid("json").tone,
          }),
        );

        return c.json(toAnalysisDto(analysis));
      },
    )
    .get("/analyses/:vintedId/export", async (c) => {
      const { filename, markdown } = succeeded(
        await deps.PortfolioService.exportMarkdown({
          vintedId: c.req.param("vintedId"),
        }),
      );

      return c.body(markdown, 200, {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      });
    })
    .get("/portfolio", validated("query", portfolioQuerySchema), async (c) => {
      const listing = succeeded(
        await deps.PortfolioService.list(c.req.valid("query")),
      );

      return c.json(toPortfolioDto(listing));
    })
    .get(
      "/portfolio/stats",
      validated("query", statsQuerySchema),
      async (c) => {
        const stats = succeeded(
          await deps.PortfolioService.stats(c.req.valid("query")),
        );

        return c.json(stats);
      },
    )
    .delete("/portfolio/:vintedId", async (c) => {
      succeeded(
        await deps.DeleteAnalysisUseCase.execute({
          vintedId: c.req.param("vintedId"),
        }),
      );

      return c.body(null, 204);
    });
}
