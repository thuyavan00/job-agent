# JobAgent Pro — Backend API

NestJS REST API powering the JobAgent Pro job automation platform. Handles authentication, resume generation, job aggregation, application tracking, and asynchronous workflow execution.

---

## Table of Contents

- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Modules](#modules)
- [API Reference](#api-reference)
- [Workflow Execution Engine](#workflow-execution-engine)
- [Database](#database)
- [Infrastructure](#infrastructure)
- [Scripts](#scripts)

---

## Requirements

- Node.js 20+
- PostgreSQL 15+ (or Docker)
- Redis 7+ (or Docker)
- Python 3.12 + [uv](https://docs.astral.sh/uv/) (for LangGraph agents)

---

## Quick Start

**1. Start infrastructure (Postgres + Redis)**

```bash
docker compose up -d
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment**

```bash
cp .env.example .env
# Edit .env — see Environment Variables section
```

**4. Start the development server**

```bash
npm run start:dev
```

The API is available at `http://localhost:3000`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/resume_db` | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret used to sign JWT tokens |
| `REDIS_HOST` | `localhost` | Redis host for BullMQ queue |
| `REDIS_PORT` | `6379` | Redis port |
| `AGENT_PATH` | — | Absolute path to the `resume-agent/` directory |
| `PUBLIC_APP_URL` | `http://localhost:3000` | Base URL used in generated file URLs |

The `OPENAI_API_KEY` used by the Python agents lives in `resume-agent/.env`, not here.

---

## Project Structure

```
src/
  auth/                     JWT authentication, bcrypt, RBAC guards and decorators
  resume/                   Profile CRUD, PDF/DOCX generation, Python agent integration
    entities/               User, Profile (TypeORM)
    dto/                    class-validator DTOs
    templates/              Handlebars .hbs templates for PDF rendering
  dashboard/                KPI stats, job application and interview tracking
    entities/               JobApplication, Interview (TypeORM)
  jobs/                     Live job aggregation from 4 external APIs
  admin/                    Admin-only user management and data seeding
  workflow/                 Workflow Builder: schema, REST API, async orchestration
    entities/               Workflow, WorkflowNode, WorkflowEdge, WorkflowRun, WorkflowNodeRun
    orchestrator/           BullMQ processor, node handlers, orchestrator service
      handlers/             TriggerJobMatch, AiResumeTailor, BrowserApply
  app.module.ts             Root module — wires TypeORM, BullMQ, ServeStatic
  main.ts                   Bootstrap: CORS, cookie-parser, port 3000
generated/                  Runtime output directory for PDF/DOCX files (git-ignored)
docker-compose.yml          Postgres 16 + Redis 7 with persistent volumes
```

---

## Modules

### AuthModule

JWT-based authentication using httpOnly cookies.

- Passwords hashed with bcrypt (10 salt rounds)
- Tokens signed with `JWT_SECRET`, expire after 7 days
- Stored in an `access_token` httpOnly cookie (not localStorage)
- `JwtAuthGuard` — validates token and injects `user` into the request
- `RolesGuard` + `@Roles()` decorator — enforces `user | admin` RBAC

### ResumeModule

Handles the full resume lifecycle.

- Profile stored as JSONB columns (basics, education, experience, projects, skills)
- `POST /resume/render` spawns `enhance.py` (ATS optimisation) before generating files
- `POST /resume/tailor` spawns `main.py` (LangGraph tailoring loop) for a given JD
- PDF rendered via Puppeteer from a Handlebars template
- DOCX rendered via the `docx` library
- Files saved to `generated/<slugified-email>/` with timestamp-based names

### DashboardModule

Job application tracking and KPI aggregation.

- `JobApplication` entity tracks status through: `applied → interview → offer / rejected / withdrawn`
- `Interview` entity tracks upcoming interviews with `prep-pending | prepping | ready` status
- `GET /dashboard` returns stats (applications sent, interviews, response rate, success rate), 6-month area chart data, recent applications, and upcoming interviews

### JobsModule

Aggregates live job listings from four public APIs with graceful degradation.

- **Remotive** — remote-first jobs, limit 20
- **Arbeitnow** — broad tech board, limit 20
- **Greenhouse** — per-company (Stripe, Airbnb, Lyft, Coinbase, Discord, Notion, Brex, Gusto, Coda, Rippling), up to 5 software roles each
- **Lever** — per-company (Airtable, Cloudflare, Linear, Retool, Loom, Reddit, Intercom), up to 5 software roles each

All four sources run in parallel via `Promise.allSettled`. HTML is stripped from descriptions before returning to the client.

### WorkflowModule

End-to-end async workflow engine for automated job applications.

See [Workflow Execution Engine](#workflow-execution-engine) for full details.

### AdminModule

Admin-scoped endpoints protected by `@Roles(UserRole.ADMIN)`.

- List and delete users
- Access any user's dashboard data
- Seed sample application/interview data for a given user

---

## API Reference

All endpoints except `/auth/register` and `/auth/login` require a valid `access_token` cookie.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register; sets `access_token` cookie |
| `POST` | `/auth/login` | Login; sets `access_token` cookie |
| `POST` | `/auth/logout` | Clears cookie |
| `GET` | `/auth/me` | Returns current user |

### Resume

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/resume/profile` | Upsert full profile |
| `GET` | `/resume/profile` | Fetch profile |
| `PATCH` | `/resume/profile/basics` | Update basics section only |
| `GET` | `/resume/templates` | List available templates |
| `POST` | `/resume/render` | Generate PDF + DOCX (runs ATS enhancement) |
| `POST` | `/resume/tailor` | Tailor resume to a job description |
| `GET` | `/resume/files` | List generated files grouped by type |
| `DELETE` | `/resume/files/:fileName` | Delete a generated file |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/dashboard` | Stats, chart data, recent applications, upcoming interviews |
| `POST` | `/dashboard/applications` | Create job application |
| `POST` | `/dashboard/interviews` | Create interview |
| `POST` | `/dashboard/seed` | Seed sample data (admin only) |

### Jobs

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/jobs` | Aggregated job listings from all sources |

### Workflows

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/workflows` | List user's workflows |
| `POST` | `/workflows` | Create workflow |
| `GET` | `/workflows/:id` | Get workflow with nodes and edges |
| `PATCH` | `/workflows/:id` | Update name or mode |
| `DELETE` | `/workflows/:id` | Delete workflow |
| `PUT` | `/workflows/:id/graph` | Atomic save of full React Flow canvas |
| `PATCH` | `/workflows/:id/activate` | Set status to active |
| `PATCH` | `/workflows/:id/pause` | Set status to paused |
| `POST` | `/workflows/:id/runs` | Trigger a workflow run |
| `GET` | `/workflows/:id/runs` | List run history |
| `GET` | `/workflows/:id/runs/:runId` | Get single run with per-node results |

### Admin

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/users` | List all users |
| `DELETE` | `/admin/users/:id` | Delete user |
| `GET` | `/admin/users/:id/dashboard` | View any user's dashboard |
| `POST` | `/admin/seed/:userEmail` | Seed data for a specific user |

---

## Workflow Execution Engine

Workflows are directed acyclic graphs of nodes connected by edges. When a run is triggered, the engine traverses the graph asynchronously using BullMQ so that each step is independently retryable.

### Node Types

| Job Name | Subtypes | Retry |
|----------|----------|-------|
| `TRIGGER_JOB_MATCH` | `linkedin_jobs`, `indeed_jobs`, `angellist_jobs`, `company_careers`, `daily_trigger`, `weekly_trigger` | 3 attempts, exponential backoff |
| `AI_RESUME_TAILOR` | `tailor_resume` | 2 attempts, fixed 3s delay |
| `BROWSER_APPLY` | `submit_application` | 5 attempts, exponential backoff |

Condition nodes (`job_filter`, `salary_check`) are evaluated inline by the processor — no separate BullMQ job is created.

### Execution Flow

```
POST /workflows/:id/runs
  OrchestratorService identifies trigger nodes (nodes with no incoming edges)
  Creates WorkflowRun + WorkflowNodeRun(PENDING) for each trigger
  Enqueues first BullMQ job(s)

  BullMQ Worker (WorkflowExecutionProcessor):
    1. Marks WorkflowNodeRun as RUNNING
    2. Dispatches to the appropriate handler
    3. Marks WorkflowNodeRun as COMPLETED, persists output as JSONB
    4. Loads outgoing edges; evaluates any edge conditions
    5. Creates WorkflowNodeRun(PENDING) for each next node
    6. Enqueues next BullMQ job(s) with previous output as input
    7. When no pending node runs remain, sets WorkflowRun.status = COMPLETED | FAILED
```

### Node Data Pipeline

```
TRIGGER_JOB_MATCH  →  output: { jobs: JobDto[] }
        |
        v (edge, optionally through job_filter / salary_check inline)
AI_RESUME_TAILOR   →  output: { tailoredResume: string, job: JobDto }
        |
        v
BROWSER_APPLY      →  output: { applicationId: string, success: boolean }
                       creates JobApplication(status=APPLIED, workflowRunId=...)
```

### Python Bridge

`AiResumeTailorHandler` uses the same `uv run main.py` spawn pattern as `ResumeService.tailorResume()`. The profile is fetched from the database, serialised to markdown, and sent as `{ resume, jd }` JSON on stdin. The tailored resume markdown is read from stdout.

---

## Database

TypeORM with PostgreSQL. Schema is auto-synchronised on startup (`synchronize: true`) — suitable for development only.

### Entity Summary

| Entity | Table | Module |
|--------|-------|--------|
| `User` | `user` | auth / resume |
| `Profile` | `profile` | resume |
| `JobApplication` | `job_applications` | dashboard |
| `Interview` | `interview` | dashboard |
| `Workflow` | `workflows` | workflow |
| `WorkflowNode` | `workflow_nodes` | workflow |
| `WorkflowEdge` | `workflow_edges` | workflow |
| `WorkflowRun` | `workflow_runs` | workflow |
| `WorkflowNodeRun` | `workflow_node_runs` | workflow |

Profile sections (basics, education, experience, projects, skills) and workflow node configs are stored as `JSONB` columns for schema flexibility.

---

## Infrastructure

`docker-compose.yml` in this directory provides all required services for local development.

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Destroy volumes (clears all data)
docker compose down -v
```

| Service | Image | Port | Persistence |
|---------|-------|------|-------------|
| `postgres` | `postgres:16-alpine` | `5432` | `postgres_data` volume |
| `redis` | `redis:7-alpine` | `6379` | `redis_data` volume (AOF) |

Redis uses append-only file persistence so queued BullMQ jobs survive a container restart.

---

## Scripts

```bash
npm run start:dev     # Start with hot-reload (development)
npm run start:prod    # Start compiled build (production)
npm run build         # TypeScript compile via NestJS CLI
npm run lint          # ESLint with auto-fix
npm run test          # Jest unit tests
npm run test:watch    # Jest in watch mode
npm run test:cov      # Jest with coverage report
npm run test:e2e      # End-to-end tests
```
