# ADR-0010: Document Posting and Correction Semantics

- **Status:** Accepted
- **Date:** 2026-09-04
- **Accepted:** 2026-09-04
- **Decision owners:** Product Owner
- **Related:** ADR-0003, ADR-0008, [`historical-truth-model.md`](../architecture/historical-truth-model.md), [`block-c-goods-received-contract.md`](../architecture/block-c-goods-received-contract.md)

## Context

Inventory and purchasing need auditable history. Mutable balances as primary truth and silent edits of posted documents make “explain this stock” impossible. A single polymorphic `InventoryDocument` with many nullables recreates legacy ERP pain.

## Decision

### Document ≠ Movement

| Concept | Role |
| --- | --- |
| **Typed inventory/purchasing document** | Business aggregate (who/why/from-where); lifecycle DRAFT → POSTED → REVERSED/CORRECTED |
| **InventoryMovement** | Immutable stock effect lines produced by posting |
| **Stock balance** | Projection / derived state from movements |

Typed aggregates include (not exhaustive): GoodsReceipt, GoodsIssue, StockTransfer, ProductionBatch/Document, InventoryCountSession, StockAdjustment, SupplierReturn.

Do **not** use one document type with `type` + dozens of nullable fields as the long-term model. Shared posting infrastructure is allowed.

### Lifecycle

```text
DRAFT → POSTED → REVERSED / CORRECTED
```

- After **POSTED**: no silent field mutation of business-significant content.
- Correction = reversal / compensating movements / correcting document — with audit.
- Posting is **transactional**: document state + movements (+ feed publication) commit together or not at all.
- Idempotent posting keys required (offline-safe).

### Time fields (do not collapse)

Preserve distinct meanings (aligns with ADR-0003):

| Field | Meaning |
| --- | --- |
| `createdAt` | Record creation |
| `recordedAt` | Server audit clock |
| `documentDate` | Document calendar date (business) |
| `businessDate` / `businessTime?` / `businessOrder` | Costing chronology |
| `effectiveAt` | When effect applies if distinct |
| `postedAt` | When posting succeeded |

### Fact feed

`operational_fact_feed` may **mirror** posted facts after success. Module-owned source tables remain authoritative for Purchasing/Inventory.

### Inventory count (boundary only)

`InventoryCountSession` with book snapshot, counted qty, variance → posts `StockAdjustment`. Blind count UX must remain possible (book qty hidden).

### Period lock (boundary only)

Schema and chronology must remain compatible with future period locks; do not use `created_at` as the only business time.

## Consequences

### Positive

- Explainable balances; Block C can implement GoodsReceipt posting safely.
- Compatible with ADR-0003 chronology and negative stock policy.

### Negative / accepted cost

- More aggregates and posting code than a single mutable qty field.
- Corrections are explicit workflows, not “edit the row”.

## Rejected alternatives

- Mutable quantity as primary truth.
- Silent edit of posted documents.
- Giant polymorphic inventory document table as SoT.
- Using `operational_fact_feed` as the inventory ledger.

## Acceptance

Accepted by Product Owner on **2026-09-04** as part of Architecture v1.2.
