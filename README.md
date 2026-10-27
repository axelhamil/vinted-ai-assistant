# Vinted AI Assistant

A Chrome extension and a self-hosted API that analyze Vinted listings with Gemini and tell you whether an item is worth buying to resell.

![License](https://img.shields.io/badge/license-AGPL--3.0-blue)

## What it does

- **Opportunity score (1 to 10)**, margin and suggested offer, computed by the domain from the facts the model returns (observed market prices, condition, photo findings).
- **Negotiation message** in three tones (friendly, direct, urgent), regenerated on demand.
- **Resale advice and market sources** found with Google Search grounding.
- **Portfolio** of analyzed items with statuses (analyzed, watching, bought, sold, archived), stats and Markdown export.
- **Photo studio** on the new listing page: edit photos with 5 presets or a free instruction, and get a suggested title, description, condition and price.

The extension runs on every Vinted domain it supports (fr, de, be, at and others listed in `apps/extension/lib/vinted/hosts.ts`). Analyses are stored in your own Postgres.

## Requirements

- Docker with Compose
- Node 24.22.1 or later and pnpm 12
- Bun 1.4.4 for tests outside Docker
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Quick start (development)

```bash
pnpm install
cp .env.example .env        # set GEMINI_API_KEY
pnpm dev                    # Postgres, migrations and the api on http://localhost:3000, watch mode
pnpm dev:ext                # in a second terminal: Chrome with the extension loaded
```

Open a Vinted item page: the sidebar shows the analysis. To load a build in your own Chrome instead, see [apps/extension/README.md](apps/extension/README.md).

## Production

```bash
cp .env.example .env        # set POSTGRES_PASSWORD and GEMINI_API_KEY, optionally API_PORT
docker compose --profile prod up -d
```

The api listens on `127.0.0.1:${API_PORT:-3000}` and Postgres is not published. Updates, backups and the full setup are in [docs/deploy.md](docs/deploy.md).

### Import a legacy SQLite portfolio

A portfolio from the legacy SQLite backend moves to Postgres once:

```bash
pnpm import:sqlite path/to/legacy.db --dry-run   # report only
pnpm import:sqlite path/to/legacy.db
```

Items already in Postgres are skipped, never overwritten. Rows that fail validation are listed and the command exits 1.

## Architecture

```
apps/
  api/                Hono host on Bun, composition root (inwire), Dockerfile
  extension/          WXT extension: background, content scripts, popup
packages/
  modules/analysis/   listing analysis and portfolio (aggregate, use cases, Drizzle repository, routes)
  modules/studio/     photo edits and listing suggestions (stateless)
  ai/                 Gemini client on @google/genai
  ddd-kit/            Result, Option, aggregates, value objects, events, unit of work
  drizzle/            Postgres pool, migrations, migrator
  outbox/             transactional outbox and relay
  testing/            port mocks, template database clones, fetch guard
```

The extension never calls the api from a page: the background service worker owns the typed Hono client and the content scripts and popup talk to it through messages. Module boundaries are enforced by `pnpm check:boundaries`. Contributor details are in [CLAUDE.md](CLAUDE.md).

## Checks

```bash
pnpm db           # Postgres for dev and tests
pnpm check:all    # type-check, schema drift, Biome, duplication, unused code, boundaries, tests, database tests
```

## Releases

Versions are cut by release-please from Conventional Commits; each GitHub release carries the extension zip. See [docs/releasing.md](docs/releasing.md).

## License

[AGPL-3.0](LICENSE). Not affiliated with Vinted; respect its terms of service.
