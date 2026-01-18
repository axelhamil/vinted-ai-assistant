# Vinted AI Assistant - Plan de Build

## Overview

Extension Chrome + Backend local pour analyser les opportunités de revente sur Vinted en temps réel.

**Reference:** `PRD.md`

---

## Task List

```json
[
  {
    "id": 1,
    "category": "setup",
    "description": "Initialiser le monorepo avec pnpm workspaces",
    "steps": [
      "Créer package.json racine avec workspaces",
      "Créer pnpm-workspace.yaml",
      "Créer structure dossiers apps/ et packages/",
      "Créer biome.json config",
      "Créer tsconfig.json base"
    ],
    "passes": true
  },
  {
    "id": 2,
    "category": "setup",
    "description": "Setup package shared (types communs)",
    "steps": [
      "Créer packages/shared/package.json",
      "Créer packages/shared/tsconfig.json",
      "Créer types Article (VintedArticleData)",
      "Créer types Analysis (AnalysisResult)",
      "Exporter tous les types depuis index.ts"
    ],
    "passes": true
  },
  {
    "id": 3,
    "category": "setup",
    "description": "Setup backend Bun + Hono",
    "steps": [
      "Créer apps/backend/package.json avec dépendances",
      "Créer apps/backend/tsconfig.json",
      "Créer point d'entrée src/index.ts avec Hono",
      "Ajouter route GET /api/health",
      "Vérifier que bun run dev démarre"
    ],
    "passes": true
  },
  {
    "id": 4,
    "category": "setup",
    "description": "Setup Drizzle + SQLite backend",
    "steps": [
      "Installer drizzle-orm et better-sqlite3",
      "Créer drizzle.config.ts",
      "Créer src/infrastructure/database/schema.ts",
      "Créer src/infrastructure/database/client.ts",
      "Générer et appliquer migration initiale"
    ],
    "passes": true
  },
  {
    "id": 5,
    "category": "setup",
    "description": "Setup extension Chrome avec Vite + CRXJS",
    "steps": [
      "Créer apps/extension/package.json",
      "Créer vite.config.ts avec @crxjs/vite-plugin",
      "Créer public/manifest.json (MV3)",
      "Créer structure src/ (background, content, popup)",
      "Vérifier que pnpm build génère le dist/"
    ],
    "passes": true
  },
  {
    "id": 6,
    "category": "backend",
    "description": "Implémenter couche Domain",
    "steps": [
      "Créer src/domain/entities/analysis.entity.ts",
      "Créer src/domain/value-objects/score.vo.ts",
      "Créer src/domain/value-objects/price.vo.ts",
      "Créer src/domain/errors/domain.error.ts",
      "Exporter depuis index.ts"
    ],
    "passes": true
  },
  {
    "id": 7,
    "category": "backend",
    "description": "Implémenter interfaces Application (ports)",
    "steps": [
      "Créer src/application/interfaces/repositories/analysis.repository.interface.ts",
      "Créer src/application/interfaces/providers/ai.provider.interface.ts",
      "Créer src/application/interfaces/providers/market-price.provider.interface.ts",
      "Créer DTOs dans src/application/dtos/"
    ],
    "passes": true
  },
  {
    "id": 8,
    "category": "backend",
    "description": "Implémenter repository Drizzle",
    "steps": [
      "Créer src/infrastructure/repositories/drizzle-analysis.repository.ts",
      "Implémenter save(), findByVintedId(), findAll(), updateStatus()",
      "Implémenter le mapper entity <-> db record"
    ],
    "passes": true
  },
  {
    "id": 9,
    "category": "backend",
    "description": "Implémenter provider IA (OpenAI)",
    "steps": [
      "Installer ai et @ai-sdk/openai",
      "Créer src/infrastructure/providers/ai/openai.provider.ts",
      "Implémenter analyzePhotos() avec prompt structuré",
      "Implémenter generateNegotiation() avec prompt",
      "Implémenter scoreOpportunity() avec prompt"
    ],
    "passes": true
  },
  {
    "id": 10,
    "category": "backend",
    "description": "Setup Inversify (DI Container)",
    "steps": [
      "Installer inversify et reflect-metadata",
      "Créer src/container/types.ts avec TYPES symbols",
      "Créer src/container/container.ts",
      "Binder les interfaces aux implémentations",
      "Ajouter reflect-metadata import dans index.ts"
    ],
    "passes": true
  },
  {
    "id": 11,
    "category": "backend",
    "description": "Implémenter Use Case AnalyzeArticle",
    "steps": [
      "Créer src/application/use-cases/analyze-article.use-case.ts",
      "Injecter AI provider et repository",
      "Orchestrer: analyzePhotos → scoreOpportunity → generateNegotiation → save",
      "Retourner AnalysisResult complet"
    ],
    "passes": true
  },
  {
    "id": 12,
    "category": "backend",
    "description": "Implémenter Use Case GetAnalysis",
    "steps": [
      "Créer src/application/use-cases/get-analysis.use-case.ts",
      "Implémenter getByVintedId()",
      "Implémenter getAll() avec pagination",
      "Implémenter getStats()"
    ],
    "passes": true
  },
  {
    "id": 13,
    "category": "backend",
    "description": "Implémenter Use Case ExportMarkdown",
    "steps": [
      "Créer src/application/use-cases/export-markdown.use-case.ts",
      "Implémenter template markdown",
      "Générer le fichier .md formaté",
      "Retourner le contenu string"
    ],
    "passes": true
  },
  {
    "id": 14,
    "category": "backend",
    "description": "Implémenter Controller et Routes",
    "steps": [
      "Créer src/adapters/controllers/analysis.controller.ts",
      "Créer src/routes/analysis.routes.ts",
      "POST /api/analyze",
      "GET /api/analyses",
      "GET /api/analyses/:vintedId",
      "PATCH /api/analyses/:vintedId/status",
      "GET /api/analyses/:vintedId/export"
    ],
    "passes": true
  },
  {
    "id": 15,
    "category": "backend",
    "description": "Ajouter validation Zod sur les routes",
    "steps": [
      "Créer schemas Zod pour chaque endpoint",
      "Valider body POST /api/analyze",
      "Valider query params GET /api/analyses",
      "Retourner erreurs 400 formatées"
    ],
    "passes": true
  },
  {
    "id": 16,
    "category": "backend",
    "description": "Ajouter CORS et error handling global",
    "steps": [
      "Configurer CORS pour localhost extension",
      "Créer middleware error handler",
      "Logger les erreurs",
      "Retourner JSON formaté pour toutes les erreurs"
    ],
    "passes": true
  },
  {
    "id": 17,
    "category": "extension",
    "description": "Implémenter Background Service Worker",
    "steps": [
      "Créer src/background/index.ts",
      "Setup message listeners",
      "Implémenter appel API backend",
      "Gérer état extension (on/off)"
    ],
    "passes": true
  },
  {
    "id": 18,
    "category": "extension",
    "description": "Implémenter parser DOM Vinted",
    "steps": [
      "Créer src/content/lib/parser.ts",
      "Extraire titre, prix, description",
      "Extraire photos URLs",
      "Extraire infos vendeur",
      "Extraire marque, taille, état"
    ],
    "passes": true
  },
  {
    "id": 19,
    "category": "extension",
    "description": "Setup React + Shadow DOM pour content script",
    "steps": [
      "Créer src/content/index.tsx entry point",
      "Créer Shadow DOM container",
      "Monter React app dans le shadow root",
      "Injecter Tailwind styles dans shadow DOM"
    ],
    "passes": true
  },
  {
    "id": 20,
    "category": "extension",
    "description": "Implémenter composant Badge score",
    "steps": [
      "Créer src/content/components/Badge.tsx",
      "Afficher score 1-10 avec couleur",
      "Positionner sur photo principale Vinted",
      "Ajouter tooltip au hover",
      "Click ouvre sidebar"
    ],
    "passes": true
  },
  {
    "id": 21,
    "category": "extension",
    "description": "Implémenter composant Sidebar",
    "steps": [
      "Créer src/content/components/Sidebar.tsx",
      "Section header avec score global",
      "Section prix marché",
      "Section marge potentielle",
      "Section signaux (liste)",
      "Toggle open/close"
    ],
    "passes": true
  },
  {
    "id": 22,
    "category": "extension",
    "description": "Implémenter section Négociation dans Sidebar",
    "steps": [
      "Afficher script généré",
      "Bouton copier dans clipboard",
      "Afficher prix offre suggéré",
      "Afficher arguments clés"
    ],
    "passes": false
  },
  {
    "id": 23,
    "category": "extension",
    "description": "Implémenter section Revente dans Sidebar",
    "steps": [
      "Afficher prix recommandé",
      "Afficher délai estimé",
      "Afficher tips",
      "Afficher plateformes recommandées"
    ],
    "passes": false
  },
  {
    "id": 24,
    "category": "extension",
    "description": "Implémenter Export Markdown",
    "steps": [
      "Bouton Export .md dans sidebar",
      "Appeler endpoint backend /export",
      "Déclencher téléchargement fichier",
      "Nommer fichier: {brand}_{title}_{date}.md"
    ],
    "passes": false
  },
  {
    "id": 25,
    "category": "extension",
    "description": "Implémenter cache IndexedDB (Dexie)",
    "steps": [
      "Créer src/db/index.ts avec Dexie",
      "Table analyses avec TTL",
      "Check cache avant appel backend",
      "Invalider cache après 1h",
      "Bouton refresh force re-analyse"
    ],
    "passes": false
  },
  {
    "id": 26,
    "category": "extension",
    "description": "Implémenter store Zustand",
    "steps": [
      "Créer src/stores/analysis.store.ts",
      "State: currentAnalysis, isLoading, error, sidebarOpen",
      "Actions: analyze, toggleSidebar, clearError",
      "Persist settings dans chrome.storage"
    ],
    "passes": false
  },
  {
    "id": 27,
    "category": "extension",
    "description": "Implémenter Popup extension",
    "steps": [
      "Créer src/popup/index.tsx",
      "Afficher status connexion backend",
      "Afficher stats du jour",
      "Toggle ON/OFF extension",
      "Lien vers settings"
    ],
    "passes": false
  },
  {
    "id": 28,
    "category": "extension",
    "description": "Implémenter page Settings dans Popup",
    "steps": [
      "URL backend configurable",
      "Seuil score pour highlight",
      "API Key OpenAI (optionnel)",
      "Auto-open sidebar toggle",
      "Sauvegarder dans chrome.storage"
    ],
    "passes": false
  },
  {
    "id": 29,
    "category": "extension",
    "description": "Implémenter états Loading/Error UI",
    "steps": [
      "Skeleton loader pendant analyse",
      "Message d'erreur avec bouton retry",
      "Indicateur 'analysé il y a X min'",
      "Toast notifications"
    ],
    "passes": false
  },
  {
    "id": 30,
    "category": "integration",
    "description": "Tester flow complet end-to-end",
    "steps": [
      "Lancer backend (bun run dev)",
      "Charger extension dans Chrome",
      "Naviguer sur article Vinted",
      "Vérifier badge s'affiche",
      "Vérifier sidebar fonctionne",
      "Vérifier export .md"
    ],
    "passes": false
  },
  {
    "id": 31,
    "category": "polish",
    "description": "Ajouter provider Ollama (alternative locale)",
    "steps": [
      "Créer src/infrastructure/providers/ai/ollama.provider.ts",
      "Implémenter même interface que OpenAI",
      "Configurer switch dans container",
      "Documenter setup Ollama"
    ],
    "passes": false
  },
  {
    "id": 32,
    "category": "polish",
    "description": "Finaliser README et documentation",
    "steps": [
      "Créer README.md complet",
      "Documenter installation",
      "Documenter configuration",
      "Ajouter screenshots",
      "Lister les limitations connues"
    ],
    "passes": false
  }
]
```

---

## Agent Instructions

1. Read `activity.md` first to understand current state
2. Find next task with `"passes": false`
3. Complete all steps for that task
4. Verify with lint/typecheck/build
5. Update task to `"passes": true`
6. Log completion in `activity.md`
7. Git commit
8. Repeat until all tasks pass

**Important:** Only modify the `passes` field. Do not remove or rewrite tasks.

---

## Completion Criteria

All 32 tasks marked with `"passes": true`
