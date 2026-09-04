# Block C Contract — GoodsReceived / Inventory Vertical

- **Status:** Binding scope for the next implementation block (after Architecture v1.2 merge)
- **Authority:** Architecture v1.2, ADR-0008, ADR-0009, ADR-0010, ADR-0002, ADR-0003
- **Do not start** until Architecture v1.2 alignment is merged

## 1. Goal

Minimal end-to-end **Goods Received → stock movements → valuation input → fact publication → audit**, plus a correction path — without building full POS, Menu, or Catalog profiles.

## 2. In scope

```text
Supplier
→ SupplierItem
→ SupplierPack
→ GoodsReceipt (DRAFT)
→ validate
→ POST
→ InventoryMovement[]  (base quantities)
→ inventory valuation input (ADR-0003 moving average hooks)
→ operational_fact_feed publication (mirror only)
→ audit evidence
```

Correction:

```text
POSTED GoodsReceipt
→ REVERSE / CORRECT
→ compensating InventoryMovement[]
→ audit
→ feed publication of correction facts
```

Also in scope as needed for the path:

- Minimal Tenant / Outlet / Warehouse identity (Organization stubs)
- Minimal CatalogItem + InventoryProfile (or equivalent minimal stock-tracked item)
- Units & Packaging conversions for the receipt
- Idempotency keys and business chronology fields (ADR-0003)
- Transactional posting (ADR-0010)
- Tests for posting, idempotency conflict, pack→base conversion, no silent mutate after POSTED

## 3. Module ownership

| Concern | Owner |
| --- | --- |
| Supplier, SupplierItem, GoodsReceipt document | **Procurement** (purchasing vertical) |
| InventoryMovement, stock projection | **Inventory** |
| Unit / SupplierPack conversion math | **Units & Packaging** + `@millq/domain` |
| Derived unit cost update | **Recipes & Costing** (derived only; may be stubbed if valuation hooks only) |
| Fact feed rows | mirror after successful post — **not** SoT |
| Audit | **Audit & Risk** |

## 4. Out of scope for Block C

- Full Catalog profiles (nutrition, compliance, sellable UI)
- Menu / POS / Channel Menu / MenuResolver
- Orders, Payments, CashShift
- Production routing, KDS
- Recipe graph resolver implementation (beyond consuming ADR-0003 materialization flags if needed)
- Grab/delivery connectors
- Loyalty / promotions
- Inventory count UX (boundary exists; not required)
- Period lock implementation
- ORM introduction
- Microservices / Kafka / event-sourcing core

## 5. Invariants

1. Document ≠ movement; balance explainable via movements.
2. DRAFT → POSTED → REVERSED/CORRECTED; no silent edit after POSTED.
3. Ledger quantities in **base units**; document keeps supplier pack facts.
4. `operational_fact_feed` mirrors; Procurement/Inventory tables are SoT.
5. `operational_fact_feed` mirrors; Procurement/Inventory tables are SoT.
   - Typed `GoodsReceived` facts are **line-level** (see `goodsReceivedPayloadSchema`); group by `supplierReceiptId`. Details: [`block-c-implementation.md`](./block-c-implementation.md).
6. Same idempotency key + same semantics → duplicate; mismatch → conflict.
7. Do not invent Vietnam fiscal behavior.
8. Do not introduce `product.cost`; valuation follows ADR-0003 (`warehouse + stockItem + valuationCurrency`).

## 6. Acceptance sketch (for Block C PR later)

- Can create Supplier + SupplierItem + pack
- Can DRAFT and POST GoodsReceipt producing movements
- Stock projection updates; can explain via movements
- Reversal/correction works with audit
- Feed contains mirrored facts without being the ledger
- CI (Depot) green
- Architecture docs unchanged unless a real gap appears

## 7. Explicit non-start rule

This file is a **contract**, not permission to implement inside the Architecture v1.2 alignment PR.
