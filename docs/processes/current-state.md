# MillQ Current State

**Checkpoint:** Block C implementation on Origin (PR pending independent review)  
**Canonical host:** Cursor Origin (`https://origin.cursor.com/millqdev/MillQ.git`)  
**Backup host:** GitHub `https://github.com/millQ-dev/MillQ.git` (mirror only)  
**Architecture baseline:** Architecture v1.2 merged @ `3036319`; docs pin @ `06a7d8e`  
**Updated:** 2026-09-04

## Runtime / CI / backup

| Item | State |
| --- | --- |
| Foundation Operational Core | Merged |
| Architecture v1.2 | **Merged** (PR #5 → `3036319`) |
| Block C Goods Receipt vertical | **Implemented** — feature branch / Origin PR (do not merge before strategic review) |
| Origin CI | **Attached** — Depot [`.depot/workflows/ci.yml`](../../.depot/workflows/ci.yml) |
| GitHub Actions | Dormant copies only — not Origin merge gate |
| GitHub backup | GitHub App **MillQ Origin Backup** via `scripts/backup-origin-to-github.sh` |

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
- [`docs/architecture/block-c-implementation.md`](../architecture/block-c-implementation.md)

## What exists in code

- `@millq/domain` (incl. moving weighted-average helpers), `@millq/contracts`, `@millq/api`, `@millq/web`
- PostgreSQL migrations `001_foundation.sql`, `002_block_c.sql`
- Procurement Goods Receipt service: draft / validate / post / reverse
- Inventory movements + rebuildable `inventory_balance` + CostQuote API
- `operational_fact_feed` mirror for `GoodsReceived` (not SoT)

## Explicitly not started

- **Block D+** (sales / orders / payments / recipe write-off)
- Full Catalog / Menu / POS / KDS
- Fiscalization / Vietnam tax mapping
- Production Intelligence algorithms
- Intercompany stock transfers

## Next recommended sequence

1. Independent strategic review + merge of Block C  
2. Later Menu / Orders / Payments verticals per charter  
