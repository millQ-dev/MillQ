# Historical Truth Model

- **Status:** Foundation reference (aligned with Architecture v1.2 / ADR-0010)
- **Date:** 2026-08-19
- **Updated:** 2026-09-04
- **Related:** ADR-0002, ADR-0003, ADR-0010, Operational Core model, [`architecture-v1.2.md`](architecture-v1.2.md)

## 1. Goal

MillQ must answer: **“What did we believe happened at time T?”**

This requires more than mutable current-state rows. The model combines:

- **transactional current state** where needed for operations (e.g. open order, current stock balance);
- **immutable or versioned business records** for facts that must never silently change;
- **append-only derived revisions** for recalculated values (cost, margin).

This is not full event sourcing. It is a practical modular-monolith approach.

## 2. Classification of records

| Class | Meaning | Examples |
| --- | --- | --- |
| **Immutable business fact** | Posted once; corrections via explicit reversal/correction workflow | Supplier receipt, inventory movement, payment, audit record |
| **Versioned definition** | New version supersedes for future use; old version retained | RecipeVersion, PreparationSpecification, PriceList, PackageVersion |
| **Mutable operational state** | Current workflow state | Open order, kitchen ticket in progress |
| **Derived revision** | Recalculated from facts; prior revision preserved | CostRecalculationRun, issue cost revision |
| **Reference data version** | Effective-dated configuration | JurisdictionProfile, RoundingPolicy |

## 3. Facts requiring immutable or versioned history

| Domain | Requirement |
| --- | --- |
| **Purchases** | Posted receipt lines immutable; late entry uses real business position (ADR-0003) |
| **Prices** | Price definitions versioned; Orders store applied snapshot at sale |
| **Recipes / preparations** | Versioned specs; operations reference exact version used |
| **Preparation yields** | ProductionBatch records actual input/output; spec records expected |
| **Inventory movements** | Movements immutable; adjustments via new movement or controlled correction |
| **Sales** | Order and lines immutable after post; cancellations as new facts |
| **Cancellations** | Cancellation fact with reason, write-off flag, audit |
| **Payments** | Payment/refund immutable |
| **Employee actions** | DangerousOperationRecorded, audit trail |
| **Menu/pricing changes** | Version activation facts; not retroactive edits to past orders |
| **Structure changes** | Effective-dated relationships; historical facts keep original context |

## 4. Business chronology (ADR-0003)

Every cost-affecting movement carries:

- `businessDate` (mandatory)
- `businessTime` (optional; never fabricated)
- `businessOrder` (mandatory ordering within date)
- `recordedAt` (server audit only)

Costing order: `businessDate ASC, businessOrder ASC`.

Offline devices must preserve business order through sync. Unresolved order → `ORDER_UNRESOLVED`, no silent fallback to server time.

## 5. Context captured on facts

Operational facts record structural context at business time:

- business group / legal entity / restaurant / warehouse / terminal
- jurisdiction profile version
- valuation currency
- actor (employee/user)
- idempotency key (for retried commands)

Historical queries use context stored on the fact, not today’s structure graph.

## 6. Recalculation vs rewrite

| Allowed | Forbidden |
| --- | --- |
| Append new cost revision | Change posted movement quantity |
| Replay from earliest affected position | Delete audit history |
| Preserve previous derived value | Retroactively change payment amount |
| Link revision to trigger run | Invent business time |

## 7. Storage pattern (implementation direction)

Per module, within PostgreSQL:

1. **Fact tables** — append-only inserts for posted business facts (module-owned source of truth)
2. **Version tables** — new row per version with validity interval
3. **State tables** — current balance/status updated in same transaction as fact insert
4. **Revision tables** — derived cost/status before/after linked to run ID
5. **Optional fact feed** — `operational_fact_feed` may mirror published facts for analytics/integration; it is **not** a replacement for module-owned source tables (see `operational-fact-feed.md`)

Cross-module integrity: single database transaction where a command spans modules; each module writes only its tables.

Foundation migration `001_foundation.sql` creates only the feed + recommendations schema placeholders. Block C introduces Procurement/Inventory source tables per [`block-c-goods-received-contract.md`](block-c-goods-received-contract.md).

## 7.1 Document posting and correction (ADR-0010)

Financially / inventory-significant documents use:

```text
DRAFT → POSTED → REVERSED / CORRECTED
```

- **Typed documents** (GoodsReceipt, StockAdjustment, …) ≠ **InventoryMovement** lines.
- Stock balance is a **projection** of movements; systems must be able to explain a balance via the movement/document chain.
- After POSTED: no silent mutation; correction via reversal/compensating operations with audit.
- Posting is transactional with the movements (and optional feed mirror) it produces.
- Keep distinct clocks: `createdAt`, `recordedAt`, `documentDate`, `businessDate` / `businessTime?` / `businessOrder`, `effectiveAt`, `postedAt`.

## 7.2 Cost semantics (no `product.cost`)

Do not store a universal product cost field. Distinguish supplier price, inventory unit valuation, theoretical recipe cost, expected/actual COGS, sale price, margins — with certainty/status from ADR-0003 (`FINAL`, `ESTIMATED_FROM_LAST_KNOWN`, `UNKNOWN`, `ORDER_UNRESOLVED`). Conceptual `CostQuote` carries basis and confidence.

## 8. Production Intelligence consumption

Intelligence and Analytics read:

- immutable facts and revision chains
- never write back to fact tables

Recommendations reference evidence fact IDs and revision IDs for explainability.

## 9. Deferred to later blocks

- Exact table schemas (Block C+)
- Full correction UX state machines (Block C+)
- Offline conflict resolution details
- Period-close rules (Product Owner + accounting verification)
- Inventory count session UX (blind count)
