# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobAgent Pro is a monorepo containing a job automation platform with three main components:
- **Frontend (React + Vite)**: Resume builder wizard, dashboard, job match, user profile
- **Backend (NestJS)**: REST API with JWT auth, RBAC, resume generation, job aggregation, dashboard
- **LangGraph Agent (Python)**: AI-powered resume tailoring and ATS enhancement using LangChain/LangGraph

## Development Commands

### Frontend (client/)
```bash
cd client
npm run dev        # Start dev server on http://localhost:5173
npm run build      # Type-check + production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Backend (server/)
```bash
cd server
npm run start:dev  # Start NestJS with hot-reload on http://localhost:3000
npm run build      # Build for production
npm run lint       # Run ESLint with auto-fix
npm run test       # Run Jest tests
npm run test:watch # Run tests in watch mode
npm run test:cov   # Generate coverage report
npm run test:e2e   # Run end-to-end tests
```

### LangGraph Agent (resume-agent/)
```bash
cd resume-agent
uv run python main.py     # Resume tailoring agent — expects JSON {resume, jd} via stdin
uv run python enhance.py  # ATS enhancement agent — expects JSON profile via stdin
```

## Architecture

### Frontend Architecture

**Entry Point**: `client/src/main.tsx` → `App.tsx`

**Routing Structure**:
- `/` → redirects to `/dashboard`
- `/login` → Login page (public)
- `/register` → Register page (public)
- `/dashboard` → Dashboard with KPIs, chart, applications, interviews (protected)
- `/profile` → User profile with editable basics (protected)
- `/ai-job-match` → Job listing page from multiple external sources (protected)
- `/resume-builder` → Resume wizard with `ResumeLayout`
  - Index: `ResumeHome` (file list dashboard)
  - `/build`: `StepBasics` (personal info)
  - `/education`, `/experience`, `/projects`, `/skills`: Wizard steps
  - `/review`: `ReviewGenerate` (final review + PDF/DOCX generation)
- UI-only placeholder routes (sidebar links, no backend): `/workflow-builder`, `/application-tracker`, `/interview-calendar`, `/network-intelligence`, `/salary-intelligence`, `/skill-development`, `/interview-prep`, `/career-analytics`, `/browser-extension`

**State Management**:
- `AuthContext` — auth state (user, login, register, logout, isLoading); rehydrates via `GET /api/auth/me` on mount
- `FormProvider` (context) — wraps resume builder for cross-step wizard form data
- React Hook Form + Zod validation in each wizard step
- Theme state managed by `ThemeProvider` (dark/light only)

**Path Aliases** (defined in `vite.config.ts`):
```
@/          → /src
@components → /src/components
@steps      → /src/steps
@theme      → /src/theme
@context    → /src/context
@schema     → /src/schema
@constants  → /src/constants
```

**API Proxy**: Vite proxies `/api/*` to `http://localhost:3000` and rewrites the `/api` prefix
(e.g., `/api/resume/files` → `http://localhost:3000/resume/files`)

**Styling**: TailwindCSS v4 with CSS custom properties for dark/light theme via `data-theme` attribute

**Key Frontend Dependencies**:
- React 19.1.1, React Router 7.8.2
- React Hook Form 7.62.0, Zod 4.1.0
- TailwindCSS 4.1.12, Recharts 3.7.0 (dashboard area chart)
- Lucide React 0.541.0 (icons), Axios 1.11.0

---

### Frontend Files

**Pages / Routes** (`client/src/routes/`):
- `Dashboard.tsx` — KPI stats (apps sent, interviews, response/success rates), 6-month area chart, recent applications, upcoming interviews
- `UserProfile.tsx` — Profile view with inline editing for basics; shows AI-detected role and years of experience
- `Login.tsx` / `Register.tsx` — Public auth pages with form validation
- `ResumeHome.tsx` — Lists generated resume/cover letter files
- `ResumeLayout.tsx` — Wizard layout wrapper
- `JobMatch.tsx` — Job cards from 4 sources with filters and pagination

**Components** (`client/src/components/`):
- `Layout.tsx` — Top-level shell with collapsible sidebar + navbar
- `Navbar.tsx` — Top bar with page title, theme toggle, notification bell, user avatar dropdown (profile link, logout, admin badge)
- `Sidebar.tsx` — Left nav: Dashboard, AI Job Match, Resume Builder, placeholder future links
- `ProtectedRoute.tsx` — Redirects to `/login` if unauthenticated
- `StepperHeader.tsx` — Wizard step indicator
- `ChipsInput.tsx` — Multi-value chips input (for skills/technologies)
- `ArrayFieldRow.tsx` — Dynamic repeatable form row

**Context** (`client/src/context/`):
- `AuthContext.tsx` — Auth state with login/register/logout; rehydrates on reload
- `FormContext.tsx` — Cross-step wizard form data

---

### Backend Architecture

**Framework**: NestJS 11 with Express adapter

**Entry Point**: `server/src/main.ts` — enables CORS (credentials: true), cookie-parser, listens on port 3000

**Module Structure**:
- `AppModule` — Root module; configures TypeORM (PostgreSQL), BullMQ (Redis), ServeStatic, and imports all feature modules
- `AuthModule` — JWT auth with httpOnly cookie, bcrypt hashing, RBAC guards
- `ResumeModule` — Profile CRUD, PDF/DOCX generation, LangGraph agent integration
- `DashboardModule` — KPI aggregation, job application and interview CRUD
- `AdminModule` — Admin-only user management and data seeding
- `JobsModule` — Live job aggregation from 4 external APIs (exports `JobsService`)
- `WorkflowModule` — Workflow Builder: entity CRUD, graph save, BullMQ orchestration

**Static File Serving**:
- `/static/*` serves files from `server/generated/`
- Files organized by user: `generated/<slugified-email>/`
- Filenames include timestamps: `resume-simple-ats-v<TIMESTAMP>.pdf`

**Database**:
- TypeORM with PostgreSQL
- Connection via `DATABASE_URL` environment variable
- Auto-loads entities, synchronize enabled (dev mode)
- Entities: `User`, `Profile`, `JobApplication`, `Interview`, `Workflow`, `WorkflowNode`, `WorkflowEdge`, `WorkflowRun`, `WorkflowNodeRun`

**Queue**:
- BullMQ backed by Redis (`REDIS_HOST` / `REDIS_PORT` env vars, default `localhost:6379`)
- Queue name: `workflow-execution`
- Per-job retry config: TRIGGER_JOB_MATCH (3×), AI_RESUME_TAILOR (2×), BROWSER_APPLY (5×)

**File Generation**:
- Puppeteer for PDF generation (Handlebars HTML template → PDF)
- `docx` library for DOCX generation
- Both formats generated simultaneously

**Email Slugification**: `slugify` converts `user@example.com` → `user-example-com` for folder names

**Key Backend Dependencies**:
- NestJS 11.0.1, TypeORM 0.3.26, `pg` 8.16.3
- `@nestjs/jwt` 11.0.2, `passport-jwt` 4.0.1, `bcrypt` 6.0.0
- `bullmq` 5.69.3, `@nestjs/bullmq` 11.0.4 (async workflow queue)
- `puppeteer` 24.17.0, `docx` 9.5.1, `handlebars` 4.7.8
- `slugify` 1.6.6, `dayjs`, `class-validator`, `class-transformer`

---

### Backend API Endpoints

#### Auth (`/auth`)
- `POST /auth/register` — Register user; sets httpOnly `access_token` cookie
- `POST /auth/login` — Login; sets httpOnly `access_token` cookie
- `POST /auth/logout` — Clears cookie
- `GET /auth/me` [protected] — Returns current user

#### Resume (`/resume`) [all protected]
- `POST /resume/profile` — Upsert full profile (all wizard sections)
- `GET /resume/profile` — Fetch user profile
- `PATCH /resume/profile/basics` — Update only basics section
- `GET /resume/templates` — List templates (currently: `["simple-ats"]`)
- `POST /resume/render` — Generate PDF/DOCX; spawns `enhance.py` for ATS; returns `{pdfUrl, docxUrl}`
- `POST /resume/tailor` — Tailor resume to JD; spawns `main.py`; returns `{success, data: tailored_resume}`
- `GET /resume/files` — List files grouped: `{resumes: [], coverLetters: []}`
- `DELETE /resume/files/:fileName` — Delete file

#### Dashboard (`/dashboard`) [all protected]
- `GET /dashboard` — Stats, 6-month chart, recent applications, upcoming interviews
- `POST /dashboard/applications` — Create job application
- `POST /dashboard/interviews` — Create interview
- `POST /dashboard/seed` [admin only] — Seed sample applications and interviews

#### Jobs (`/jobs`) [protected]
- `GET /jobs` — Aggregated jobs from Remotive, Arbeitnow, Greenhouse, Lever

#### Admin (`/admin`) [admin role required]
- `GET /admin/users` — List all users
- `DELETE /admin/users/:id` — Delete user
- `GET /admin/users/:id/dashboard` — View any user's dashboard
- `POST /admin/seed/:userEmail` — Seed data for specific user

#### Workflows (`/workflows`) [all protected]
- `GET /workflows` — List user's workflows
- `POST /workflows` — Create workflow (`{name, mode}`)
- `GET /workflows/:id` — Get workflow with nodes + edges
- `PATCH /workflows/:id` — Update name/mode
- `DELETE /workflows/:id` — Delete workflow
- `PUT /workflows/:id/graph` — **Atomic save** of full React Flow canvas (`{nodes[], edges[]}`)
- `PATCH /workflows/:id/activate` — Set status → active
- `PATCH /workflows/:id/pause` — Set status → paused
- `POST /workflows/:id/runs` — Trigger a run (enqueues BullMQ jobs); returns `WorkflowRun`
- `GET /workflows/:id/runs` — List run history with per-node results
- `GET /workflows/:id/runs/:runId` — Get single run detail

---

### Database Entities

#### User (`server/src/resume/entities/user.entity.ts`)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | auto-generated |
| email | string | unique |
| password | string | bcrypt hashed, not selected by default |
| role | enum | `"user"` \| `"admin"`, default `"user"` |
| profile | OneToOne | cascade to Profile |
| createdAt / updatedAt | timestamp | auto |

#### Profile (`server/src/resume/entities/profile.entity.ts`)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | auto-generated |
| basics | JSONB | `{fullName, email, phone, location, linkedIn, github, website, summary}` |
| education | JSONB | array of `{degree, institution, location, startDate, endDate, gpa}` |
| experience | JSONB | array of `{jobTitle, company, location, startDate, endDate, bullets[]}` |
| projects | JSONB | array of `{title, liveDemoUrl, repoUrl, description, technologies[]}` |
| skills | JSONB | `{items: string[]}` |
| detectedRole | string | AI-detected job role (e.g., `"Full Stack Engineer"`) |
| yearsOfExperience | float | AI-calculated from experience dates |
| user | OneToOne | cascade delete from User |
| createdAt / updatedAt | timestamp | auto |

#### JobApplication (`server/src/dashboard/entities/job-application.entity.ts`)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | auto-generated |
| userEmail | string | — |
| jobTitle | string | — |
| company | string | — |
| salary | string | nullable |
| status | enum | `applied \| interview \| offer \| rejected \| withdrawn` |
| notes | text | nullable |
| sourceUrl | string | nullable |
| workflowRunId | string | nullable; set when created by automated workflow |
| appliedAt | timestamp | default: CURRENT_TIMESTAMP |
| createdAt / updatedAt | timestamp | auto |

#### Interview (`server/src/dashboard/entities/interview.entity.ts`)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | auto-generated |
| userEmail | string | — |
| jobTitle | string | — |
| company | string | — |
| scheduledAt | timestamp | — |
| prepStatus | enum | `prep-pending \| prepping \| ready` |
| notes | text | nullable |
| createdAt / updatedAt | timestamp | auto |

#### Workflow (`server/src/workflow/entities/workflow.entity.ts`)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | auto-generated |
| user | ManyToOne → User | cascade delete |
| name | string | e.g. `"Job Application Automation"` |
| mode | enum | `manual \| scheduled \| triggered` |
| status | enum | `draft \| active \| paused \| archived` |
| nodes | OneToMany → WorkflowNode | cascade |
| edges | OneToMany → WorkflowEdge | cascade |
| createdAt / updatedAt | timestamp | auto |

#### WorkflowNode (`server/src/workflow/entities/workflow-node.entity.ts`)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | auto-generated |
| workflow | ManyToOne → Workflow | cascade delete |
| label | string | display name shown on canvas card |
| type | enum | `trigger \| condition \| action` |
| subtype | enum | see NodeSubtype table below |
| positionX / positionY | float | React Flow canvas coordinates |
| config | JSONB | subtype-specific settings (keywords, portal, resumeProfileId, …) |
| setupStatus | enum | `configured \| needs_setup` |
| createdAt / updatedAt | timestamp | auto |

**NodeSubtype values**:
- Triggers (Job Portals): `linkedin_jobs`, `indeed_jobs`, `angellist_jobs`, `company_careers`
- Triggers (Schedule): `daily_trigger`, `weekly_trigger`
- Conditions: `job_filter`, `salary_check`
- Actions: `submit_application`, `tailor_resume`

#### WorkflowEdge (`server/src/workflow/entities/workflow-edge.entity.ts`)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | auto-generated |
| workflow | ManyToOne → Workflow | cascade delete |
| source | ManyToOne → WorkflowNode | outgoing node |
| target | ManyToOne → WorkflowNode | incoming node |
| label | string | nullable; e.g. `"true"` / `"false"` for branches |
| condition | JSONB | nullable; `{field, operator, value}` evaluated at runtime |
| createdAt | timestamp | auto |

#### WorkflowRun (`server/src/workflow/entities/workflow-run.entity.ts`)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | auto-generated |
| workflow | ManyToOne → Workflow | — |
| user | ManyToOne → User | — |
| status | enum | `pending \| running \| completed \| failed \| cancelled` |
| triggeredBy | enum | `manual \| schedule \| event` |
| startedAt / completedAt | timestamp | nullable |
| createdAt | timestamp | auto |

#### WorkflowNodeRun (`server/src/workflow/entities/workflow-node-run.entity.ts`)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | auto-generated |
| workflowRun | ManyToOne → WorkflowRun | cascade delete |
| node | ManyToOne → WorkflowNode | — |
| status | enum | `pending \| running \| completed \| failed \| skipped` |
| input | JSONB | nullable; output from the previous node piped in |
| output | JSONB | nullable; data produced by this node |
| error | text | nullable; error message on failure |
| startedAt / completedAt | timestamp | nullable |
| createdAt | timestamp | auto |

---

### Authentication & Authorization

**JWT Configuration**:
- Secret: `JWT_SECRET` env var (fallback: `"fallback-dev-secret"`)
- Expiry: 7 days
- Storage: httpOnly cookie named `access_token`
- Extraction: `ExtractJwt.fromExtractors()` from cookies only

**Token Payload**: `{ sub: userId, email, role }`

**Password**: bcrypt with 10 salt rounds

**Guards**:
- `JwtAuthGuard` — validates JWT, injects user into request
- `RolesGuard` — checks `user.role` against `@Roles(...)` decorator metadata

**Login Flow**:
1. POST /auth/register or /auth/login
2. Backend hashes password (register) or verifies (login)
3. Signs JWT, sets httpOnly cookie
4. Frontend stores user in `AuthContext`
5. On page reload, `AuthContext` calls `GET /auth/me` to rehydrate session

---

### LangGraph Agent Architecture

**Purpose**: Two Python agents for AI-powered resume processing

#### `enhance.py` — ATS Resume Enhancement
- Reads profile JSON from stdin
- Model: OpenAI GPT-4o-mini (temperature 0.3)
- 3-node LangGraph workflow:
  1. **Enhancer**: Rewrites bullets with action verbs, enforces <100 char bullets, max 4 bullets/experience, max 3/project, keyword-rich summary
  2. **Validator**: Checks ATS criteria; returns `APPROVED` or lists revisions needed
  3. **Extractor**: Detects job role (e.g., `"Full Stack Engineer"`) and calculates years of experience
- Output JSON: `{profile, detected_role, years_of_experience}`

#### `main.py` — Resume Tailoring to JD
- Reads `{resume, jd}` JSON from stdin
- Model: OpenAI GPT-4o-mini (temperature 0)
- 3-node LangGraph workflow with conditional loop:
  1. **Analyzer**: Identifies skill gaps between resume and JD
  2. **Writer**: Rewrites resume using only original facts + JD keywords (no fabrication)
  3. **Reflector**: Fact-checks output; returns `FACTUAL` or requests revisions
- Output: tailored resume markdown to stdout

**Key Constraints**: Never invents job titles, companies, or dates. Stops after `FACTUAL` or max iterations.

**Integration**: NestJS spawns Python process via `child_process.spawn("uv", ["run", "python", ...], {shell: true})`, sends JSON via stdin, captures output from stdout.

**Python Dependencies** (`resume-agent/pyproject.toml`):
- `langgraph`, `langchain`, `langchain-openai`, `langchain-anthropic`, `python-dotenv`
- Python 3.12, managed with `uv`

---

### AI Job Match Feature

**Route**: `/ai-job-match` (frontend) → `GET /jobs` (backend)

**Job Sources** (4 APIs, all aggregated with `Promise.allSettled`):
- **Remotive** — remote-first tech jobs; free, no auth; limit 20
- **Arbeitnow** — broad tech job board; free, no auth; limit 20
- **Greenhouse** — per-company API; curated companies: Stripe, Airbnb, Lyft, Coinbase, Discord, Notion, Brex, Gusto, Coda, Rippling; up to 5 software roles per company
- **Lever** — per-company API; curated companies: Airtable, Cloudflare, Linear, Retool, Loom, Reddit, Intercom; up to 5 software roles per company

HTML descriptions stripped with regex; descriptions truncated to 220 chars. Frontend shows skeleton cards during load, handles error/empty states, supports filter by location/type/source.

---

### Dashboard Feature

**Stats (KPI cards)**:
- Applications sent (30-day change)
- Interviews scheduled (30-day change)
- Response rate % (60-day change)
- Success rate % (60-day change)

**Charts**: 6-month area chart of applications vs interviews per month (Recharts)

**Tables**:
- Recent 5 job applications with status badges
- Upcoming 5 interviews with prep status badges

**Data seeding**: `POST /dashboard/seed` (admin) or `POST /admin/seed/:userEmail` populates sample tech company data

---

### Workflow Builder Architecture

**Backend files** (`server/src/workflow/`):
```
entities/
  workflow.entity.ts
  workflow-node.entity.ts
  workflow-edge.entity.ts
  workflow-run.entity.ts
  workflow-node-run.entity.ts
orchestrator/
  workflow-queue.types.ts              — Queue name, WorkflowJobName enum, retry config, payload/output types
  workflow-orchestrator.service.ts     — startRun(): finds trigger nodes, creates WorkflowRun, enqueues first BullMQ jobs
  workflow-execution.processor.ts      — BullMQ WorkerHost: dispatches to handler → advances graph → reconciles run status
  handlers/
    trigger-job-match.handler.ts       — Calls JobsService.fetchJobs(), filters by node config (keywords/location/remote)
    ai-resume-tailor.handler.ts        — Fetches Profile from DB, formats as markdown, spawns uv run main.py
    browser-apply.handler.ts           — Creates JobApplication(APPLIED) with workflowRunId; Puppeteer stub
workflow.service.ts                    — Workflow/node/edge CRUD + atomic graph save (PUT /graph)
workflow.controller.ts                 — REST endpoints; POST /:id/runs delegates to OrchestratorService
workflow.module.ts                     — Registers BullMQ queue, all handlers, processor, and TypeORM entities
workflow.dto.ts                        — DTOs: CreateWorkflowDto, SaveWorkflowGraphDto, NodeSnapshot, EdgeSnapshot, etc.
```

**Execution pipeline (data flow)**:
```
POST /workflows/:id/runs
  └─ OrchestratorService.startRun()
       └─ Finds trigger nodes (no incoming edges)
       └─ Creates WorkflowRun + WorkflowNodeRun(PENDING)
       └─ queue.add("TRIGGER_JOB_MATCH", payload, { attempts: 3 })
            ▼ BullMQ Worker
       Processor → TriggerJobMatchHandler  → output: { jobs: JobDto[] }
            └─ advances graph via edges → creates next NodeRun → enqueues "AI_RESUME_TAILOR"
            ▼
       Processor → AiResumeTailorHandler   → output: { tailoredResume, job }
            └─ uv run main.py  (same spawn pattern as resume.service.ts)
            └─ advances graph → creates next NodeRun → enqueues "BROWSER_APPLY"
            ▼
       Processor → BrowserApplyHandler     → output: { applicationId, success }
            └─ Creates JobApplication(APPLIED) + sets workflowRunId
            └─ reconcileRunStatus() → WorkflowRun.status = COMPLETED
```

**Condition nodes** (`job_filter`, `salary_check`) are evaluated **inline** by the processor (no BullMQ job) — they filter the `jobs` array and pass results to the next node.

**Retry isolation**: Each node is a separate BullMQ job. If `BROWSER_APPLY` fails and retries, only that step re-runs — the Python tailoring is not repeated.

**Infrastructure**: `server/docker-compose.yml` runs Postgres 16 and Redis 7 (AOF persistence). Start with `docker compose up -d` from `server/`.

---

### Resume Generation Flow

1. User completes wizard steps (basics → education → experience → projects → skills)
2. Frontend saves to `POST /resume/profile`, then calls `POST /resume/render`
3. Backend spawns `enhance.py` with profile JSON → ATS-enhanced profile returned
4. Detected role and years of experience saved back to Profile entity
5. Backend renders Handlebars HTML template → Puppeteer → PDF; also generates DOCX
6. Files saved to `generated/<slugified-email>/resume-simple-ats-v<TIMESTAMP>.pdf`
7. Frontend lists files via `GET /resume/files` (latest by `mtimeMs` marked as default)

---

## Current Implementation State

### Fully Implemented
- JWT authentication (register, login, logout, session rehydration via `/auth/me`)
- RBAC with user/admin roles, `@Roles()` decorator, `RolesGuard`
- Resume builder wizard (5 steps + review + generation)
- PDF and DOCX generation (Puppeteer + docx library)
- Profile CRUD with JSONB storage in PostgreSQL
- User profile page with inline editing of basics
- AI resume enhancement via `enhance.py` (ATS compliance + role/exp extraction)
- Resume tailoring to job description via `main.py` (LangGraph iterative loop)
- Dashboard with KPIs, Recharts area chart, application/interview listings
- Job application tracking (status workflow: applied → interview → offer/rejected/withdrawn)
- Interview scheduling with prep status
- Admin user management and data seeding endpoints
- Job aggregation from 4 external sources with graceful degradation
- Dark/light theme toggle (TailwindCSS v4)
- Responsive layout with collapsible sidebar and top navbar
- Top navbar with user menu, avatar, admin badge, and logout
- **Workflow Builder schema**: 5 TypeORM entities (Workflow, WorkflowNode, WorkflowEdge, WorkflowRun, WorkflowNodeRun)
- **Workflow REST API**: full CRUD + atomic graph save + run trigger endpoint
- **WorkflowOrchestrator**: BullMQ async pipeline with 3 node handlers (TRIGGER_JOB_MATCH, AI_RESUME_TAILOR, BROWSER_APPLY)
- **Docker Compose** (`server/docker-compose.yml`): Postgres 16 + Redis 7 with persistent volumes

### UI Placeholders (sidebar links, no backend yet)
- Workflow Builder (backend done; React Flow frontend canvas not yet built)
- Application Tracker, Interview Calendar
- Network Intelligence, Salary Intelligence
- Skill Development, Interview Prep AI
- Career Analytics, Browser Extension

### Not Yet Implemented
- Notifications (bell icon is UI-only)
- Job caching in PostgreSQL (jobs fetched live per request)
- LLM-based job role inference from user's default resume
- OAuth/social login
- Email verification
- File upload for importing existing resumes
- Filter persistence across page reloads

---

## Important Notes

- **Auth**: JWT in httpOnly cookie; axios configured with `withCredentials: true` in `main.tsx`
- **Synchronize mode**: TypeORM auto-syncs schema on startup (dev only; disable for production)
- **Static file paths**: Files served without auth checks via `/static/<slug>/<filename>`
- **Cache busting**: Timestamp-based filenames prevent stale cached files
- **Monorepo structure**: No shared packages; each service is fully independent
- **Python agents**: Spawned as child processes using `uv run python <script>` with `shell: true`
- **CORS**: Backend allows `http://localhost:5173` with credentials
- **Backend path aliases** (`server/tsconfig.json`): `@app/*`, `@resume/*`, `@auth/*`, `@jobs/*`, `@dashboard/*`, `@workflow/*`
- **Infrastructure**: `cd server && docker compose up -d` starts Postgres + Redis
- **Environment variables** (`server/.env`):
  - `DATABASE_URL` — PostgreSQL connection string (default: `postgres://postgres:postgres@localhost:5432/resume_db`)
  - `JWT_SECRET` — JWT signing secret
  - `REDIS_HOST` — Redis host (default: `localhost`)
  - `REDIS_PORT` — Redis port (default: `6379`)
  - `AGENT_PATH` — absolute path to `resume-agent/` directory (for Python spawning)
  - `OPENAI_API_KEY` — in `resume-agent/.env`, used by LangGraph agents
