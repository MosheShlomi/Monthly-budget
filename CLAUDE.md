# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

Monthly family budget tracker. Full-stack app with a Next.js 14 frontend and FastAPI backend, using Supabase for auth and PostgreSQL for data.

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, React Hook Form + Zod, Recharts
- **Backend:** FastAPI, SQLAlchemy async ORM, Alembic migrations, Pydantic v2
- **Auth:** Supabase Auth — frontend handles sign-in, backend validates JWTs via JWKS
- **Database:** PostgreSQL (Supabase-hosted), accessed via async SQLAlchemy with pgBouncer transaction mode
- **Email:** Resend API (family invites)
- **UI language:** Hebrew, RTL layout

---

## Development Commands

### Docker (recommended)

```bash
# Start both services with hot reload
docker compose up

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

### Backend (manual)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Run a specific router's tests (no test suite exists yet — write tests alongside new code)
# Linting
black app/ && isort app/ && flake8 app/

# DB migrations
alembic upgrade head
alembic revision --autogenerate -m "description"
```

### Frontend (manual)

```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
npm run build     # static export to /out
npm run lint      # ESLint
```

---

## Architecture

### Auth Flow

1. User signs in via Supabase Auth (frontend).
2. Frontend stores the Supabase JWT and sends it as `Authorization: Bearer <token>` on every API request.
3. Backend `dependencies.py` validates the JWT against Supabase's JWKS endpoint (cached). The `get_current_user` dependency extracts `sub` (user UUID) and `email`.
4. The `get_family_member` dependency additionally verifies the user belongs to the requested family — used on all family-scoped routes.

### Backend Structure

All routes live under `/api/v1/`. Each router file in `app/routers/` maps to a resource. The pattern is:

- **Router** — handles HTTP, calls DB directly via `AsyncSession`
- **Schema** (`app/schemas/`) — Pydantic request/response models, separate from ORM models
- **Model** (`app/models/models.py`) — single file with all SQLAlchemy ORM models

Key models: `Family`, `FamilyMember`, `FamilyInvite`, `Category`, `Card`, `Spending`, `Income`, `BudgetGoal`. All use UUID PKs. `Spending` and `Income` both store `user_email`/`user_name` as denormalized fields for display without extra joins.

The `dashboard` router runs aggregate queries (grouped by category/month) via `app/services/dashboard_queries.py`.

Excel import (`app/services/excel_import.py`) is triggered via `app/routers/imports.py` and maps spreadsheet columns to `Spending` records.

### Frontend Structure

Uses Next.js App Router with two route groups:
- `(auth)/` — login, register (public)
- `(app)/` — all protected pages; middleware (`middleware.ts`) redirects unauthenticated users

API calls are centralized in `src/lib/api.ts`, which attaches the Supabase JWT to every request. Global state (current family, user) lives in Zustand stores under `src/store/`.

`src/lib/supabase.ts` is the browser client; `src/lib/supabase-server.ts` is the server-side client used in middleware and server components.

---

## How Claude Should Work

### Default approach: Plan first, then act

Before writing any code, Claude must:
1. Present a clear implementation plan — what will be changed, why, and in what order.
2. Wait for explicit approval before proceeding.
3. Only then implement the plan as described.

If the task is trivial (e.g., a one-line fix or rename), a brief inline note is sufficient instead of a full plan.

### Verbosity

- **Simple tasks:** Be brief. Show the change and a one-line explanation.
- **Complex tasks:** Provide full rationale — trade-offs, alternatives considered, and why this approach was chosen.
- Never pad responses with filler. Get to the point.

---

## Git & Branching Workflow

- All changes happen on a dedicated branch (e.g., `feat/add-auth`, `fix/payment-bug`).
- All branches must be merged via a PR — never directly commit to `main`.
- **NEVER force push to `main` or `master`.**
- Commit messages should describe *why*, not just *what*.

---

## Code Quality Standards

### Linting & Formatting
- Python: `black` + `isort` + `flake8` (or `ruff`)
- TypeScript: `eslint` + `prettier`
- Do not submit code that would fail a lint pass.

### Type Safety
- Python: type hints throughout (PEP 484). Avoid `Any` unless unavoidable.
- TypeScript: strict mode. No implicit `any`.

### Testing
- Every feature and bug fix must include tests. No exceptions without explicit user approval.

### API Changes
- Update the Pydantic schema first, then implement the router change.

---

## Hard Rules

| Rule | Detail |
|------|--------|
| No secrets in code | Use environment variables — never hardcode credentials. |
| No force push to main | `git push --force` to `main`/`master` is forbidden. |
| Always write tests | Every feature or fix must ship with tests. |
| Ask before deleting | Confirm before any destructive operation (files, DB tables, branches). |

---

## Summary Cheatsheet

```
Before coding   → present a plan, wait for approval
Git             → feature branches + PR only, no force push to main
Tests           → always required
Secrets         → never in code, always in env vars
Deletions       → always ask first
Verbosity       → brief for simple, detailed for complex
```
