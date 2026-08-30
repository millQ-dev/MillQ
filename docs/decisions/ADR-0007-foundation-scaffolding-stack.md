# ADR-0007: Concrete Foundation Scaffolding Stack

- **Status:** Accepted
- **Date:** 2026-08-30
- **Accepted:** 2026-08-30
- **Decision owners:** Product Owner
- **Related:** [ADR-0001](./ADR-0001-initial-technology-stack.md), [`implementation-scaffolding.md`](../architecture/implementation-scaffolding.md)

## Context

ADR-0001 accepted the high-level technology direction (TypeScript monorepo, React, Node modular monolith, PostgreSQL) while deferring several concrete libraries. The foundation block needed runnable choices to execute. Product Owner reviewed those choices and approved them as the **initial concrete implementation stack for this stage**.

## Decision

The following are Accepted for the MillQ foundation and near-term Operational Core work:

| Area | Choice |
| --- | --- |
| Package manager / workspaces | pnpm |
| HTTP server | Fastify |
| Web client shell | Vite + React |
| Schema / DTO validation | Zod |
| Exact decimal math | decimal.js |
| Database | PostgreSQL |
| Schema migrations (foundation) | plain SQL + `schema_migrations` runner |
| Unit / package tests | Vitest |
| Structured logging | Fastify’s built-in Pino logger |

These choices refine ADR-0001 deferred items for the foundation stage only.

**This ADR is not permission to add further frameworks or libraries without justification.** New dependencies still require explicit rationale and, when architectural, an ADR or Product Owner approval.

## Deferred (unchanged)

Still deferred and **not** decided by ADR-0007:

- ORM / query layer (Drizzle, Kysely, Prisma, etc.)
- Auth / session implementation
- Offline client storage
- Offline sync protocol
- Production deployment topology
- React routing / meta-framework (Next.js vs SPA router, etc.)

## Consequences

### Positive

- Local foundation is runnable and reviewable.
- Shared validation and math libraries are consistent across packages.
- Migration approach stays simple until persistence patterns stabilize in Block C+.

### Negative / accepted cost

- Plain SQL migrations may later be replaced or wrapped by an ORM migration tool.
- Fastify / Vite choices may be revisited if Product Owner later accepts a meta-framework ADR.

## Rejected alternatives (for this stage)

- Treating foundation libraries as “temporary unauthorized scaffolding” after Product Owner approval — rejected; record them as Accepted stage choices.
- Expanding this ADR to authorize arbitrary new libraries — rejected.

## Acceptance

Accepted by Product Owner on **2026-08-30** during the foundation correction block.
