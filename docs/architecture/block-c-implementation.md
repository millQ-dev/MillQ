# Block C Implementation — Goods Receipt / Inventory / Costing

**Status:** Implemented on feature branch (awaiting independent strategic review)  
**Contract:** [`block-c-goods-received-contract.md`](./block-c-goods-received-contract.md)  
**ADRs:** ADR-0002, ADR-0003, ADR-0008, ADR-0009, ADR-0010 (Accepted)

## Boundary

Block C delivers the first complete operational vertical:

Supplier / SupplierItem / SupplierPack → Goods Receipt DRAFT → validate → POST →
inventory movements → inventory balance (moving weighted average) → CostQuote →
operational_fact_feed mirror → REVERSE foundation.

Out of scope remains: sales/POS, menu, recipe write-off, fiscal/tax, Intelligence algorithms, intercompany transfers.

## Authoritative persistence (module-owned)

| Table | Owner role |
| --- | --- |
| `tenant`, `legal_entity`, `brand`, `outlet`, `warehouse` | Organization stubs |
| `catalog_item` | Minimal stock-tracked catalog |
| `supplier`, `supplier_pack`, `supplier_item` | Procurement (ADR-0009) |
| `goods_receipt`, `goods_receipt_line` | Procurement document SoT |
| `inventory_movement` | Inventory movement SoT (immutable posted history) |
| `inventory_balance` | Rebuildable projection (not sole historical truth) |
| `audit_record` | Append-only audit |
| `operational_fact_feed` | **Mirror only** — not purchasing/inventory SoT |

Migration: `apps/api/migrations/002_block_c.sql`.

## Lifecycle

`DRAFT` → `POSTED` → `REVERSED` (compensating reverse document + OUT movements).

POSTED economic fields cannot be silently edited (`PostedImmutableError`). Corrections create new history.

## GoodsReceived operational fact granularity (strategic review)

**Decision: line-level (A), not document-level.**

Exact typed contract (`packages/contracts/src/operational-facts.ts` → `goodsReceivedPayloadSchema`):

- required: `stockItemId`, `supplierReceiptId`, `acceptedBaseQuantity`, `purchasePrice`
- optional (Block C always sets): `sourceDocumentLineId`

That shape is a **single inventory line** (one stock item + accepted qty + unit purchase price), keyed to the parent document via `supplierReceiptId`. It is not a document aggregate payload.

Publication rules:

| Concern | Rule |
| --- | --- |
| Document id | Every fact carries `payload.supplierReceiptId` = `goods_receipt_id` |
| Line identity | `payload.sourceDocumentLineId` = `goods_receipt_line_id` (stable UUID) |
| Idempotency | `fact:{postIdempotencyKey}:line:{goodsReceiptLineId}` — retry does not duplicate line facts |
| Grouping | Consumers group facts by `supplierReceiptId` into one business document |
| Counting | N line facts ≠ N receipts; distinct `supplierReceiptId` = document count |
| SoT | Module tables remain authoritative; feed is a mirror |

Strict `factType` ↔ payload validation is unchanged (no generic JSON fallback).

## Costing / replay

**Warehouse is an Accepted costing boundary** — not an implementation invention.

Exact Accepted statement — [ADR-0003](../decisions/ADR-0003-yield-preparations-moving-average-costing.md) §5 “Moving weighted average is warehouse scoped”:

> The cost stream is scoped by:  
> `warehouse + stockItem + valuationCurrency`

Also ADR-0003 consequences checklist: “Moving weighted average per warehouse/item/valuation currency.”  
Also ADR-0002 §4: “Every warehouse/item cost stream belongs to exactly one valuation currency.”

Block C persistence keys balances as `(legal_entity_id, warehouse_id, catalog_item_id)`:

- **Averaging dimension** remains warehouse + item + currency per ADR-0003 (no cross-warehouse average).
- **LegalEntity** on the balance row is denormalized from warehouse ownership / Goods Receipt economic boundary (Architecture v1.2 / Block C ownership rules). It does not introduce a second averaging axis across LegalEntities.

- No `product.cost`. Cost exposed via `CostQuote` (`FINAL` / `UNKNOWN`).
- Posting and reversal **rebuild** balances by replaying movements ordered by `business_date`, `business_order`.

## API (minimum)

- `POST /api/v1/goods-receipts` — create draft
- `GET /api/v1/goods-receipts/:id`
- `PATCH /api/v1/goods-receipts/:id` — draft only
- `POST /api/v1/goods-receipts/:id/validate`
- `POST /api/v1/goods-receipts/:id/post` — explicit command + idempotency key
- `POST /api/v1/goods-receipts/:id/reverse`
- `GET /api/v1/inventory/balance`
- `GET /api/v1/costing/quote`

## Engineering decisions (non-PO)

- Supplier pack multipack uses `units_per_package` × `unit_quantity` × received `packageCount`.
- Line acquisition minor = `floor(unitPriceMinor × acceptedBaseQuantity)` for integer VND lines.
- `catalogItemId` maps to contract field `stockItemId`.

## Deferred / PO stop conditions (not invented)

- Cross-LegalEntity / intercompany stock transfer accounting
- Vietnam fiscal/tax mapping
- Full negative-stock deficit destination accounting beyond ADR-0003 preservation
- Complete sales consumption chain (Block D+)
