# Block D1.2A Implementation — ProductionBatch Domain Foundation

**Status:** **Merged** on Origin `main` @ `4546dbe` (PR #27, 2026-09-12)  
**ADRs:** ADR-0002, ADR-0003, ADR-0008, ADR-0009, ADR-0010 (document ≠ movement)  
**Autonomy:** Level C  
**Baseline:** Origin `main` @ `65f4c6f` (after D1.1 merge)

## Boundary

Delivers **domain/application foundation** for recording actual production:

- `ProductionBatch` with lifecycle **DRAFT → FINALIZED**
- Exact `PreparationVersion` pin (never “latest”)
- Immutable normative/expected snapshot at create
- Distinct actual input / output / yield
- Yield variance (actual − expected)
- Deviation classes: `NORMAL` | `MATERIAL_DEVIATION` | `ACCIDENT` | `TOTAL_LOSS`
- `production_batch_input` planned snapshot + attributable actuals
- Concurrency-safe update/finalize (`FOR UPDATE`, idempotent finalize)

Eligibility: only **PUBLISHED** + **STOCK_TRACKED** preparations in the same tenant. **VIRTUAL** rejected.

## What FINALIZED means in D1.2A

`FINALIZED` is a **recorded immutable production fact foundation**.

It is **not** inventory-posted (`POSTED`). Inventory/economic posting remains **NOT IMPLEMENTED** until **D1.2B**.

## Explicitly out of scope (not implemented)

- `inventory_movement` / `inventory_balance` changes from production
- production input costing / output valuation / moving-average update
- ProductionBatch reversal / compensating inventory (D1.2B)
- Sales / Orders / POS / modifiers / Effective Recipe
- sale write-off / Food Cost / Contribution Margin
- allergen resolution / Workforce / Professional Workspace / Intelligence recommendations
- global deviation threshold policy (deferred)
- new authorization subsystem

## Invariants preserved

- No `product.cost` / monetary input-output fields
- Normative expected values are never overwritten by actuals
- Later PreparationVersion edits do not reinterpret historical batches
- Positive actual output required except explicit `TOTAL_LOSS` zero-output path (reason required)
- `ACCIDENT` / `TOTAL_LOSS` require reason + audit-ready context
- Exactly-one future physical write-off path preserved: VIRTUAL never becomes an independently consumed stock item via ProductionBatch
