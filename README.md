<div align="center">

<img src="docs/banner.svg" alt="Buildora — describe it, watch it ship" width="100%" />

# ⚡ Buildora

### *Describe it. Watch it ship.*

**An open-source, Lovable/Base44-class AI app-builder platform. One sentence becomes a stunning, working web app — streamed live, token by token — then refined through conversation.**

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-realtime_SSE-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-4169e1?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Brain: Z.AI](https://img.shields.io/badge/Brain-Z.AI-fbbf24?style=for-the-badge)](https://z.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-fbbf24?style=for-the-badge)](LICENSE)

</div>

---

## 🎬 What it feels like

```text
You:  "build a simple calculator with history and a sleek dark design"

      ✦ Connecting          ✓ Planning           ✓ Writing code        ✓ Polishing

      BUILD BLUEPRINT ── Dark Calc · "Calculate in the dark" · minimalist tech
      ✓ Real-time calculation display   ✓ Persistent history log
      ✓ Dark mode toggle                ✓ Memory functions

      [ code streaming live... 18,680 characters · 38s ]

      → v1 is live in the preview. Chat to refine. Download when done.
```

You type a sentence. **Z.AI** architects a blueprint — name, features, palette, vibe — then streams every character of your app into the code panel in real time. The moment it lands, it's running in the live preview. Every follow-up message (*"make the header glassy"*, *"add dark mode"*) intelligently rewrites the whole app while preserving everything that works, and every build is snapshotted so you can time-travel back to any version.

## 🆚 Why Buildora is different

| | Buildora | Typical AI builders |
|---|---|---|
| **Planning** | Visible blueprint (name, features, palette, vibe) before code | Black box |
| **Code streaming** | True token-level SSE — watch every character land | Wait in silence, then dump |
| **Self-healing builds** | Parsed with a real JS engine; broken syntax *and* dead event bindings auto-repaired before you ever see them | Ship broken code, you debug |
| **Truncation guard** | Incomplete documents never saved; builds auto-retry with lifted output limits (16K tokens) | Mysterious half-apps |
| **Version time machine** | Every build snapshotted to cloud **PostgreSQL**, one-click restore | Often paid-tier only |
| **Live thumbnails** | Dashboard renders your actual apps in scaled iframes | Static icons |
| **Code ownership** | Single-file HTML export, zero lock-in, no watermarks | Walled gardens |

## ✨ Features

- 🧠 **Blueprint before code** — Z.AI plans the name, tagline, feature set, palette and vibe, shown as a beautiful animated card in chat before a single line is written.
- 🌊 **True streaming** — a Bun AI-worker relays Z.AI token deltas through FastAPI SSE straight into the code panel. No fake chunked playback.
- 💬 **Chat-driven iteration** — every message is a full-app rewrite that preserves what works and upgrades the polish.
- 🔧 **Self-healing pipeline** — inline `<script>` blocks are parsed with a real JS engine; syntax errors and inline handlers bound to non-global functions are detected and auto-repaired (up to 2 rounds) *before* the version is saved.
- 🛡️ **Completeness guard** — a build only ships if the document closes with `</html>`; truncated output is retried, never persisted.
- ⏳ **Version time machine** — every build is a row in PostgreSQL; restore any version from the History menu.
- 🖥️ **Premium workspace** — resizable panels, syntax-highlighted code with editor chrome and live stats, desktop/mobile viewports, fullscreen mode, open-in-new-tab, one-click download, project rename, search, sort, grid/list layouts.
- 🗄️ **Cloud persistence** — anonymous workspaces, chat history and version snapshots stored in serverless **Neon PostgreSQL** (with an automatic local SQLite fallback for development).
- 🩹 **Resilient by design** — stalled streams are detected honestly and auto-recovered; if the backend is restarting, the frontend boots it and retries transparently.

## 🏗️ Tech Stack

| Layer | Technology | Role |
|---|---|---|
| 🎨 **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui, Framer Motion, Zustand | The face — landing, dashboard, streaming builder workspace |
| 🔩 **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0, Uvicorn | The spine — REST + **Server-Sent Events** for generation |
| 🗄️ **Database** | **PostgreSQL (Neon serverless)** — with SQLite dev fallback | The memory — users, projects, chat messages, version snapshots |
| 🤖 **AI** | **Z.AI (GLM)** via a Bun AI-worker | The brain — blueprinting, code generation, chat refinement |
| 🔁 **Streaming** | Bun + SSE relay, token-level deltas | Live code as it's written |
| 🚪 **Gateway** | Caddy reverse proxy (`XTransformPort` routing) | Single-port entry, smart service routing |
| 🧪 **Validation** | Real JS engine parse + event-binding checker | Self-healing generated code |

> **Database:** Buildora runs on **PostgreSQL**, powered by [Neon](https://neon.tech)'s free serverless tier in production — every project, message and version snapshot lives there. Point `DATABASE_URL` at any PostgreSQL instance, or let it fall back to local SQLite for instant development.

## 📐 Architecture

```mermaid
flowchart LR
    subgraph Browser["Browser — Next.js 16 + Tailwind 4 + shadcn/ui"]
        UI[Landing · Dashboard · Builder]
    end
    subgraph Gateway["Caddy Gateway :81"]
        C[Caddy reverse proxy<br/>XTransformPort routing]
    end
    subgraph Services
        API[FastAPI :8000<br/>projects · chat · versions<br/>SSE generation · validation loop]
        WORKER[Bun AI Worker :8001<br/>Z.AI chat · token streaming<br/>JS syntax + binding validator]
        DB[(Neon PostgreSQL<br/>users · projects · messages · versions)]
    end
    UI -->|/api/* + XTransformPort| C
    C -->|:3000| UI
    C -->|:8000| API
    API <--> DB
    API -->|/v1/chat/stream SSE| WORKER
    API -->|/v1/check-js| WORKER
    WORKER <-->|Z.AI API| ZAI[Z.AI GLM]
```

**The self-healing loop:**

```mermaid
flowchart TB
    A[Z.AI streams app code] --> B[Extract complete HTML?]
    B -- truncated --> C[Discard + retry build]
    B -- complete --> D[Parse every inline script<br/>with real JS engine]
    D -- syntax error --> E[Auto-repair round<br/>with precise error report]
    D -- inline handler not global --> E
    D -- clean --> F[Persist version to PostgreSQL]
    E --> B
```

## 🚀 Quickstart

```bash
# 1. Frontend (Next.js 16)
bun install
cp .env.example .env           # optional: only for Prisma local dev
bun run dev                    # http://localhost:3000

# 2. AI worker (Bun + Z.AI)
cd mini-services/ai-worker
bun install
bun run dev                    # listens on :8001

# 3. FastAPI backend
cd mini-services/api
pip install -r requirements.txt
cp .env.example .env           # put your Neon PostgreSQL URL here
./run.sh                       # or: uvicorn main:app --port 8000 --reload
```

Open the app and type: *"a habit tracker with streaks and a weekly heatmap"* — then watch it ship.

> The Next.js boot endpoint (`/api/boot`) auto-spawns and health-checks both mini-services, so the frontend is self-healing in dev too.

## 🔑 Environment

| Service | File | Key | Purpose |
|---|---|---|---|
| FastAPI | `mini-services/api/.env` | `DATABASE_URL` | **Neon PostgreSQL** connection string (`postgresql://…?sslmode=require`) — omit for local SQLite fallback |
| FastAPI | `mini-services/api/.env` | `AI_WORKER_URL` | defaults to `http://127.0.0.1:8001` |
| Frontend | `.env` | `DATABASE_URL` | only needed for Prisma tooling |

`.env` files are git-ignored. Z.AI credentials are read by `z-ai-web-dev-sdk` from its own config.

## 📡 API reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness + database check |
| `POST` | `/api/users` | Create/fetch an anonymous workspace user |
| `GET` | `/api/projects?user_id=` | List projects with version counts |
| `POST` | `/api/projects` | Create project from a prompt |
| `GET` | `/api/projects/{id}` | Full detail: messages, versions, current HTML |
| `PATCH` | `/api/projects/{id}` | Rename / update description |
| `DELETE` | `/api/projects/{id}` | Delete project + cascade |
| `GET` | `/api/projects/{id}/preview` | Raw generated app as HTML (new tab, thumbnails) |
| `POST` | `/api/projects/{id}/chat` | Append a user message |
| `POST` | `/api/projects/{id}/generate` | **SSE stream**: `status` → `plan` → `chunk*` → `done` |
| `GET` | `/api/projects/{id}/versions` | Version list |
| `POST` | `/api/projects/{id}/restore` | Restore a version |

## 🗂️ Project structure

```text
├── src/
│   ├── app/                    # Next.js App Router (single-page orchestrator)
│   │   ├── api/boot/           # self-healing mini-service supervisor
│   │   └── page.tsx            # view routing: landing → dashboard → builder
│   ├── components/buildora/    # landing, dashboard, builder workspaces
│   └── lib/                    # gateway API client, SSE parser, Zustand store
├── mini-services/
│   ├── api/                    # FastAPI: models, schemas, prompts, generation
│   └── ai-worker/              # Bun: Z.AI chat, token streaming, JS validator
├── docs/                       # animated brand assets
└── prisma/                     # optional local Prisma tooling
```

## 🧬 Data model

```mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    PROJECT ||--o{ MESSAGE : contains
    PROJECT ||--o{ VERSION : snapshots
    VERSION {
        int version_number
        text html_code
        text summary
    }
    USER { string id PK }
    PROJECT { string name  string current_version_id }
```

## 🗺️ Roadmap

- [ ] Supabase Auth (Google / GitHub sign-in)
- [ ] Multi-file exports (Vite project scaffold)
- [ ] Image-to-app (screenshot → rebuild)
- [ ] Realtime collaboration on the builder canvas
- [ ] One-click deploy targets (Vercel / Netlify)

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

**Built with [Z.AI](https://z.ai) as the brain · FastAPI as the spine · Next.js 16 as the face · PostgreSQL as the memory**

If Buildora impressed you, star the repo — it helps more than you know.

</div>
