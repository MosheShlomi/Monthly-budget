# CLAUDE.md — Project Workflow & Collaboration Guide

This file defines how Claude should behave, think, and collaborate on this project.

---

## Project Overview

- **Type:** Fullstack web application (enterprise)
- **Tech stack:** Python (backend services), TypeScript/JavaScript (frontend & Node services), Go/Rust (performance-critical services)
- **Architecture:** Microservices
- **Databases:** PostgreSQL, MongoDB (NoSQL), Redis (caching/queues)
- **Deployment:** AWS

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

### Claude's roles in this project

Claude is expected to contribute across all phases:
- **Feature implementation** — Write new features end-to-end across services.
- **Code review & refactoring** — Review PRs, suggest improvements, clean up code.
- **Architecture decisions** — Design APIs, data models, service boundaries, and system interactions.
- **Debugging & troubleshooting** — Diagnose bugs, trace failures, and propose fixes.

---

## Git & Branching Workflow

- **Strategy:** Feature branches + Pull Requests
  - All changes happen on a dedicated branch (e.g., `feat/add-auth`, `fix/payment-bug`).
  - All branches must be merged via a PR — never directly commit to `main`.
- **NEVER force push to `main` or `master`** — this is a hard rule with no exceptions.
- Commit messages should be clear and describe *why*, not just *what*.

---

## Code Quality Standards

All code written or modified must meet these standards:

### Testing
- Every feature and bug fix must include tests (unit and/or integration as appropriate).
- Do not deliver "working" code without corresponding tests.

### Linting & Formatting
- Python: follow `black` + `isort` + `flake8` (or `ruff`) conventions.
- TypeScript/JS: follow `eslint` + `prettier` conventions.
- Go: follow `gofmt` + `golangci-lint` conventions.
- Do not submit code that would fail a lint pass.

### Type Safety
- Python: use type hints throughout (PEP 484). Avoid `Any` unless unavoidable.
- TypeScript: use strict mode. No implicit `any`.
- Go: leverage the type system; avoid interface abuse.

### Pull Request Reviews
- When asked to review a PR, check for: correctness, test coverage, security, naming clarity, and adherence to these conventions.

---

## Hard Rules — Non-Negotiable

| Rule | Detail |
|------|--------|
| No secrets in code | Never hardcode credentials, API keys, tokens, or passwords. Use environment variables or secret managers. |
| No force push to main | `git push --force` to `main`/`master` is forbidden. |
| Always write tests | Every feature or fix must ship with tests. No exceptions without explicit user approval. |
| Ask before deleting | Before any destructive operation (delete files, drop DB tables, remove branches), ask the user to confirm. |

---

## Microservices Guidelines

- Each service owns its own data — no cross-service direct DB access.
- Services communicate via well-defined APIs (REST or events).
- When adding or changing an API, update the contract/schema first, then implement.
- Configuration (ports, URLs, DB connections) goes in environment variables — never hardcoded.

---

## AWS Deployment Awareness

- Be mindful of AWS service costs and limits when suggesting infrastructure.
- Prefer managed services (RDS, ElastiCache, DocumentDB, SQS) over self-managed where appropriate.
- IAM: follow least-privilege principle — never suggest overly broad permissions.
- Infrastructure changes (e.g., Terraform, CDK) should be discussed before applied.

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
