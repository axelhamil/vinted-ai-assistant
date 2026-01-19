# Vinted AI Assistant

> Smart Chrome extension that uses AI to analyze Vinted listings in real-time.

![License](https://img.shields.io/badge/license-AGPL--3.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Bun](https://img.shields.io/badge/Bun-runtime-f9f1e1)

## Features

- **Opportunity Score (1-10)** — Instant evaluation based on price, market value, and key signals
- **Market Price Estimation** — Real-time Google search comparing 8-10 sources
- **Negotiation Scripts** — Customizable AI-generated messages (friendly, direct, urgent)
- **Resale Tips** — Recommended price and suggested platforms
- **Authenticity Check** — Visual analysis for branded items
- **Photo Analysis** — Quality assessment and defect detection

## Architecture

```
vinted-ai-assistant/
├── apps/
│   ├── backend/          # Hono + Bun API
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
    └── shared/           # Shared types
```

## Tech Stack

| Component | Technologies |
|-----------|-------------|
| **Backend** | Bun, Hono, Drizzle ORM, SQLite |
| **Extension** | React 19, Vite, Tailwind CSS, Zustand |
| **AI** | Google Gemini (with Google Search grounding), OpenAI |
| **Monorepo** | pnpm workspaces, Turborepo |

## Installation

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [pnpm](https://pnpm.io/) >= 8.0
- Gemini or OpenAI API key

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/vinted-ai-assistant.git
cd vinted-ai-assistant

# Install dependencies
pnpm install

# Configure environment
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your API key

# Start the backend
pnpm --filter backend dev

# Build the extension
pnpm --filter extension build
```

### Load extension in Chrome

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `apps/extension/dist/` folder

## Configuration

### Environment Variables (Backend)

```env
# AI Provider (choose one)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=3000
```

### Extension Settings

Accessible via the extension popup:
- **Backend URL** — Default `http://localhost:3000`
- **Score Threshold** — Minimum score for notification (default: 7)
- **Auto-open Sidebar** — Automatically open the sidebar

## Usage

1. Navigate to a Vinted item page (e.g., `vinted.fr/items/123456`)
2. The extension automatically analyzes the item
3. A badge appears on the photo with the score
4. Click to open the sidebar with the full analysis
5. Navigate between tabs: Insight, Negotiate, Resell, Sources

## Screenshots

*Coming soon*

## Development

```bash
# Run everything in dev mode
pnpm dev

# Production build
pnpm build

# Type check
pnpm typecheck

# Linter
pnpm lint
```

## Roadmap

- [ ] Multi-country support (DE, IT, ES, etc.)
- [ ] Price history
- [ ] Price alerts
- [ ] CSV/Excel export
- [ ] Dark mode

## License

This project is licensed under [AGPL-3.0](./LICENSE). Any use of the code (including SaaS) requires sharing modifications under the same license.

---

**Disclaimer**: This project is not affiliated with Vinted. Use responsibly and respect Vinted's terms of service.
