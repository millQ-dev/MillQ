# Foundation Implementation Stack

- **Status:** Accepted concrete choices (ADR-0007)
- **Related:** [ADR-0001](../decisions/ADR-0001-initial-technology-stack.md), [ADR-0007](../decisions/ADR-0007-foundation-scaffolding-stack.md), [Architecture v1.2](architecture-v1.2.md)

This document describes the **Product Owner-approved** foundation stack for the current stage. It is not an invitation to add further frameworks without justification. Domain boundaries live in Architecture v1.2 / ADR-0008 — not in this scaffolding note.

## Approved stack (ADR-0007)

| Area | Choice |
| --- | --- |
| Package manager | pnpm workspaces |
| Domain math | `decimal.js` via `@millq/domain` (ADR-0002) |
| Contracts validation | Zod via `@millq/contracts` |
| HTTP server | Fastify |
| Web shell | Vite + React |
| Database | PostgreSQL |
| Migrations (foundation) | Plain SQL + `schema_migrations` table |
| Logging | Structured JSON via Fastify/Pino |
| Tests | Vitest |

## Still deferred

- ORM / query layer
- Auth / session implementation
- Offline client storage and sync protocol
- Production deployment topology
- React routing / meta-framework

## Local run

```bash
docker compose -f infrastructure/docker-compose.yml up -d
# or any local PostgreSQL matching DATABASE_URL
pnpm install --frozen-lockfile
pnpm --filter @millq/api run migrate
pnpm dev
```

- API: http://localhost:3000/health
- Web: http://localhost:5173

## Package layout

```text
packages/domain/     — Money, Quantity, conversion, yield (ADR-0002/0003)
packages/contracts/  — Typed operational facts and Intelligence DTOs
apps/api/            — Operational Core HTTP entry (health, migrations)
apps/web/            — Client shell
```
