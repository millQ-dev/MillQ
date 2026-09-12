# MillQ Current State

**Checkpoint:** ADR-0017 **Accepted** — Origin `main` @ `1f683dc` (2026-09-12)  
**Canonical host:** Cursor Origin (`https://origin.cursor.com/millqdev/MillQ.git`)  
**Backup host:** GitHub `https://github.com/millQ-dev/MillQ.git` (mirror only)  
**Accept PR #19:** ADR-0017 @ `1f683dc57b988708b5149ba2d7771b0b46ed66f5`  
**Accept PR #17:** ADR-0018 @ `be58388`  
**Accept PR #15:** ADR-0014 / ADR-0016 @ `f764599`  
**Accept PR #13:** ADR-0015 / ADR-0019 @ `4510092`  
**Accept PR #11:** ADR-0012 / ADR-0013 @ `cf3375f`  
**Architecture v1.3 PR:** https://cursor.com/codebase/millqdev/MillQ/pull/9 — **merged** @ `77c6949`  
**Updated:** 2026-09-12

## Runtime / CI / backup

| Item | State |
| --- | --- |
| Foundation Operational Core | Merged |
| Architecture v1.2 | **Accepted / Merged** |
| Block C Goods Receipt vertical | **Merged** + v1.3-compatible |
| Architecture v1.3 alignment | **Merged** (PR #9 → `77c6949`) |
| ADR-0012 / ADR-0013 | **Accepted** (PR #11 → `cf3375f`) |
| ADR-0015 / ADR-0019 | **Accepted** (PR #13 → `4510092`) |
| ADR-0014 / ADR-0016 | **Accepted** (PR #15 → `f764599`) |
| ADR-0018 | **Accepted** (PR #17 → `be58388`) |
| ADR-0017 | **Accepted** (PR #19 → `1f683dc`) |
| New application verticals | **STOP** until PO launches next vertical |
| Origin CI | **Attached** — Depot |
| GitHub Actions | Dormant copies only |
| GitHub backup | Post-merge Origin→GitHub via **MillQ Origin Backup** App |

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
| ADR-0012 | Accepted | JurisdictionProfile vs Provider Adapters |
| ADR-0013 | Accepted | Payment Non-Custody Boundary |
| ADR-0014 | Accepted | Vietnam Fiscalization Architecture Boundary |
| ADR-0015 | Accepted | Privacy, Residency, Egress, LLC & Security Control Plane |
| ADR-0016 | Accepted | Order Settlement & Split Bill |
| ADR-0017 | Accepted | Floor Plan & Table Engine |
| ADR-0018 | Accepted | Offline Multi-Platform Client Runtime |
| ADR-0019 | Accepted | Economic Facts & Contribution Margin |
| ADR-0020 | Accepted | Production Intelligence Execution & Model Gateway |
| ADR-0021 | Accepted | Voice & Multilingual Interaction Boundary |

## Proposed (Architecture v1.3 — not yet Accepted)

| ADR | Topic |
| --- | --- |
| ADR-0011 | Migration Architecture |

### Settlement / non-custody invariant (ADR-0013 + ADR-0016)

A recorded **external** deposit/prepayment may be referenced/allocated later but **must not** become a MillQ custodial balance or wallet.

### Floor / Table ownership invariant (ADR-0017)

Floor/Table owns `TableAssignment` (refs `OrderId`). Orders owns Order truth only and does not depend on Floor/Table internal state.

## Architecture baseline

- [`docs/architecture/architecture-v1.2.md`](../architecture/architecture-v1.2.md) (Accepted)
- [`docs/architecture/architecture-v1.3.md`](../architecture/architecture-v1.3.md)
- [`docs/architecture/domain-module-map.md`](../architecture/domain-module-map.md)
- [`docs/architecture/block-c-implementation.md`](../architecture/block-c-implementation.md)

## What exists in code

- Block C: Goods Receipt → movements → balance → CostQuote → GoodsReceived fact mirror
- No Migration adapters, fiscal providers, POS/FloorPlan, Grab/Shopee, sale write-off, ModelGateway, ASR/TTS, or GPU runtime

## Explicitly not started (implementation)

- Next vertical candidate after PO launch: **Recipes → Sale write-off → Food Cost**
- Migration Core scaffolding & source adapters
- Fiscal provider adapters
- POS / FloorPlan / Grab / Shopee
- ModelGateway / Intelligence runtime / Voice runtime
- Intelligence algorithms

## Next recommended sequence

1. ~~Block C~~ done  
2. ~~Architecture v1.3 alignment~~ merged  
3. ~~ADR-0012 / ADR-0013~~ Accepted  
4. ~~ADR-0015 / ADR-0019~~ Accepted  
5. ~~ADR-0014 / ADR-0016~~ Accepted  
6. ~~ADR-0018~~ Accepted  
7. ~~ADR-0017~~ **Accepted** (PR #19 → `1f683dc`)  
8. Next PO review: **ADR-0011** Migration Architecture  
9. Application verticals remain **STOP** until PO launch  
