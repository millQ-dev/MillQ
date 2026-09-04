# MillQ Current State

**Checkpoint:** Architecture v1.2 **merged** on Origin `main` @ `3036319` (2026-09-04)  
**Canonical host:** Cursor Origin (`https://origin.cursor.com/millqdev/MillQ.git`)  
**Backup host:** GitHub `https://github.com/millQ-dev/MillQ.git` (mirror only)  
**Architecture PR:** https://cursor.com/codebase/millqdev/MillQ/pull/5 — **merged**  
**Updated:** 2026-09-04

## Runtime / CI / backup

| Item | State |
| --- | --- |
| Foundation Operational Core | Merged (history before Architecture v1.2) |
| Architecture v1.2 | **Merged** (PR #5 → `3036319`) |
| Origin CI | **Attached** — Depot [`.depot/workflows/ci.yml`](../../.depot/workflows/ci.yml); PR #5 Depot checks green |
| GitHub Actions | Dormant copies only — not Origin merge gate |
| GitHub backup | GitHub App **MillQ Origin Backup** via `scripts/backup-origin-to-github.sh` (verify lag independently) |

## Accepted decisions

| ADR | Status | Topic |
| --- | --- | --- |
| ADR-0001 | Accepted | Technology stack |
| ADR-0002 | Accepted | Money, quantity, units |
| ADR-0003 | Accepted | Yield, preparations, moving-average costing |
| ADR-0004 | Accepted | Origin SoT; GitHub backup |
| ADR-0006 | Accepted | Production Intelligence boundary |
| ADR-0007 | Accepted | Foundation scaffolding |
| ADR-0008 | Accepted | Domain Boundaries Architecture v1.2 |
| ADR-0009 | Accepted | Catalog, Units, SupplierItem |
| ADR-0010 | Accepted | Document posting & correction |

## Architecture baseline

- [`docs/architecture/architecture-v1.2.md`](../architecture/architecture-v1.2.md)
- [`docs/architecture/domain-module-map.md`](../architecture/domain-module-map.md)
- [`docs/architecture/block-c-goods-received-contract.md`](../architecture/block-c-goods-received-contract.md)

## What exists in code

- `@millq/domain`, `@millq/contracts`, `@millq/api`, `@millq/web`
- PostgreSQL, Fastify, React/Vite, Vitest, plain SQL migrations
- `operational_fact_feed` + recommendations schema placeholders

## Explicitly not started

- **Block C implementation** (GoodsReceived vertical) — contract ready
- Full Catalog / Menu / POS / Orders / Payments application modules

## Next recommended sequence

1. ~~Foundation~~ done  
2. ~~Origin CI (Depot)~~ attached  
3. ~~Architecture v1.2~~ **done** (`3036319`)  
4. **Block C** — GoodsReceived / Inventory vertical per contract  
5. Later Menu / Orders / Payments verticals  
