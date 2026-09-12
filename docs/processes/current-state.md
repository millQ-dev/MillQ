# MillQ Current State

**Checkpoint:** Architecture v1.3 alignment **pending strategic acceptance** (PR #9)  
**Canonical host:** Cursor Origin (`https://origin.cursor.com/millqdev/MillQ.git`)  
**Backup host:** GitHub `https://github.com/millQ-dev/MillQ.git` (mirror only)  
**Origin main:** `46f01ec`  
**Block C:** **Merged** (PR #7 → `a5e84b0`) and **v1.3-compatible**  
**Updated:** 2026-09-12

## Runtime / CI / backup

| Item | State |
| --- | --- |
| Foundation Operational Core | Merged |
| Architecture v1.2 | **Accepted / Merged** |
| Block C Goods Receipt vertical | **Merged** + v1.3-compatible |
| Architecture v1.3 alignment | **PR #9 pending strategic acceptance** — ADR-0011…0021 Proposed |
| New application verticals | **STOP** until architecture acceptance |
| Origin CI | **Attached** — Depot |
| GitHub Actions | Dormant copies only |
| GitHub backup | Verify lag independently |

## Accepted decisions

| ADR | Status | Topic |
| --- | --- | --- |
| ADR-0001 | Accepted | Technology stack |
| ADR-0002 | Accepted | Money, quantity, units |
| ADR-0003 | Accepted | Yield, preparations, moving-average costing |
| ADR-0004 | Accepted | Origin SoT; GitHub backup |
| ADR-0006 | Accepted | Production Intelligence boundary (**not superseded**) |
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
| ADR-0020 | Production Intelligence Execution & Model Gateway |
| ADR-0021 | Voice & Multilingual Interaction Boundary |

## Architecture baseline

- [`docs/architecture/architecture-v1.2.md`](../architecture/architecture-v1.2.md) (Accepted)
- [`docs/architecture/architecture-v1.3.md`](../architecture/architecture-v1.3.md) (**Proposed**)
- [`docs/architecture/domain-module-map.md`](../architecture/domain-module-map.md)
- [`docs/architecture/block-c-implementation.md`](../architecture/block-c-implementation.md)

## What exists in code

- Block C: Goods Receipt → movements → balance → CostQuote → GoodsReceived fact mirror
- No Migration adapters, fiscal providers, POS/FloorPlan, Grab/Shopee, sale write-off, ModelGateway, ASR/TTS, or GPU runtime

## Explicitly not started (implementation)

- Next vertical candidate after architecture acceptance + PO launch: **Recipes → Sale write-off → Food Cost**
- Migration Core scaffolding & source adapters
- Fiscal provider adapters
- POS / FloorPlan / Grab / Shopee
- ModelGateway / Intelligence runtime / Voice runtime
- Intelligence algorithms

## Next recommended sequence

1. ~~Block C~~ done (merged, v1.3-compatible)  
2. **Strategic acceptance of Architecture v1.3** (Proposed ADRs including 0020/0021) — PR #9 **DO NOT MERGE** until PO accepts  
3. PO launches next application vertical (candidate: Recipes → Sale write-off → Food Cost)  
4. Only then implement that vertical — **STOP** until then  
