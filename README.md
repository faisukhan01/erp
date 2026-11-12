<div align="center">

<img src="public/brand/banner.png" alt="Buildora — Describe it. Watch it ship." width="100%" />

# Buildora

### **Describe it. Watch it ship.**

**The AI app-builder platform that turns one sentence into a stunning, working web app — then refines it through conversation.**

*An open Lovable / Base44 alternative, powered end-to-end by the Z.AI brain.*

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/faisukhan01/erp)
[![Platform](https://img.shields.io/badge/platform-Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![Backend](https://img.shields.io/badge/backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Database](https://img.shields.io/badge/database-Neon%20PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.com)
[![AI Brain](https://img.shields.io/badge/brain-Z.AI-ff0080?style=for-the-badge&logo=openai&logoColor=white)](https://z.ai)
[![License](https://img.shields.io/badge/license-MIT-8B5CF6?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)

**TypeScript** · **Python** · **Streaming SSE** · **Single-file app output** · **Version time machine**

</div>

---

## What is Buildora?

Buildora is a full **AI app-builder platform** — you describe an application in plain language, and Z.AI **architects, designs and ships a complete, working web app** while you watch the code stream in live. Then you keep refining it like a conversation:

> *"Make the theme emerald green and add a session badge at the top."*
> → **v2 is live.** Everything that worked still works.

Every build is **snapshotted to cloud PostgreSQL**, every version is **restorable with one click**, and the finished app is **yours to download** — a single, dependency-free HTML file.

<div align="center">

| | |
|:---:|:---|
| **Prompt in** | *"A pomodoro focus timer with work/break cycles and session stats"* |
| **Out** | A responsive, animated, working timer — in ~40 seconds |

</div>

---

## Feature Matrix — why Buildora bites back

| Feature | Buildora | Notes |
|---|:---:|---|
| One-prompt app generation | :white_check_mark: | Z.AI brain with elite design system prompt |
| **Live code streaming** | :white_check_mark: | Watch every character land via SSE |
| **Chat-based iteration** | :white_check_mark: | Modify anything by just asking |
| **Version time machine** | :white_check_mark: | Every build snapshotted to PostgreSQL, one-click rollback |
| Interactive live preview | :white_check_mark: | Sandboxed iframe — generated apps actually run |
| Desktop / mobile viewport | :white_check_mark: | Test responsive output instantly |
| AI project naming | :white_check_mark: | Every app gets a name + description automatically |
| One-click code download | :white_check_mark: | Single HTML file — zero lock-in |
| Cloud persistence | :white_check_mark: | Neon serverless PostgreSQL |
| Self-healing services | :white_check_mark: | Services auto-boot and recover |

---

## Architecture

```mermaid
flowchart LR
    A["Browser<br/>Next.js 16 UI"] -->|"fetch /api/*<br/>?XTransformPort=8000"| B["Gateway"]
    B --> C["FastAPI<br/>:8000<br/>Projects · Chat · Versions"]
    C -->|HTTP| D["Z.AI Worker<br/>:8001<br/>z-ai-web-dev-sdk"]
    D --> E(("Z.AI<br/>Brain"))
    C -->|SQLAlchemy| F[("Neon<br/>PostgreSQL")]
    A -->|"streaming code<br/>SSE"| C
```

**Three services, one brain:**

| Service | Stack | Port | Role |
|---|---|:---:|---|
| **Web** | Next.js 16, React 19, Tailwind 4, shadcn/ui, Zustand, Framer Motion | 3000 | Landing, dashboard, builder workspace |
| **API** | FastAPI, SQLAlchemy 2, Pydantic, SSE streaming | 8000 | Projects, chat, generation pipeline, version snapshots |
| **AI Worker** | Bun, z-ai-web-dev-sdk | 8001 | The Z.AI brain — naming + app building |

---

## The generation pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant W as Next.js UI
    participant A as FastAPI
    participant Z as Z.AI Worker
    participant DB as PostgreSQL

    U->>W: Types an idea
    W->>A: POST /api/projects
    A->>DB: Project + first user message
    W->>A: POST /api/projects/:id/generate
    A->>Z: Name this app
    Z-->>A: { "name": "Focus Flow Timer", ... }
    A->>Z: Build this app (elite design system prompt)
    Z-->>A: Full HTML application
    loop Live stream
        A-->>W: SSE chunk events (code)
    end
    A->>DB: Version snapshot + assistant reply
    A-->>W: done event (html, version, name)
    W->>U: Interactive preview + chat reply
```

---

## Quickstart

### Prerequisites
- Node 20+ / Bun 1.2+
- Python 3.12+
- A free PostgreSQL database — [neon.com](https://neon.com) (no credit card)

### 1. Clone & install

```bash
git clone https://github.com/faisukhan01/erp.git buildora
cd buildora
bun install          # frontend deps
pip install -r mini-services/api/requirements.txt
cd mini-services/ai-worker && bun install && cd ../..
```

### 2. Configure

```bash
cp mini-services/api/.env.example mini-services/api/.env
# Edit .env → paste your Neon DATABASE_URL
```

```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
AI_WORKER_URL=http://127.0.0.1:8001
```

### 3. Launch

```bash
bun run dev                                   # web  → :3000
cd mini-services/api && uvicorn main:app --port 8000    # api  → :8000
cd mini-services/ai-worker && bun run dev               # brain → :8001
```

> **Tip:** In the sandbox preview, the web app auto-boots the API and AI worker for you — just open `/`.

### 4. Build something

Open the app, type an idea, press **Start building**, and watch.

---

## Project structure

```
├── src/
│   ├── app/
│   │   ├── api/boot/route.ts        # self-healing service supervisor
│   │   ├── page.tsx                 # SPA orchestrator (landing → dashboard → builder)
│   │   └── layout.tsx
│   ├── components/buildora/
│   │   ├── landing.tsx              # hero + prompt composer
│   │   ├── dashboard.tsx            # projects grid
│   │   └── builder.tsx              # chat + live preview + code stream
│   └── lib/
│       ├── api.ts                   # gateway client + SSE parser
│       ├── store.ts                 # Zustand state machine
│       └── types.ts
├── mini-services/
│   ├── api/                         # FastAPI backend (Python)
│   │   ├── main.py                  # 10 endpoints incl. SSE generation
│   │   ├── models.py                # User · Project · Message · Version
│   │   ├── database.py              # SQLAlchemy + Neon
│   │   └── prompts.py               # the Z.AI brain-washing (design system rules)
│   └── ai-worker/                   # Bun + z-ai-web-dev-sdk
│       └── index.ts
└── public/brand/                    # 3D generated brand assets
```

---

## The database schema

```mermaid
erDiagram
    USER ||--o{ PROJECT : owns
    PROJECT ||--o{ MESSAGE : contains
    PROJECT ||--o{ VERSION : snapshots
    PROJECT }o--|| VERSION : "current_version_id"

    USER { string id PK }
    PROJECT { string id PK  string name  string description  string current_version_id }
    MESSAGE { string id PK  string role  text content }
    VERSION { string id PK  int version_number  text html_code  text summary }
```

---

## Design system of the AI output

Every app Buildora generates follows one non-negotiable prompt contract:

- **Tailwind CSS** via CDN + **Google Fonts** typography
- Gradient design tokens, glassmorphism, rounded-2xl cards, soft shadows
- Entrance animations, hover micro-interactions
- **Mobile-first responsive** + **accessible** (semantic HTML, ARIA)
- **Actually works**: working CRUD, localStorage persistence, seeded sample data, zero dead buttons

---

## Roadmap

- [ ] Supabase Auth (email + OAuth) for multi-user projects
- [ ] Multi-file output (React components, not just single-file)
- [ ] One-click deploy of generated apps
- [ ] Image generation inside generated apps (Z.AI image tool)
- [ ] Team workspaces with sharing links

---

## Contributing

PRs are welcome! Grab an issue or propose a feature. Keep it clean, typed and tested.

## License

[MIT](LICENSE) — free forever. Build something people screenshot.

---

<div align="center">

**Built with the Z.AI brain — every feature, every function, every pixel.**

<img src="public/brand/logo.png" alt="Buildora logo" width="88" />

*If Buildora saved you time, star the repo — it keeps the builds coming.*

</div>
