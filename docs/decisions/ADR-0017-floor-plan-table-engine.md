# ADR-0017: Floor Plan and Table Engine

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-04
- **Related:** Architecture v1.3, ADR-0008 PackageEntitlement, Orders

## Context

Restaurant format needs floor plans and realtime table state. Corner/Cafe may disable tables. Architecture must define the table engine before Restaurant POS implementation without forcing `table_id` on all orders.

## Decision

### Concepts

| Concept | Role |
| --- | --- |
| `DiningArea` | Area within an Outlet |
| `FloorPlanVersion` | Immutable published layout version |
| `Table` / `TableLayoutObject` | Layout entities on a plan version |
| `TableRuntimeState` | Operational status (free/occupied/…) |
| `TableAssignment` | Optional link Order ↔ Table |
| `TableCombination` | Combined tables |

### Capability

Controlled by `OutletCapabilityConfig` / package entitlement (`tables.enabled`). When disabled, Orders work without tables.

### Ownership

FloorPlan/Table Engine is an Organization-adjacent or dedicated **Floor / Table** module boundary in the domain map. Orders own optional `TableAssignment` references only.

## Consequences

- Domain-module-map must list Floor/Table before Restaurant implementation.
- No implementation in Architecture v1.3 alignment PR.

## Alternatives considered

- Require table on every order — rejected.
- Embed floor geometry in Order — rejected.
