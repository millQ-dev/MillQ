# MillQ Current State

**Checkpoint:** Architecture v1.3 alignment **in progress** (docs/ADR Proposed)  
**Canonical host:** Cursor Origin (`https://origin.cursor.com/millqdev/MillQ.git`)  
**Backup host:** GitHub `https://github.com/millQ-dev/MillQ.git` (mirror only)  
**Origin main (alignment base):** `46f01ec`  
**Block C:** **Merged** (PR #7 → `a5e84b0`)  
**Updated:** 2026-09-04

## Runtime / CI / backup

| Item | State |
| --- | --- |
| Foundation Operational Core | Merged |
| Architecture v1.2 | **Accepted / Merged** |
| Block C Goods Receipt vertical | **Merged** (PR #7 → `a5e84b0`) |
| Architecture v1.3 alignment | **Pending acceptance** — docs + ADR-0011…0019 Proposed |
| New application verticals | **STOP** until v1.3 accepted |
| Origin CI | **Attached** — Depot |
| GitHub Actions | Dormant copies only |
| GitHub backup | Verify lag independently (last known drift possible) |

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

## Proposed (Architecture v1.3 — not yet Accepted)

| ADR | Topic |
| --- | --- |
| ADR-0011 | Migration Architecture |
| ADR-0012 | JurisdictionProfile vs Provider Adapters |
| ADR-0013 | Payment Non-Custody |
| ADR-0014 | Vietnam Fiscalization Boundary |
| ADR-0015 | Privacy, Residency, Egress, LLC & Security Control Plane |
| ADR-0016 | Order Settlement & Split Bill |
| ADR-0017 | Floor Plan & Table Engine |
| ADR-0018 | Offline Multi-Platform Client Runtime |
| ADR-0019 | Economic Facts & Contribution Margin |

## Architecture baseline

- [`docs/architecture/architecture-v1.2.md`](../architecture/architecture-v1.2.md) (Accepted)
- [`docs/architecture/architecture-v1.3.md`](../architecture/architecture-v1.3.md) (**Proposed**)
- [`docs/architecture/domain-module-map.md`](../architecture/domain-module-map.md)
- [`docs/architecture/block-c-implementation.md`](../architecture/block-c-implementation.md)

## What exists in code

- Block C: Goods Receipt → movements → balance → CostQuote → GoodsReceived fact mirror
- No Migration adapters, fiscal providers, POS/FloorPlan, Grab/Shopee, or sale write-off

## Explicitly not started (implementation)

- Block D+ / Recipes → Sale write-off → Food Cost (candidate after v1.3 + PO launch)
- Migration Core scaffolding & source adapters
- Fiscal provider adapters
- POS / FloorPlan / Grab / Shopee
- Intelligence algorithms

## Next recommended sequence

1. ~~Block C~~ done  
2. **Accept Architecture v1.3** (strategic review of Proposed ADRs)  
3. PO launches next application vertical (candidate: Recipes → Sale write-off → Food Cost)  
4. Only then implement that vertical — **do not start in the v1.3 alignment PR**  
