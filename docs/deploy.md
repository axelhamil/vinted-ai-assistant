# Deploy

Production runs from the `prod` profile of `docker-compose.yaml`: `db-prod` (Postgres 18, named volume `vinted_prod_pg`, no published port), `migrate-live` (applies the Drizzle migrations, then exits) and `api-live` (the `production` target of `apps/api/Dockerfile`, bound to `127.0.0.1:${API_PORT}`).

## First start

1. Copy `.env.example` to `.env` and set:
   - `POSTGRES_PASSWORD`: URL safe, for example `openssl rand -hex 32`. It is read when the volume is first created.
   - `GEMINI_API_KEY`: from https://aistudio.google.com/apikey.
   - `API_PORT`: host port of the api, `3000` by default.
   - `SENTRY_DSN`: optional.
2. Start the stack:

   ```bash
   docker compose --profile prod up -d --build --wait api-live
   curl -fsS http://127.0.0.1:3000/health/ready
   ```

Always name `api-live`: a bare `up` also starts the dev and test databases, which have no profile.

An empty `POSTGRES_PASSWORD` stops `db-prod` on first start with `Database is uninitialized and superuser password is not specified`. An empty `GEMINI_API_KEY` stops `api-live` with `GEMINI_API_KEY is required`.

## Update

```bash
git pull
docker compose --profile prod up -d --build --wait api-live
```

`migrate-live` runs again before `api-live` restarts. The volume is kept across `down` and `up`; only `down -v` deletes it.

## Backup and restore

```bash
docker compose --profile prod exec -T db-prod pg_dump -U postgres -d vinted --format=custom > vinted-$(date +%F).dump
docker compose --profile prod exec -T db-prod pg_restore -U postgres -d vinted --clean --if-exists < vinted-2026-10-27.dump
```

## Import a legacy SQLite portfolio

The script ships in the image. Mount the legacy file read only and run it once with the prod database:

```bash
docker compose --profile prod run --rm -v "$PWD/legacy.db:/import/legacy.db:ro" migrate-live bun scripts/import-sqlite.ts /import/legacy.db --dry-run
docker compose --profile prod run --rm -v "$PWD/legacy.db:/import/legacy.db:ro" migrate-live bun scripts/import-sqlite.ts /import/legacy.db
```

It prints one JSON report. Rows already in Postgres are skipped, so a second run imports nothing.

## Image size budget

`pnpm check:image` builds the production image and fails above 510 MB (measured 443 MB plus 15 percent, rounded up to 10 MB). CI runs the same check.
