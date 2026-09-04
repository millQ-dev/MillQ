# Operational Fact Feed (Foundation)

## Purpose

Table `operational_fact_feed` (migration `001_foundation.sql`) is an **immutable fact feed** used for:

- integration / offline sync evidence
- analytics and Production Intelligence evidence
- cross-module read-side consumption of published facts

## What it is not

It is **not**:

- a giant central ledger replacing module-owned records
- inventory ledger or sole authoritative persistence for Purchasing, Inventory, Orders, Payments, Recipes, or Costing
- a generic event store or substitute for DOMAIN/AUDIT/INTEGRATION taxonomy in application design

## Architecture rule

```text
module-owned operational state / historical records
        +
explicit immutable business facts where required
        +
optional derived/read-side fact feed (this table)
```

Event classes (Architecture v1.2): **DOMAIN | AUDIT | INTEGRATION | TELEMETRY**. UI telemetry must not be treated as domain facts by default.

## Block C

Block C introduces real Procurement/Inventory source tables and posting. After a successful POST, the feed may **mirror** published facts. See [`block-c-goods-received-contract.md`](block-c-goods-received-contract.md) and ADR-0010.

See also: `historical-truth-model.md`, ADR-0006, ADR-0008.
