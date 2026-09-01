# Operational Fact Feed (Foundation)

## Purpose

Table `operational_fact_feed` (migration `001_foundation.sql`) is an **immutable fact feed** used for:

- integration / offline sync evidence
- analytics and Production Intelligence evidence
- cross-module read-side consumption of published facts

## What it is not

It is **not**:

- a giant central ledger replacing module-owned records
- the sole authoritative persistence for Purchasing, Inventory, Orders, Payments, Recipes, or Costing
- a substitute for module-owned historical source tables

## Architecture rule

MillQ remains:

```text
module-owned operational state / historical records
        +
explicit immutable business facts where required
        +
optional derived/read-side fact feed (this table)
```

Block C owns introducing real source tables and state transitions (e.g. GoodsReceived → inventory movement). The feed may mirror published facts after those commands succeed.

See also: `historical-truth-model.md`, ADR-0006.
