import { Option, Result } from "@packages/ddd-kit";
import { z } from "zod";

function trimmedOrUnset(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}

function blankAsUnset<T extends z.ZodType>(schema: T) {
  return z.preprocess(trimmedOrUnset, schema);
}

function isPostgresUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;

  const { protocol } = new URL(value);

  return protocol === "postgres:" || protocol === "postgresql:";
}

const envSchema = z.object({
  NODE_ENV: blankAsUnset(
    z
      .enum(["development", "test", "production"], {
        error: "must be development, test or production",
      })
      .default("development"),
  ),
  PORT: blankAsUnset(
    z.coerce
      .number({ error: "must be a number" })
      .int({ error: "must be a whole number" })
      .min(1, { error: "must be between 1 and 65535" })
      .max(65535, { error: "must be between 1 and 65535" })
      .default(3000),
  ),
  DATABASE_URL: blankAsUnset(
    z
      .string({
        error:
          "is required, the Postgres connection url like postgres://postgres:postgres@localhost:5442/vinted",
      })
      .refine(isPostgresUrl, {
        error:
          "must be a postgres:// or postgresql:// url, like postgres://postgres:postgres@localhost:5442/vinted",
      }),
  ),
  LOG_LEVEL: blankAsUnset(
    z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"], {
        error: "must be fatal, error, warn, info, debug, trace or silent",
      })
      .default("info"),
  ),
  SENTRY_DSN: blankAsUnset(
    z
      .url({
        error: "must be the DSN url of the Sentry project, or stay empty",
      })
      .optional(),
  ).transform((dsn) => Option.fromNullable(dsn)),
});

export type Env = z.output<typeof envSchema>;

export function parseEnv(
  source: Record<string, string | undefined>,
): Result<Env, string> {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) return Result.ok(parsed.data);

  const problems = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")} ${issue.message}`,
  );

  return Result.fail(problems.join("\n"));
}
