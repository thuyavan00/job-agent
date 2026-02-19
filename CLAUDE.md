# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobAgent Pro is a monorepo containing a job automation platform with three main components:
- **Frontend (React + Vite)**: Resume builder UI with wizard workflow
- **Backend (NestJS)**: REST API for resume generation and file management
- **LangGraph Agent (Python)**: AI-powered resume tailoring using LangChain/LangGraph

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
uv run python main.py  # Run the LangGraph resume tailoring agent
# Expects JSON input via stdin: {"resume": "...", "jd": "..."}
# Outputs tailored resume to stdout
```

## Architecture

### Frontend Architecture

**Entry Point**: `client/src/main.tsx` → `App.tsx`

**Routing Structure**:
- Root path `/` redirects to `/resume-builder`
- `/resume-builder` uses `ResumeLayout` (with wizard header)
  - Index: `ResumeHome` (dashboard with file lists)
  - `/build`: `StepBasics` (personal info)
  - `/education`, `/experience`, `/projects`, `/skills`: Wizard steps
  - `/review`: `ReviewGenerate` (final review + generation)

**State Management**:
- `FormProvider` (context) wraps entire app for cross-step form data
- React Hook Form + Zod validation in each step
- Theme state managed by `ThemeProvider` (dark/light mode only)

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

**API Proxy**: Vite proxies `/api/*` to `http://localhost:3000` and rewrites `/api` prefix (e.g., `/api/resume/files` → `http://localhost:3000/resume/files`)

**Styling**: TailwindCSS v4 with dark/light theme via `data-theme` attribute

### Backend Architecture

**Framework**: NestJS with Express adapter

**Module Structure**:
- `AppModule`: Root module with global config, TypeORM, and ServeStatic setup
- `ResumeModule`: Handles resume generation and file operations

**Static File Serving**:
- `/static/*` serves files from `server/generated/`
- Files organized by user: `generated/<slugified-email>/`
- Filenames include timestamps for cache busting: `resume-simple-ats-v<TIMESTAMP>.pdf`

**Database**:
- TypeORM with PostgreSQL
- Connection via `DATABASE_URL` environment variable
- Auto-loads entities, synchronize enabled (dev mode)
- Entities: `Profile`, `User` (in `server/src/resume/entities/`)

**File Generation**:
- Uses `puppeteer` for PDF generation
- Uses `docx` library for DOCX generation
- Both formats generated simultaneously for each resume/cover letter

**Email Slugification**: User emails are converted to safe folder names using `slugify` (e.g., `user@example.com` → `user-example-com`)

### LangGraph Agent Architecture

**Purpose**: Tailors resumes to match job descriptions using an iterative critique loop

**Agent Flow**:
1. **Analyzer Node**: Compares resume to JD, identifies skill gaps
2. **Writer Node**: Rewrites resume using only factual info from original
3. **Reflector Node**: Fact-checks for hallucinations
4. **Conditional Loop**: Continues until reflector says "FACTUAL"

**Key Constraints**:
- Never invents job titles, companies, or dates
- Only rephrases existing bullet points with JD keywords
- Stops after verification or max iterations

**Integration**: NestJS spawns Python process, sends JSON via stdin, captures tailored resume from stdout

**Models**: Configured to use OpenAI GPT-5-mini (Claude option commented out)

## Key Technical Details

### Resume Generation Flow

1. User completes wizard steps (personal, education, experience, projects, skills)
2. Frontend sends form data to backend via `POST /resume/generate`
3. Backend generates both PDF and DOCX files with timestamp versions
4. Files saved to `generated/<slugified-email>/`
5. Frontend lists files via `GET /resume/files` (grouped as `resumes` and `coverLetters`)
6. Latest file by `mtimeMs` is marked as default

### User Email Handling

All backend endpoints expect `x-user-email` header. Currently hardcoded to `kannanthuyavan@gmail.com` in frontend (`App.tsx:19`).

### File Management

- **List files**: `GET /resume/files` with `x-user-email` header
- **Delete file**: `DELETE /resume/files/:fileName` with `x-user-email` header
- **View/Download**: Direct access via `/static/<slugified-email>/<filename>`

### Theme System

Only dark and light themes supported. Toggle button in sidebar footer. No system preference detection. Theme persisted via `ThemeProvider` context.

### Form Validation

Each wizard step uses:
- React Hook Form for form state
- Zod schemas (in `client/src/schema/`) for validation
- Schema DTOs mirrored in `server/src/resume/dto/profile.dto.ts` (class-validator)

## Important Notes

- **No authentication yet**: User email is hardcoded
- **Synchronize mode**: TypeORM auto-syncs schema (suitable for dev only)
- **Static file paths**: Files served without authentication checks
- **Cache busting**: Timestamp-based versioning prevents stale cache
- **Monorepo structure**: No shared packages, each service is independent
