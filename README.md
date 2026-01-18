# Vinted AI Assistant

> Extension Chrome intelligente qui utilise l'IA pour analyser les annonces Vinted en temps réel.

![License](https://img.shields.io/badge/license-AGPL--3.0%20with%20Commons%20Clause-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Bun](https://img.shields.io/badge/Bun-runtime-f9f1e1)

## Fonctionnalités

- **Score d'Opportunité (1-10)** — Évaluation instantanée basée sur le prix, la valeur marché, et des signaux clés
- **Estimation Prix Marché** — Recherche Google en temps réel pour comparer avec 8-10 sources
- **Scripts de Négociation** — Messages personnalisables (amical, direct, urgent) générés par IA
- **Conseils Revente** — Prix recommandé et plateformes suggérées
- **Vérification Authenticité** — Analyse visuelle pour les articles de marque
- **Analyse Photos** — Évaluation de la qualité et détection des défauts

## Architecture

```
vinted-ai-assistant/
├── apps/
│   ├── backend/          # API Hono + Bun
│   │   ├── src/
│   │   │   ├── adapters/       # Controllers
│   │   │   ├── application/    # Use cases, DTOs
│   │   │   ├── domain/         # Entities, Value Objects
│   │   │   └── infrastructure/ # DB, AI Providers
│   │   └── data/               # SQLite database
│   │
│   └── extension/        # Chrome Extension (React + Vite)
│       └── src/
│           ├── background/     # Service Worker
│           ├── content/        # Content Script (UI)
│           ├── popup/          # Extension Popup
│           └── stores/         # Zustand State
│
└── packages/
    └── shared/           # Types partagés
```

## Stack Technique

| Composant | Technologies |
|-----------|-------------|
| **Backend** | Bun, Hono, Drizzle ORM, SQLite |
| **Extension** | React 19, Vite, Tailwind CSS, Zustand |
| **IA** | Google Gemini (avec Google Search grounding), OpenAI |
| **Monorepo** | pnpm workspaces, Turborepo |

## Installation

### Prérequis

- [Bun](https://bun.sh/) >= 1.0
- [pnpm](https://pnpm.io/) >= 8.0
- Clé API Gemini ou OpenAI

### Setup

```bash
# Cloner le repo
git clone https://github.com/your-username/vinted-ai-assistant.git
cd vinted-ai-assistant

# Installer les dépendances
pnpm install

# Configurer l'environnement
cp apps/backend/.env.example apps/backend/.env
# Éditer .env avec votre clé API

# Lancer le backend
pnpm --filter backend dev

# Builder l'extension
pnpm --filter extension build
```

### Charger l'extension dans Chrome

1. Ouvrir `chrome://extensions/`
2. Activer le "Mode développeur"
3. Cliquer "Charger l'extension non empaquetée"
4. Sélectionner le dossier `apps/extension/dist/`

## Configuration

### Variables d'environnement (Backend)

```env
# AI Provider (choisir un)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=3000
```

### Paramètres Extension

Accessible via le popup de l'extension :
- **URL Backend** — Par défaut `http://localhost:3000`
- **Seuil Score** — Score minimum pour notification (défaut: 7)
- **Auto-open Sidebar** — Ouvrir automatiquement la sidebar

## Utilisation

1. Naviguer sur une page article Vinted (ex: `vinted.fr/items/123456`)
2. L'extension analyse automatiquement l'article
3. Un badge apparaît sur la photo avec le score
4. Cliquer pour ouvrir la sidebar avec l'analyse complète
5. Naviguer entre les onglets : Insight, Négocier, Revendre, Sources

## Captures d'écran

*Coming soon*

## Développement

```bash
# Lancer tout en dev
pnpm dev

# Build production
pnpm build

# Type check
pnpm typecheck

# Linter
pnpm lint
```

## Roadmap

- [ ] Support multi-pays (DE, IT, ES, etc.)
- [ ] Historique des prix
- [ ] Alertes prix
- [ ] Export CSV/Excel
- [ ] Mode sombre

## Licence

Ce projet est sous licence **AGPL-3.0 avec Commons Clause**.

Vous êtes libre de :
- Voir, modifier et distribuer le code source
- Utiliser pour un usage personnel et non-commercial

Vous ne pouvez pas :
- Vendre ce logiciel ou des services basés dessus
- Utiliser à des fins commerciales sans autorisation

Voir [LICENSE](./LICENSE) pour les détails complets.

---

**Disclaimer**: Ce projet n'est pas affilié à Vinted. Utilisez de manière responsable et respectez les conditions d'utilisation de Vinted.
