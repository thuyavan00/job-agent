# JobAgent Pro

A full-stack job automation platform that streamlines the job search process through AI-powered resume generation, automated workflow execution, application tracking, and interview management.

---

## Overview

JobAgent Pro is a monorepo comprising three independent services:

- **Frontend** — React 19 + Vite SPA with a multi-step resume wizard, dashboard, workflow builder, application tracker, and interview calendar
- **Backend** — NestJS REST API with JWT authentication, RBAC, resume generation, job aggregation, and a BullMQ-backed workflow execution engine
- **LangGraph Agent** — Python agents for ATS resume enhancement and job-description-tailored resume rewriting using LangChain and LangGraph

---

## Features

### Resume Builder
- Five-step guided wizard: Personal Info, Education, Work Experience, Projects, Skills
- AI-powered ATS enhancement via LangGraph (`enhance.py`): rewrites bullets with action verbs, enforces character limits, extracts detected role and years of experience
- Resume tailoring to a specific job description via LangGraph (`main.py`): iterative fact-checked rewriting, no fabrication
- Simultaneous PDF (Puppeteer + Handlebars) and DOCX generation
- Generated files served statically under `/static/<user-slug>/`; listed and deletable from the UI

### Dashboard
- KPI cards: applications sent, interviews scheduled, response rate, success rate (all with 30/60-day change indicators)
- Six-month area chart (Recharts) of applications vs. interviews per month
- Recent five applications and upcoming five interviews

### AI Job Match
- Aggregates live job postings from four external sources: Remotive, Arbeitnow, Greenhouse (10 curated companies), Lever (7 curated companies)
- Filter by location, job type, and source
- Graceful degradation via `Promise.allSettled`; descriptions stripped of HTML and truncated

### Application Tracker
- Full CRUD for job applications with extended fields: location, salary, source, source URL, next action, next action date
- Status workflow: applied, screening, interview, offer, rejected, withdrawn
- Search by company or position; filter by status
- Stats bar computed client-side from fetched data

### Interview Calendar
- Monthly grid calendar (6x7) with per-day interview chips
- Bookmarkable URL state via `?year=&month=&day=` query params
- Stats bar: upcoming, prep pending, prepping, ready
- Add interview form with Zod v4 validation; prep status selection
- Selected day detail panel with inline prep-status management

### Workflow Builder
- React Flow canvas with drag-and-drop node palette
- Trigger nodes (job sources), condition nodes (job filter, salary check, location check), action nodes (submit application, AI tailor resume, save job)
- Atomic graph save; run trigger with live BullMQ execution
- Strategy Pattern handler registry: add a new handler by creating a class, extending `BaseNodeHandler`, and adding `@NodeHandler`; nothing else changes
- Kahn's topological sort and cycle detection before every run
- Fan-in dedup and predecessor-readiness guards prevent duplicate node execution

### Authentication and Authorization
- JWT stored in httpOnly cookie (`access_token`); 7-day expiry
- Session rehydration via `GET /auth/me` on page load
- RBAC: `user` and `admin` roles; `@Roles()` decorator + `RolesGuard`
- bcrypt password hashing (10 rounds)

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.1.1 | UI framework |
| React Router | 7.8.2 | Client-side routing |
| TailwindCSS | 4.1.12 | Styling with dark/light theme via `data-theme` |
| React Hook Form | 7.62.0 | Form state management |
| Zod | 4.1.0 | Schema validation |
| Recharts | 3.7.0 | Dashboard area chart |
| React Flow | — | Workflow Builder canvas |
| Axios | 1.11.0 | HTTP client (`withCredentials: true`) |
| Lucide React | 0.541.0 | Icon library |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| NestJS | 11.0.1 | API framework (Express adapter) |
| TypeORM | 0.3.26 | ORM with PostgreSQL |
| BullMQ | 5.69.3 | Async workflow job queue (Redis-backed) |
| Passport JWT | 4.0.1 | JWT authentication |
| Puppeteer | 24.17.0 | PDF generation |
| docx | 9.5.1 | DOCX generation |
| Handlebars | 4.7.8 | Resume HTML templating |

### LangGraph Agent
| Technology | Purpose |
|---|---|
| LangGraph | Orchestration of multi-node AI workflows |
| LangChain OpenAI | GPT-4o-mini for resume enhancement and tailoring |
| uv | Python dependency management |

### Infrastructure
| Technology | Purpose |
|---|---|
| PostgreSQL 16 | Primary database (JSONB for profile sections) |
| Redis 7 | BullMQ job queue backend |
| Docker Compose | Local Postgres + Redis with persistent volumes |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.12 with `uv` installed
- Docker (for Postgres and Redis)
- OpenAI API key

### 1. Start infrastructure

```bash
cd server
docker compose up -d
```

This starts Postgres 16 on port 5432 and Redis 7 on port 6379 with persistent volumes.

### 2. Configure environment variables

Create `server/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/resume_db
JWT_SECRET=your-secret-here
REDIS_HOST=localhost
REDIS_PORT=6379
AGENT_PATH=/absolute/path/to/resume-agent
```

Create `resume-agent/.env`:

```env
OPENAI_API_KEY=your-openai-key-here
```

### 3. Install dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd client && npm install

# Python agent
cd resume-agent && uv sync
```

### 4. Run the services

```bash
# Backend (hot-reload)
cd server && npm run start:dev

# Frontend (dev server)
cd client && npm run dev
```

Backend: `http://localhost:3000`
Frontend: `http://localhost:5173`

Vite proxies `/api/*` and `/static/*` to the backend, rewriting the `/api` prefix.

---

## Project Structure

```
job-agent/
├── client/                        # React + Vite frontend
│   └── src/
│       ├── routes/                # Page components
│       │   ├── Dashboard.tsx
│       │   ├── ApplicationTracker.tsx
│       │   ├── InterviewCalendar.tsx
│       │   ├── WorkflowBuilder.tsx
│       │   ├── JobMatch.tsx
│       │   ├── UserProfile.tsx
│       │   └── resume/            # Wizard steps
│       ├── components/            # Shared UI components
│       ├── context/               # AuthContext, FormContext
│       └── utils/                 # calendarUtils, etc.
│
├── server/                        # NestJS backend
│   ├── src/
│   │   ├── auth/                  # JWT auth, guards, strategies
│   │   ├── resume/                # Profile CRUD, file generation, entities
│   │   ├── dashboard/             # KPI aggregation, entities (JobApplication, Interview)
│   │   ├── applications/          # Application CRUD (/applications)
│   │   ├── interviews/            # Interview CRUD (/interviews)
│   │   ├── jobs/                  # External job aggregation
│   │   ├── admin/                 # Admin user management
│   │   └── workflow/              # Workflow engine, handlers, entities
│   ├── generated/                 # Output directory for PDF/DOCX files
│   └── docker-compose.yml
│
└── resume-agent/                  # Python LangGraph agents
    ├── enhance.py                 # ATS enhancement + role/exp extraction
    └── main.py                    # Resume tailoring to job description
```

---

## API Reference

### Auth (`/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register; sets httpOnly `access_token` cookie |
| POST | `/auth/login` | Login; sets httpOnly `access_token` cookie |
| POST | `/auth/logout` | Clears cookie |
| GET | `/auth/me` | Returns current user (protected) |

### Resume (`/resume`) — all protected
| Method | Path | Description |
|---|---|---|
| POST | `/resume/profile` | Upsert full profile |
| GET | `/resume/profile` | Fetch profile |
| PATCH | `/resume/profile/basics` | Update basics section only |
| POST | `/resume/render` | Generate PDF + DOCX (spawns `enhance.py`) |
| POST | `/resume/tailor` | Tailor resume to JD (spawns `main.py`) |
| GET | `/resume/files` | List generated files grouped by type |
| DELETE | `/resume/files/:fileName` | Delete a file |

### Dashboard (`/dashboard`) — all protected
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Stats, chart, recent applications, upcoming interviews |
| POST | `/dashboard/seed` | Seed sample data (admin only) |

### Applications (`/applications`) — all protected
| Method | Path | Description |
|---|---|---|
| GET | `/applications` | List applications; `?search=&status=` |
| POST | `/applications` | Create application |
| PATCH | `/applications/:id` | Update application |
| DELETE | `/applications/:id` | Delete application (204) |

### Interviews (`/interviews`) — all protected
| Method | Path | Description |
|---|---|---|
| GET | `/interviews` | List interviews; `?from=&to=` (ISO dates) |
| POST | `/interviews` | Create interview |
| PATCH | `/interviews/:id` | Update interview |
| DELETE | `/interviews/:id` | Delete interview (204) |

### Jobs (`/jobs`) — protected
| Method | Path | Description |
|---|---|---|
| GET | `/jobs` | Aggregated jobs from all four sources |

### Workflows (`/workflows`) — all protected
| Method | Path | Description |
|---|---|---|
| GET | `/workflows` | List user workflows |
| POST | `/workflows` | Create workflow |
| GET | `/workflows/:id` | Get workflow with nodes and edges |
| PATCH | `/workflows/:id` | Update name or mode |
| DELETE | `/workflows/:id` | Delete workflow |
| PUT | `/workflows/:id/graph` | Atomic save of React Flow canvas |
| PATCH | `/workflows/:id/activate` | Set status to active |
| PATCH | `/workflows/:id/pause` | Set status to paused |
| POST | `/workflows/:id/runs` | Trigger a run |
| GET | `/workflows/:id/runs` | List run history |
| GET | `/workflows/:id/runs/:runId` | Get single run detail |

---

## Development Commands

### Backend
```bash
npm run start:dev   # Hot-reload dev server
npm run build       # Production build
npm run lint        # ESLint with auto-fix
npm run test        # Jest unit tests
npm run test:e2e    # End-to-end tests
npm run test:cov    # Coverage report
```

### Frontend
```bash
npm run dev         # Dev server on http://localhost:5173
npm run build       # Type-check + production build
npm run lint        # ESLint
npm run preview     # Preview production build
```

### LangGraph Agent
```bash
uv run python enhance.py   # ATS enhancement (stdin: profile JSON)
uv run python main.py      # Resume tailoring (stdin: {resume, jd} JSON)
```

---

## Notes

- **TypeORM synchronize**: schema auto-syncs on startup; disable this in production
- **Static files**: served without auth checks via `/static/<user-slug>/<filename>`
- **ValidationPipe**: global pipe configured with `whitelist: false` — DTOs use no class-validator decorators
- **Workflow entities**: `JobApplication` and `Interview` entities remain under `dashboard/entities/` to preserve workflow module import paths; both `ApplicationsModule` and `DashboardModule` register them independently via `TypeOrmModule.forFeature()`
- **Python agents**: spawned as child processes using `uv run python <script>` with `shell: true`; input via stdin, output captured from stdout

---

## License

MIT
