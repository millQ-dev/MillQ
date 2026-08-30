# MillQ Current State

**Checkpoint:** branch `feature/foundation-operational-core` @ `d36caed`  
**Base:** `main` @ `f568789` (Block A accepted)  
**Updated:** 2026-08-30  
**Issue:** https://github.com/millQ-dev/MillQ/issues/14

## Accepted decisions

| ADR | Status | Topic |
| --- | --- | --- |
| ADR-0001 | Accepted | TypeScript monorepo, React, Node modular monolith, PostgreSQL |
| ADR-0002 | Accepted | Money, quantity, units, rounding |
| ADR-0003 | Accepted | Yield, preparations, moving-average costing |
| ADR-0006 | **Accepted** (2026-08-30) | Production Intelligence boundary |
| ADR-0007 | **Accepted** (2026-08-30) | Concrete foundation scaffolding stack |

## Still Proposed / separate review

| Item | Status |
| --- | --- |
| ADR-0004 / ADR-0005 (Block B) | Proposed — draft PR #12 |
| Block B questions B-01–B-18 | Open |

Foundation domain map **provisionally aligns** with Block B proposal and does **not** accept unresolved Block B Product Owner decisions.

## What exists now

### Documentation

- Operational Core + Intelligence model (ADR-0006 Accepted)
- Domain module map (provisional vs Block B)
- Historical truth model + operational fact feed guardrail
- Offline foundation (idempotency conflict rule)
- Foundation stack (ADR-0007)
- ChatGPT review packet ritual

### Executable code

| Package / app | Purpose |
| --- | --- |
| `@millq/domain` | Money, CostValue, Quantity, package conversion, yield via CostValue |
| `@millq/contracts` | Typed operational facts, semantic idempotency, Intelligence DTOs |
| `@millq/api` | Fastify server, `/health`, env validation, SQL migrations |
| `@millq/web` | React/Vite shell |

### Infrastructure

- PostgreSQL local (Docker Compose file and/or local Homebrew Postgres)
- `apps/api/migrations/001_foundation.sql` — `operational_fact_feed` + `recommendations` (feed ≠ module source of truth)
- GitHub Actions CI: typecheck, test, build, migrate smoke, `/health`

## Explicitly not started

- Block C (GoodsReceived persistence / inventory source tables)
- Block B acceptance / merge of ADR-0004/0005

## Next recommended block (after merge of this foundation)

**Block C — Operational persistence and first commands** (only after Product Owner merge of this foundation PR).
