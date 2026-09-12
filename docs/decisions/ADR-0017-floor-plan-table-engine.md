# ADR-0017: Floor Plan and Table Engine

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-04
- **Accepted:** 2026-09-12 (PO ACCEPT WITH DELTAS)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, ADR-0008 PackageEntitlement, ADR-0018 (Accepted), Orders

## Context

Restaurant format needs floor plans and realtime table state. Corner/Cafe may disable or optionally use tables. Architecture must define the table engine before Restaurant POS implementation without forcing `table_id` on all orders.

## Decision

### 1. Order does not require Table

- Table / Floor Plan is an **optional** capability.
- An Order must remain valid **without** any `TableAssignment`.
- Do **not** model Order ownership through Table.

### 2. Package / Location capability

Floor / Table Engine must be enableable / disableable per restaurant / location / package configuration (`OutletCapabilityConfig` / `PackageEntitlement`, e.g. `tables.enabled`).

Architecture must support product capability differences — **not** separate product forks:

| Format | Tables |
| --- | --- |
| Corner | tables **OFF** |
| Cafe | tables **optional** |
| Restaurant | tables / floor-plan **enabled** |

### 3. Core model

```text
RestaurantLocation (Outlet)
  → DiningArea
  → FloorPlanVersion
  → Table
```

Runtime concepts:

- `TableRuntimeState`
- optional `TableAssignment`
- optional `TableCombination`

Also: `Table` / `TableLayoutObject` as layout entities on a plan version.

### 4. Floor plan versioning

- Floor plans are **versioned**.
- Changing layout, geometry, numbering, or areas must **not** silently rewrite historical context.
- Historical orders / audit should remain attributable to the relevant table / plan identity / version where needed.

### 5. Table runtime state

- `TableRuntimeState` is **operational / runtime** state, not accounting / financial truth.
- Exact state enum may remain implementation-later.
- Do **not** make table state the source of truth for settlement or inventory.

### 6. Table assignment

- Assignment of an Order to a Table is **explicit and optional**.
- Floor / Table **owns** `TableAssignment` (references `OrderId`); Orders owns no table-assignment state.
- Moving an Order between tables must be an **explicit auditable command / event**, not a silent foreign-key overwrite.

### 7. Multiple orders per table

- Architecture must allow **multiple independent Orders / Checks** associated with the same table.
- Do **not** enforce one-open-order-per-table as a hard invariant.

### 8. Multiple tables / combinations

- Temporary table combinations must **not** destroy or permanently mutate underlying Table identities.
- Use a concept equivalent to `TableCombination`.
- MVP does not need every multi-table interaction, but architecture must **not** force `Order.table_id` as the only possible model.

### 9. Reservations

- Do **not** expand this ADR into a full reservation product.
- Reservation integration / ownership remains **future architecture** unless explicitly accepted later.

### 10. Offline (ADR-0018)

TableAssignment / runtime operations must comply with ADR-0018:

- DeviceIdentity;
- actor / client context;
- business chronology;
- idempotency;
- entity-specific conflict policy.

No universal last-write-wins.

### 11. Production routing

- Do **not** couple tables to Kitchen / Production routing.
- `ProductionRoute` / Station remain **separate** domain concepts.

### 12. Acceptance scope

ADR-0017 acceptance freezes **boundaries and invariants only**. It does **NOT** mean:

- UI floor editor implemented;
- drag/drop layout implemented;
- reservation system implemented;
- every runtime state finalized;
- POS code started.

### Ownership

Floor / Table module **owns**:

- `DiningArea`
- `FloorPlanVersion`
- `Table` / `TableLayoutObject`
- `TableRuntimeState`
- `TableAssignment`
- `TableCombination`

FloorPlan / Table Engine is an Organization-adjacent or dedicated **Floor / Table** module boundary in the domain map.

**Orders owns Order truth only.** Orders must **NOT** own `TableAssignment`.

`TableAssignment` references `OrderId` but remains Floor/Table-owned optional operational association.

This preserves:

- Order does not require Table; and
- Orders does not depend on Floor/Table internal state.

## Consequences

- Domain-module-map lists Floor/Table before Restaurant implementation.
- Client / floor UI / POS table flows remain deferred; no application code in this acceptance.

## Alternatives considered

- Require table on every order — rejected.
- Embed floor geometry in Order — rejected.
- Model Order ownership through Table — rejected.
- One-open-order-per-table hard invariant — rejected.
- Silent FK overwrite for table moves — rejected.
- Permanent mutation of Table identity via combinations — rejected.
- Full reservation product inside this ADR — rejected.
- Coupling tables to ProductionRoute — rejected.
- Universal last-write-wins for table runtime — rejected.
