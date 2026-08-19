# Implementation Scaffolding (Foundation Block)

This document records **reversible scaffolding choices** made to produce a runnable local foundation. They do **not** override Accepted ADR-0001 deferred items unless the Product Owner accepts them in a future ADR.

## What was scaffolded

| Area | Choice | Notes |
| --- | --- | --- |
| Package manager | pnpm workspaces | Matches common TypeScript monorepo practice |
| Domain math | `decimal.js` via `@millq/domain` | Implements ADR-0002 invariants |
| Contracts validation | Zod | Shared DTO/fact schemas in `@millq/contracts` |
| HTTP server | Fastify 5 | Minimal API with health endpoint |
| Web shell | Vite + React 19 | Dev proxy to API |
| Database | PostgreSQL 16 (Docker Compose) | Local dev only |
| Migrations | Plain SQL + `schema_migrations` table | Simple runner in `apps/api`; ORM deferred |
| Logging | Pino (via Fastify) | Structured JSON logs |
| Tests | Vitest | Domain and contracts packages |

## Deferred (still require Product Owner / ADR)

- React meta-framework (Next.js vs plain SPA routing)
- ORM / query layer (Drizzle, Kysely, Prisma, etc.)
- Auth provider and session model
- Offline sync protocol and client storage
- Production deployment topology

## Local run

```bash
docker compose -f infrastructure/docker-compose.yml up -d
pnpm install
pnpm --filter @millq/api run migrate
pnpm dev
```

- API: http://localhost:3000/health
- Web: http://localhost:5173

## Package layout

```text
packages/domain/     — Money, Quantity, conversion, yield (ADR-0002/0003)
packages/contracts/  — Operational fact envelopes, Intelligence recommendation DTOs
apps/api/            — Operational Core HTTP entry (health, future commands)
apps/web/            — Client shell
```
