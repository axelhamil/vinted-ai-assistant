# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Development (all apps in watch mode)
pnpm dev

# Build all apps
pnpm build

# Type checking
pnpm typecheck

# Lint and format (uses Biome)
pnpm lint
pnpm lint:fix

# Run specific app
pnpm --filter backend dev
pnpm --filter extension dev

# Database (Drizzle ORM)
pnpm --filter backend db:push      # Push schema changes
pnpm --filter backend db:generate  # Generate migrations
pnpm --filter backend db:studio    # Open Drizzle Studio GUI
```

## Architecture Overview

This is a **pnpm monorepo** with Turborepo orchestration for a Chrome extension that analyzes Vinted listings using AI.

### Monorepo Structure

- `apps/backend/` - Hono + Bun API server with Clean Architecture
- `apps/extension/` - Chrome Extension (React 19 + Vite + Manifest V3)
- `packages/shared/` - Shared TypeScript types

### Backend Architecture (Clean Architecture + DDD)

```
apps/backend/src/
├── adapters/
│   ├── controllers/     # HTTP request handlers
│   ├── http/
│   │   ├── *.routes.ts  # Route definitions
│   │   ├── middleware/  # Error handling, validation
│   │   └── schemas/     # Zod validation schemas
│   ├── providers/ai/    # AI provider implementations (Gemini, OpenAI)
│   └── persistence/     # Drizzle ORM repository + schema
├── application/
│   ├── container.ts     # Inversify DI configuration
│   ├── di-types.ts      # DI symbols
│   ├── use-cases/       # Business logic orchestration
│   ├── interfaces/      # Repository & provider abstractions
│   └── dtos/            # Data transfer objects
├── domain/
│   ├── entities/        # Core domain models
│   ├── value-objects/   # Score, Price, Margin (encapsulated validation)
│   └── errors/          # Domain-specific errors
└── index.ts             # Hono server entry
```

**Key patterns:**
- Inversify for dependency injection (`@injectable()`, `@inject()` decorators)
- Value objects enforce business rules (e.g., `Score` only accepts 1-10)
- Repositories abstracted behind interfaces for testability
- Single AI call for complete analysis (photos + opportunity + negotiation)

### Extension Architecture (Manifest V3)

```
apps/extension/src/
├── background/          # Service Worker
│   ├── index.ts         # Event listeners
│   ├── message-handler.ts
│   ├── message-types.ts # 13+ typed message definitions
│   └── api-client.ts    # Backend HTTP calls
├── content/             # Injected into vinted.fr/items/*
├── popup/               # React UI
│   ├── views/           # MainView, PortfolioView, SettingsView
│   ├── components/
│   ├── hooks/           # usePortfolio, usePopupData
│   └── stores/          # Zustand state management
└── db/                  # IndexedDB cache (Dexie) with 1-hour TTL
```

**Key patterns:**
- Message-based communication: popup → service worker → backend
- Two-level caching: IndexedDB (local) + backend (server-side)
- Zustand for React state management

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend runtime | Bun |
| Backend framework | Hono |
| Database | SQLite + Drizzle ORM |
| DI | Inversify |
| Validation | Zod |
| Frontend | React 19, Vite, Tailwind CSS |
| State | Zustand |
| Local DB | Dexie (IndexedDB) |
| AI | Vercel AI SDK with Gemini/OpenAI |
| Linting | Biome |

## Code Style

- **Biome** for linting and formatting (not ESLint/Prettier)
- Tab indentation, single quotes, no semicolons, trailing commas (ES5)
- `noUnusedImports` and `noUnusedVariables` are errors
- `noExplicitAny` is enforced

## Environment Setup

Backend requires `.env` file:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_key  # or OPENAI_API_KEY
PORT=3000
```

Extension settings are stored in Chrome storage and configured via popup UI.
