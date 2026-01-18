# PRD : Vinted AI Reselling Assistant

## 1. Executive Summary

**Projet** : Extension Chrome + Backend local pour identifier des opportunités d'achat sous-évaluées sur Vinted, analyser leur potentiel de revente en temps réel, et générer des recommandations actionables directement dans l'interface Vinted.

**Objectif** : Augmenter l'expérience de navigation Vinted avec une analyse IA instantanée, sans scraping agressif ni risque de ban.

**Mode** : Extension Chrome injectant une UI enrichie + Backend local pour l'analyse IA.

---

## 2. Contexte & Problème

### Problème
- Trouver manuellement des bonnes affaires sur Vinted est chronophage
- Les meilleures opportunités partent vite
- Évaluer le prix marché demande des recherches sur plusieurs sites
- Identifier les vendeurs motivés nécessite de l'expérience
- Les solutions de scraping automatique se font ban rapidement

### Solution
Une extension Chrome qui :
1. Détecte automatiquement quand tu es sur une page article Vinted
2. Analyse l'article en temps réel (photos, prix, vendeur)
3. Affiche un score d'opportunité directement sur la page
4. Propose une sidebar avec analyse complète, script de négociation, estimation revente
5. Permet d'exporter les infos en .md pour tracking personnel

### Pourquoi cette approche ?
- **Zero risque ban** : utilise ta session Vinted réelle, comportement 100% humain
- **Zero coût infra** : tout tourne en local
- **UX native** : pas besoin d'aller sur un dashboard externe
- **Instantané** : analyse dès que tu arrives sur un article

---

## 3. Utilisateurs Cibles

**Persona principal** : Reseller individuel (toi)
- Connaît le marché streetwear/vintage
- Navigue sur Vinted quotidiennement
- Cherche des opportunités avec 30-50%+ de marge
- Veut une décision rapide sans quitter Vinted

---

## 4. Objectifs & KPIs

### Objectifs
- Analyse complète d'un article en < 5 secondes
- Décision d'achat informée sans quitter la page Vinted
- Historique des articles analysés pour tracking

### KPIs
- Temps moyen d'analyse
- Nombre d'articles analysés / jour
- Taux de précision score vs marge réelle
- Articles exportés / achetés / revendus

---

## 5. Scope

### In Scope (MVP)
- Extension Chrome avec injection UI sur pages articles Vinted
- Badge score sur photo principale
- Sidebar d'analyse détaillée
- Analyse IA des photos (qualité, authenticité, état)
- Estimation prix marché
- Génération script de négociation
- Estimation prix et délai de revente
- Export .md de l'analyse
- Historique local des analyses (IndexedDB)
- Backend local pour traitement IA

### Out of Scope (MVP)
- Dashboard web séparé
- Alertes Discord/notifications push
- Scan automatique de catégories
- Multi-navigateur (Firefox, Safari)
- Synchronisation cloud

### Futur (V2+)
- Popup extension avec liste des opportunités récentes
- Alertes configurables (score > X)
- Scan automatique en background des favoris
- Dashboard web optionnel
- Export vers Notion/Airtable
- Comparaison multi-plateformes (Depop, Leboncoin)

---

## 6. Spécifications Fonctionnelles

### 6.1 Extension Chrome - Content Script

**Déclenchement :**
- Détecte URL pattern : `vinted.fr/items/*`
- Extrait automatiquement les données de la page (DOM parsing)
- Appelle le backend local pour analyse

**Données extraites de la page :**
```typescript
interface VintedArticleData {
  vintedId: string
  url: string
  title: string
  description: string
  price: number
  brand: string | null
  size: string | null
  condition: string
  photos: string[] // URLs
  seller: {
    username: string
    rating: number | null
    salesCount: number
    responseTime: string | null
    lastSeen: string | null
  }
  listedAt: Date | null
  views: number | null
  favorites: number | null
}
```

**UI Injectée :**

1. **Badge Score** (sur photo principale)
   - Pastille colorée (rouge/orange/vert) avec score 1-10
   - Tooltip au hover avec résumé rapide
   - Click → ouvre sidebar

2. **Sidebar** (panneau fixe à droite, toggleable)
   - Header avec score global et indicateur confiance
   - Section "Prix Marché" avec fourchette et sources
   - Section "Marge Potentielle" avec calculs
   - Section "Négociation" avec script généré + bouton copier
   - Section "Revente" avec prix reco et délai estimé
   - Section "Signaux" (qualité photos, ancienneté, vendeur)
   - Boutons actions : Export .md, Sauvegarder, Marquer comme acheté

3. **États UI**
   - Loading : skeleton + spinner pendant analyse
   - Success : affichage complet
   - Error : message + bouton retry
   - Cached : indicateur "analysé il y a X min" + bouton refresh

### 6.2 Extension Chrome - Background Service Worker

**Responsabilités :**
- Gestion du cache analyses (IndexedDB)
- Communication avec backend local
- Gestion état global (sidebar ouverte/fermée, settings)
- Badge extension avec compteur articles analysés aujourd'hui

**Cache Strategy :**
- Clé : `vintedId`
- TTL : 1 heure (prix peuvent changer)
- Invalidation manuelle possible (bouton refresh)

### 6.3 Extension Chrome - Popup

**Contenu (simple pour MVP) :**
- Status connexion backend (vert/rouge)
- Stats du jour : X articles analysés, Y opportunités (score > 7)
- Accès rapide aux settings
- Toggle ON/OFF de l'extension

**Settings :**
- URL backend (défaut: `http://localhost:3000`)
- Seuil score pour highlight (défaut: 7)
- Provider IA (OpenAI / Ollama)
- API Key OpenAI (si applicable)
- Auto-open sidebar (oui/non)

### 6.4 Backend - API

**Stack :** Bun + Hono + Drizzle + SQLite

**Endpoints :**

```
POST /api/analyze
Body: VintedArticleData
Response: AnalysisResult

GET /api/analyses
Query: ?limit=50&offset=0&minScore=7
Response: AnalysisResult[]

GET /api/analyses/:vintedId
Response: AnalysisResult | 404

PATCH /api/analyses/:vintedId/status
Body: { status: 'BOUGHT' | 'SOLD' | 'ARCHIVED' }
Response: AnalysisResult

GET /api/stats
Response: { today: number, opportunities: number, bought: number, sold: number }

GET /api/health
Response: { status: 'ok', aiProvider: string }
```

**AnalysisResult :**
```typescript
interface AnalysisResult {
  id: string
  vintedId: string
  url: string
  title: string
  price: number
  brand: string | null

  // Photo Analysis
  photoQuality: {
    score: number // 1-10
    hasModel: boolean
    lighting: 'poor' | 'average' | 'good'
    background: 'messy' | 'neutral' | 'professional'
    issues: string[]
  }

  // Authenticity
  authenticityCheck: {
    score: number // 1-10
    flags: string[] // "logo flou", "étiquette suspecte", etc.
    confidence: 'low' | 'medium' | 'high'
  }

  // Market Price
  marketPrice: {
    low: number
    high: number
    average: number
    sources: Array<{ name: string, price: number, url?: string }>
    confidence: 'low' | 'medium' | 'high'
  }

  // Opportunity
  opportunity: {
    score: number // 1-10
    margin: number // euros
    marginPercent: number
    signals: Array<{
      type: 'positive' | 'negative' | 'neutral'
      label: string
      detail: string
    }>
  }

  // Negotiation
  negotiation: {
    suggestedOffer: number
    script: string
    arguments: string[]
    tone: 'friendly' | 'direct' | 'urgent'
  }

  // Resale
  resale: {
    recommendedPrice: number
    estimatedDays: number
    tips: string[]
    platforms: Array<{ name: string, relevance: 'high' | 'medium' | 'low' }>
  }

  // Meta
  status: 'ANALYZED' | 'WATCHING' | 'BOUGHT' | 'SOLD' | 'ARCHIVED'
  analyzedAt: Date
  cachedUntil: Date
}
```

### 6.5 Backend - Module IA

**Analyse Photos (via Vercel AI SDK) :**

Prompt structuré envoyant les photos + contexte :
- Évaluation qualité photos (éclairage, fond, netteté)
- Détection présence mannequin / plat / porté
- Identification marque visible et modèle si possible
- Estimation état réel vs déclaré
- Flags authenticité (logos, étiquettes, finitions)

**Recherche Prix Marché :**

Options d'implémentation :
1. **Google Lens API** (si dispo) → identification produit + prix
2. **Scraping léger** des résultats Google Shopping (avec ton navigateur via extension)
3. **Base de données prix** construite au fil du temps (tes propres analyses)
4. **LLM estimation** basée sur marque/modèle/état (fallback)

**Scoring Opportunité :**

Formule pondérée :
```
score = (
  margePercent * 0.35 +
  photoQualityInverse * 0.20 +  // Photos amateur = opportunité
  anciennetéAnnonce * 0.15 +    // Vieille annonce = négociable
  sellerMotivation * 0.15 +     // Peu de ventes, répond vite
  authenticityScore * 0.15
) / 10
```

**Génération Négociation :**

Contexte fourni au LLM :
- Prix demandé vs prix marché
- Ancienneté annonce
- Signaux vendeur (ventes, réponses)
- État article
- Ton souhaité (configurable)

Output : script prêt à copier/coller + arguments clés

### 6.6 Export Markdown

**Format fichier :** `{brand}_{title}_{date}.md`

**Template :**
```markdown
# {title}

## Infos Article
- **URL:** {url}
- **Prix demandé:** {price}€
- **Marque:** {brand}
- **Taille:** {size}
- **État:** {condition}
- **Vendeur:** {seller.username} ({seller.rating}⭐, {seller.salesCount} ventes)

## Analyse IA

### Score Opportunité: {score}/10

### Prix Marché
- Fourchette: {marketPrice.low}€ - {marketPrice.high}€
- Moyenne: {marketPrice.average}€
- Marge potentielle: +{margin}€ ({marginPercent}%)

### Signaux
{#each signals}
- {type_emoji} **{label}**: {detail}
{/each}

### Authenticité
Score: {authenticityScore}/10
{#if flags.length}
⚠️ Points d'attention:
{#each flags}
- {flag}
{/each}
{/if}

## Négociation

**Offre suggérée:** {suggestedOffer}€

**Script:**
> {negotiationScript}

**Arguments:**
{#each arguments}
- {argument}
{/each}

## Revente

- **Prix recommandé:** {resalePrice}€
- **Délai estimé:** {estimatedDays} jours
- **Plateformes:** {platforms}

**Tips:**
{#each tips}
- {tip}
{/each}

---
*Analysé le {analyzedAt} par Vinted AI Assistant*
```

---

## 7. Architecture Technique

### 7.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXTENSION CHROME (MV3)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Content Script │  │   Background    │  │     Popup      │  │
│  │                 │  │  Service Worker │  │                │  │
│  │  • DOM parsing  │  │                 │  │  • Settings    │  │
│  │  • UI injection │  │  • IndexedDB    │  │  • Stats       │  │
│  │  • React/Shadow │  │  • API calls    │  │  • Status      │  │
│  │                 │  │  • State mgmt   │  │                │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │ chrome.runtime                 │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 │ HTTP localhost:3000
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND LOCAL (Bun)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      Hono Router                         │   │
│  │         /api/analyze  /api/analyses  /api/stats          │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│  ┌─────────────────────────┼───────────────────────────────┐   │
│  │                    CLEAN ARCHITECTURE                    │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │                   ADAPTERS                        │   │   │
│  │  │     Controllers • Mappers • Route Handlers        │   │   │
│  │  └──────────────────────┬───────────────────────────┘   │   │
│  │                         │                                │   │
│  │  ┌──────────────────────┼───────────────────────────┐   │   │
│  │  │                 APPLICATION                       │   │   │
│  │  │    AnalyzeArticleUseCase • GetAnalysesUseCase     │   │   │
│  │  │         ExportMarkdownUseCase • etc.              │   │   │
│  │  └──────────────────────┬───────────────────────────┘   │   │
│  │                         │                                │   │
│  │  ┌──────────────────────┼───────────────────────────┐   │   │
│  │  │                   DOMAIN                          │   │   │
│  │  │   Analysis Entity • Price VO • Score VO           │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                    │
│  ┌─────────────────────────┼───────────────────────────────┐   │
│  │                   INFRASTRUCTURE                         │   │
│  │                                                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────────┐  │   │
│  │  │  Drizzle   │  │  OpenAI    │  │  Market Price     │  │   │
│  │  │  SQLite    │  │  Provider  │  │  Provider         │  │   │
│  │  └────────────┘  └────────────┘  └───────────────────┘  │   │
│  │                                                          │   │
│  │  ┌────────────┐  ┌────────────┐                         │   │
│  │  │  Ollama    │  │  Markdown  │                         │   │
│  │  │  Provider  │  │  Exporter  │                         │   │
│  │  └────────────┘  └────────────┘                         │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Stack Technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Extension** | Chrome MV3 | Standard actuel, service workers |
| **Extension UI** | React 19 + Vite | Build rapide, DX moderne |
| **Extension State** | Zustand | Léger, simple, persistance easy |
| **Extension Storage** | IndexedDB (Dexie) | Cache local performant |
| **Shadow DOM** | Native | Isolation CSS vs Vinted |
| **Backend Runtime** | Bun | Rapide, natif TS, batteries included |
| **Backend Framework** | Hono | Ultra léger, typing excellent |
| **Architecture** | Clean Architecture | Testable, maintenable, évolutif |
| **DI Container** | Inversify | Injection de dépendances propre |
| **Database** | SQLite + Drizzle | Zero config, type-safe |
| **IA SDK** | Vercel AI SDK | Multi-provider, streaming |
| **IA Providers** | OpenAI / Ollama | Cloud ou local selon préférence |
| **Validation** | Zod | Runtime validation + types |
| **Linting** | Biome | Fast, all-in-one |

### 7.3 Structure Projet

```
vinted-ai-assistant/
├── apps/
│   ├── extension/                    # Extension Chrome
│   │   ├── src/
│   │   │   ├── background/
│   │   │   │   └── index.ts          # Service worker
│   │   │   ├── content/
│   │   │   │   ├── index.tsx         # Entry point content script
│   │   │   │   ├── components/
│   │   │   │   │   ├── Badge.tsx     # Score badge sur photo
│   │   │   │   │   ├── Sidebar.tsx   # Panel analyse
│   │   │   │   │   └── ...
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useAnalysis.ts
│   │   │   │   │   └── useVintedData.ts
│   │   │   │   └── lib/
│   │   │   │       ├── parser.ts     # DOM parsing Vinted
│   │   │   │       └── api.ts        # Appels backend
│   │   │   ├── popup/
│   │   │   │   ├── index.tsx
│   │   │   │   └── components/
│   │   │   ├── stores/
│   │   │   │   └── analysis.store.ts # Zustand
│   │   │   ├── db/
│   │   │   │   └── index.ts          # Dexie (IndexedDB)
│   │   │   └── types/
│   │   │       └── index.ts
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── icons/
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── backend/                      # Backend Bun + Hono
│       ├── src/
│       │   ├── domain/
│       │   │   ├── entities/
│       │   │   │   ├── analysis.entity.ts
│       │   │   │   └── index.ts
│       │   │   ├── value-objects/
│       │   │   │   ├── price.vo.ts
│       │   │   │   ├── score.vo.ts
│       │   │   │   └── index.ts
│       │   │   └── errors/
│       │   │       └── domain.error.ts
│       │   │
│       │   ├── application/
│       │   │   ├── interfaces/
│       │   │   │   ├── repositories/
│       │   │   │   │   └── analysis.repository.interface.ts
│       │   │   │   └── providers/
│       │   │   │       ├── ai.provider.interface.ts
│       │   │   │       └── market-price.provider.interface.ts
│       │   │   ├── use-cases/
│       │   │   │   ├── analyze-article.use-case.ts
│       │   │   │   ├── get-analysis.use-case.ts
│       │   │   │   ├── export-markdown.use-case.ts
│       │   │   │   └── index.ts
│       │   │   └── dtos/
│       │   │       ├── article.dto.ts
│       │   │       └── analysis.dto.ts
│       │   │
│       │   ├── infrastructure/
│       │   │   ├── database/
│       │   │   │   ├── schema.ts
│       │   │   │   ├── client.ts
│       │   │   │   └── migrations/
│       │   │   ├── repositories/
│       │   │   │   └── drizzle-analysis.repository.ts
│       │   │   └── providers/
│       │   │       ├── ai/
│       │   │       │   ├── openai.provider.ts
│       │   │       │   └── ollama.provider.ts
│       │   │       └── market-price/
│       │   │           └── google-lens.provider.ts
│       │   │
│       │   ├── adapters/
│       │   │   ├── controllers/
│       │   │   │   └── analysis.controller.ts
│       │   │   └── mappers/
│       │   │       └── analysis.mapper.ts
│       │   │
│       │   ├── container/
│       │   │   ├── container.ts
│       │   │   └── types.ts
│       │   │
│       │   ├── routes/
│       │   │   ├── index.ts
│       │   │   └── analysis.routes.ts
│       │   │
│       │   └── index.ts              # Entry point Hono
│       │
│       ├── drizzle.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                       # Types partagés
│       ├── src/
│       │   ├── types/
│       │   │   ├── article.ts
│       │   │   ├── analysis.ts
│       │   │   └── index.ts
│       │   └── index.ts
│       └── package.json
│
├── .claude/
│   └── settings.json                 # Sandbox config
├── PROMPT.md                         # Prompt Ralph loop
├── plan.md                           # Tasks Ralph loop
├── activity.md                       # Activity log
├── PRD.md                            # Ce document
├── biome.json
├── package.json                      # Workspace root
├── pnpm-workspace.yaml
└── README.md
```

### 7.4 Manifest Extension (MV3)

```json
{
  "manifest_version": 3,
  "name": "Vinted AI Assistant",
  "version": "1.0.0",
  "description": "Analyse IA des opportunités de revente sur Vinted",

  "permissions": [
    "storage",
    "activeTab"
  ],

  "host_permissions": [
    "https://www.vinted.fr/*"
  ],

  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["https://www.vinted.fr/items/*"],
      "js": ["content/index.js"],
      "css": ["content/styles.css"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## 8. Modèle de Données (Drizzle SQLite)

```typescript
// apps/backend/src/infrastructure/database/schema.ts

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const analyses = sqliteTable('analyses', {
  id: text('id').primaryKey(),
  vintedId: text('vinted_id').notNull().unique(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  brand: text('brand'),
  size: text('size'),
  condition: text('condition'),

  // Seller
  sellerUsername: text('seller_username').notNull(),
  sellerRating: real('seller_rating'),
  sellerSalesCount: integer('seller_sales_count'),

  // Photos
  photos: text('photos', { mode: 'json' }).$type<string[]>().notNull(),

  // Photo Analysis
  photoQualityScore: integer('photo_quality_score').notNull(),
  photoAnalysis: text('photo_analysis', { mode: 'json' }).$type<{
    hasModel: boolean
    lighting: 'poor' | 'average' | 'good'
    background: 'messy' | 'neutral' | 'professional'
    issues: string[]
  }>().notNull(),

  // Authenticity
  authenticityScore: integer('authenticity_score').notNull(),
  authenticityFlags: text('authenticity_flags', { mode: 'json' }).$type<string[]>().notNull(),
  authenticityConfidence: text('authenticity_confidence').$type<'low' | 'medium' | 'high'>().notNull(),

  // Market Price
  marketPriceLow: real('market_price_low'),
  marketPriceHigh: real('market_price_high'),
  marketPriceAvg: real('market_price_avg'),
  marketPriceSources: text('market_price_sources', { mode: 'json' }).$type<Array<{
    name: string
    price: number
    url?: string
  }>>(),
  marketPriceConfidence: text('market_price_confidence').$type<'low' | 'medium' | 'high'>(),

  // Opportunity
  opportunityScore: integer('opportunity_score').notNull(),
  margin: real('margin'),
  marginPercent: real('margin_percent'),
  signals: text('signals', { mode: 'json' }).$type<Array<{
    type: 'positive' | 'negative' | 'neutral'
    label: string
    detail: string
  }>>().notNull(),

  // Negotiation
  suggestedOffer: real('suggested_offer'),
  negotiationScript: text('negotiation_script'),
  negotiationArguments: text('negotiation_arguments', { mode: 'json' }).$type<string[]>(),
  negotiationTone: text('negotiation_tone').$type<'friendly' | 'direct' | 'urgent'>(),

  // Resale
  resalePrice: real('resale_price'),
  resaleEstimatedDays: integer('resale_estimated_days'),
  resaleTips: text('resale_tips', { mode: 'json' }).$type<string[]>(),
  resalePlatforms: text('resale_platforms', { mode: 'json' }).$type<Array<{
    name: string
    relevance: 'high' | 'medium' | 'low'
  }>>(),

  // Status
  status: text('status').$type<'ANALYZED' | 'WATCHING' | 'BOUGHT' | 'SOLD' | 'ARCHIVED'>().notNull().default('ANALYZED'),

  // Meta
  analyzedAt: integer('analyzed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
})

export type Analysis = typeof analyses.$inferSelect
export type NewAnalysis = typeof analyses.$inferInsert
```

---

## 9. Prompts IA

### 9.1 Analyse Photo

```typescript
const PHOTO_ANALYSIS_PROMPT = `Tu es un expert en évaluation d'articles de mode pour la revente.

Analyse ces photos d'un article Vinted et fournis:

1. **Qualité Photo** (score 1-10):
   - Éclairage (poor/average/good)
   - Fond (messy/neutral/professional)
   - Présence mannequin ou porté
   - Problèmes détectés

2. **Authenticité** (score 1-10):
   - Logos visibles et qualité
   - Étiquettes (présentes, lisibles, cohérentes)
   - Finitions et coutures
   - Red flags éventuels
   - Niveau de confiance (low/medium/high)

3. **Identification**:
   - Marque détectée
   - Modèle si identifiable
   - État réel estimé

Contexte article:
- Titre: {title}
- Marque déclarée: {brand}
- État déclaré: {condition}
- Prix: {price}€

Réponds en JSON structuré.`
```

### 9.2 Scoring Opportunité

```typescript
const OPPORTUNITY_SCORING_PROMPT = `Tu es un expert en achat-revente streetwear/vintage.

Calcule le score d'opportunité (1-10) pour cet article:

**Article:**
- Prix demandé: {price}€
- Prix marché estimé: {marketPriceLow}€ - {marketPriceHigh}€
- Qualité photos: {photoQualityScore}/10 (photos amateur = opportunité)
- Ancienneté annonce: {daysListed} jours
- Vendeur: {sellerSalesCount} ventes, {sellerRating}⭐

**Signaux à évaluer:**
- Marge potentielle (poids: 35%)
- Photos amateur = vendeur pas pro (poids: 20%)
- Annonce ancienne = négociable (poids: 15%)
- Profil vendeur (poids: 15%)
- Authenticité (poids: 15%)

Fournis:
1. Score global 1-10
2. Liste de signaux (positifs/négatifs/neutres) avec détails
3. Marge estimée en € et %

Réponds en JSON structuré.`
```

### 9.3 Génération Négociation

```typescript
const NEGOTIATION_PROMPT = `Tu es un expert en négociation sur Vinted.

Génère un script de négociation pour cet article:

**Contexte:**
- Prix demandé: {price}€
- Prix marché: {marketPriceAvg}€
- Ancienneté annonce: {daysListed} jours
- Profil vendeur: {sellerSalesCount} ventes
- État: {condition}

**Objectif:** Obtenir le meilleur prix possible tout en restant cordial.

Fournis:
1. Prix d'offre suggéré (réaliste)
2. Script prêt à copier/coller (en français, ton {tone})
3. 3-4 arguments clés à utiliser
4. Ton recommandé (friendly/direct/urgent)

Le script doit:
- Être poli mais ferme
- Mentionner un argument concret (prix marché, ancienneté, défaut)
- Proposer un prix précis
- Rester court (3-4 phrases max)

Réponds en JSON structuré.`
```

---

## 10. Sécurité & Limites

### Pas de risque ban
- Utilise ta session Vinted réelle
- Comportement 100% humain (tu navigues manuellement)
- Aucune requête automatique vers Vinted

### Données locales
- SQLite local uniquement
- Pas de cloud, pas de sync
- Backup = copier le fichier .db

### Limites
- Chrome doit être ouvert
- Backend doit tourner (`bun run dev`)
- Coût API OpenAI si utilisé (ou gratuit avec Ollama local)

---

## 11. Métriques de Succès

### MVP Success Criteria
- [ ] Extension détecte les pages articles Vinted
- [ ] Badge score s'affiche sur la photo principale
- [ ] Sidebar affiche l'analyse complète
- [ ] Script négociation généré et copiable
- [ ] Export .md fonctionnel
- [ ] Temps d'analyse < 5 secondes
- [ ] Historique persisté en SQLite

### Post-MVP
- Précision score vs marge réelle > 70%
- Temps moyen de décision réduit

---

## 12. Dépendances

### Extension
```json
{
  "dependencies": {
    "react": "^19.x",
    "react-dom": "^19.x",
    "zustand": "^5.x",
    "dexie": "^4.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x"
  },
  "devDependencies": {
    "vite": "^6.x",
    "@crxjs/vite-plugin": "^2.x",
    "typescript": "^5.x",
    "tailwindcss": "^4.x",
    "@biomejs/biome": "^1.9.x"
  }
}
```

### Backend
```json
{
  "dependencies": {
    "hono": "^4.x",
    "drizzle-orm": "^0.36.x",
    "better-sqlite3": "^11.x",
    "ai": "^4.x",
    "@ai-sdk/openai": "^1.x",
    "zod": "^3.x",
    "inversify": "^6.x",
    "reflect-metadata": "^0.2.x",
    "@paralleldrive/cuid2": "^2.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "drizzle-kit": "^0.28.x",
    "@biomejs/biome": "^1.9.x",
    "@types/better-sqlite3": "^7.x"
  }
}
```

---

## 13. Commandes Dev

```bash
# Install
pnpm install

# Dev (lance backend + watch extension)
pnpm dev

# Build extension
pnpm --filter extension build

# Build backend
pnpm --filter backend build

# Lint
pnpm lint

# Type check
pnpm typecheck

# DB migrations
pnpm --filter backend db:push
```

---

## 14. Workflow Ralph Loop

Ce projet est conçu pour être buildé avec Claude Code + Ralph Loop.

**Fichiers requis :**
- `PROMPT.md` : Instructions pour chaque itération
- `plan.md` : Liste des tâches avec status
- `activity.md` : Log d'activité

**Commande :**
```
/ralph
→ Sélectionner "Ralph loop"
→ Prompt: (voir PROMPT.md)
→ Max iterations: 30
→ Completion promise: COMPLETE
```

Voir fichiers `PROMPT.md`, `plan.md`, `activity.md` pour le setup complet.
