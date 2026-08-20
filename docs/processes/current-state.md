# MillQ Current State

**Checkpoint:** branch `feature/foundation-operational-core` @ `1d7caf8` (foundation operational core block)  
**Base:** `main` @ `f568789` (Block A accepted)  
**Updated:** 2026-08-19

## What exists now

### Accepted architecture (unchanged authority)

| ADR | Status | Topic |
| --- | --- | --- |
| ADR-0001 | Accepted | TypeScript monorepo, React, Node modular monolith, PostgreSQL |
| ADR-0002 | Accepted | Money, quantity, units, rounding |
| ADR-0003 | Accepted | Yield, preparations, moving-average costing |
| ADR-0006 | **Proposed** | Production Intelligence boundary |

Block B domain ADRs (0004/0005) remain on draft branch `chore/block-b-domain-boundaries` — **Proposed**, not merged.

### New documentation (this block)

- `docs/architecture/operational-core-and-intelligence.md` — two-layer product model
- `docs/architecture/domain-module-map.md` — 17 module boundaries
- `docs/architecture/historical-truth-model.md` — immutable facts vs mutable state
- `docs/architecture/offline-foundation.md` — offline POS/sync design
- `docs/architecture/implementation-scaffolding.md` — reversible tech choices for runnable skeleton
- `docs/decisions/ADR-0006-production-intelligence-boundary.md` — Proposed

### Executable code

| Package / app | Purpose |
| --- | --- |
| `@millq/domain` | Money, CostValue, Quantity, package conversion, yield normalization |
| `@millq/contracts` | Operational fact envelopes, recommendation DTOs, in-memory idempotent store |
| `@millq/api` | Fastify server, `/health`, env validation, SQL migrations runner |
| `@millq/web` | React/Vite shell showing API health |

### Infrastructure

- `infrastructure/docker-compose.yml` — PostgreSQL 16 for local dev
- `apps/api/migrations/001_foundation.sql` — `operational_facts`, `recommendations` tables (schema only)

## What works locally

```bash
pnpm install
pnpm test          # domain + contracts unit tests
pnpm build         # all packages
docker compose -f infrastructure/docker-compose.yml up -d
pnpm --filter @millq/api run migrate
pnpm dev           # API :3000 + Web :5173
```

Health check: `GET http://localhost:3000/health` (database `up` when Postgres running).

## Open Product Owner decisions

- Accept ADR-0006 (Production Intelligence boundary)
- Block B module boundaries (ADR-0004/0005 on draft PR #12)
- Exact ORM, auth, offline sync protocol (ADR-0001 deferred)
- Vietnam fiscal/offline fiscal behavior (jurisdiction research)
- Block B questions B-01–B-18 from draft branch

## Next recommended block

**Block C — Operational persistence and first commands:**

1. Persist operational facts to PostgreSQL with idempotency
2. Identity & Organization minimal model (company, location, actor)
3. First vertical slice: GoodsReceived → inventory movement fact
4. Recipe/preparation version activation facts wired to domain yield math
5. Accept or reconcile Block B ADRs into module package structure

## Restore reference

After merge, checkpoint tag recommended: `foundation-operational-core-v1`.

Until merge, checkout:

```bash
git fetch origin
git checkout feature/foundation-operational-core
pnpm install && pnpm test && pnpm build
```
