# MillQ Current State

**Checkpoint:** branch `feature/foundation-operational-core` @ `7f2b99e`  
**Canonical host:** Cursor Origin (`https://origin.cursor.com/millqdev/MillQ.git`)  
**Backup host:** GitHub `https://github.com/millQ-dev/MillQ.git` (mirror only — do not merge work here)  
**Origin PR:** https://cursor.com/codebase/millqdev/MillQ/pull/1  
**Updated:** 2026-08-31

## Accepted decisions

| ADR | Status | Topic |
| --- | --- | --- |
| ADR-0001 | Accepted | TypeScript monorepo, React, Node modular monolith, PostgreSQL |
| ADR-0002 | Accepted | Money, quantity, units, rounding |
| ADR-0003 | Accepted | Yield, preparations, moving-average costing |
| ADR-0004 | Accepted | Cursor Origin is source of truth; GitHub is backup |
| ADR-0006 | Accepted (2026-08-30) | Production Intelligence boundary |
| ADR-0007 | Accepted (2026-08-30) | Concrete foundation scaffolding stack |

## Still Proposed / separate review

| Item | Status |
| --- | --- |
| Block B domain-boundary ADRs (draft branch / former GitHub PR #12) | Proposed — **not** the same as Origin hosting ADR-0004 |
| Block B questions B-01–B-18 | Open |

Foundation domain map **provisionally aligns** with the Block B proposal and does **not** accept unresolved Block B Product Owner decisions.

## What exists now

### Documentation

- Operational Core + Intelligence model (ADR-0006 Accepted)
- Domain module map (provisional vs Block B)
- Historical truth model + operational fact feed guardrail
- Offline foundation (idempotency conflict rule)
- Foundation stack (ADR-0007)
- Origin/GitHub hosting + autonomy process (ADR-0004)
- ChatGPT review packet ritual

### Executable code

| Package / app | Purpose |
| --- | --- |
| `@millq/domain` | Money, CostValue, Quantity, package conversion, yield via CostValue |
| `@millq/contracts` | Typed operational facts, semantic idempotency, Intelligence DTOs |
| `@millq/api` | Fastify server, `/health`, env validation, SQL migrations |
| `@millq/web` | React/Vite shell |

### Infrastructure

- PostgreSQL local (Docker Compose and/or local Homebrew Postgres)
- `apps/api/migrations/001_foundation.sql` — `operational_fact_feed` + `recommendations`
- **CI:** Origin CI **not attached yet**. Dormant GitHub Actions definition may live under `.github/workflows/` / `infrastructure/ci/` for backup compatibility and is **not** an Origin merge gate.

## Explicitly not started

- Block C (GoodsReceived persistence / inventory source tables)
- Block B domain ADR acceptance

## Merge gates (current)

1. Local: `pnpm install --frozen-lockfile`, `typecheck`, `test`, `build`, migrate smoke, `/health` with live Postgres
2. Independent Origin review (`APPROVE`)
3. Origin ruleset (push protection on `main`)

## Next recommended block (after Origin merge of this foundation)

**Block C — Operational persistence and first commands.**
