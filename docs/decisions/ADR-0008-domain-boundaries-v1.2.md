# ADR-0008: Domain Boundaries Architecture v1.2

- **Status:** Accepted
- **Date:** 2026-09-04
- **Accepted:** 2026-09-04
- **Decision owners:** Product Owner
- **Related:** [`architecture-v1.2.md`](../architecture/architecture-v1.2.md), [`domain-module-map.md`](../architecture/domain-module-map.md), ADR-0001, ADR-0004, ADR-0006

## Context

Foundation Operational Core is merged. Application modules are largely unimplemented. The provisional domain map still reflected an earlier Block B draft (BusinessGroup hierarchy, StockItem-centric catalog, mixed Menu/Pricing). Architecture v1.2, derived from restaurant-process reverse engineering (not iiko cloning), must become the official boundary baseline before Block C.

## Decision

1. **Network-first Tenant model** with dimensions `LegalEntities[]`, `Brands[]`, `Outlets[]`, `Users[]`. Operational inheritance spine: `Tenant → Brand → Outlet → TerminalGroup → Terminal`. LegalEntity is fiscal/legal — not menu inheritance.
2. **PackageEntitlement + OutletCapabilityConfig** — no product forks via scattered package conditionals. Tables are optional capability.
3. **Module ownership** per [`domain-module-map.md`](../architecture/domain-module-map.md) (Core + extensible modules). Modular monolith retained.
4. **Catalog ≠ Menu Configuration ≠ POS Presentation ≠ Channel Menu**.
5. **Pricing ≠ Promotions ≠ Loyalty** — specialized resolvers, no universal rules DSL.
6. **Orders do not require Table.**
7. **Production Routing** is route → station → endpoints, versioned, snapshotted at send.
8. **Inventory:** typed documents vs movements; balance is projection (details in ADR-0010).
9. **Purchasing** owns supplier source documents; Inventory owns movements after posting.
10. **Event classes:** DOMAIN / AUDIT / INTEGRATION / TELEMETRY. Outbox only where durable async is required.
11. **Production Intelligence** remains ADR-0006 (read-side).
12. **`operational_fact_feed`** remains evidence/integration feed, not central ledger.

## Consequences

### Positive

- Block C and later verticals share one boundary language.
- Prevents mixing catalog, menu, POS layout, and channel concerns in one table.
- Preserves single-restaurant and multi-outlet network without premature microservices.

### Negative / accepted cost

- Some earlier Block B draft naming (BusinessGroup, StockItem-as-catalog) is superseded in documentation; draft Branch B ADRs are historical proposals, not Accepted MillQ ADRs.
- More modules on paper than implemented — ownership is documented first, code follows verticals.

## Rejected alternatives

- Rigid `Tenant → LegalEntity → Brand → Restaurant` as the only hierarchy for menu inheritance.
- Separate Corner/Cafe/Restaurant codebases or global package `if` trees.
- Central event-sourced ledger replacing module-owned tables.
- Universal rule engine for all commercial/auth decisions.

## Alignment with Accepted ADRs

Does not change ADR-0001 (stack), ADR-0002 (measurement), ADR-0003 (costing/yield), ADR-0004 (Origin), ADR-0006 (Intelligence), ADR-0007 (scaffolding). Clarifies organization and commercial surfaces around them.

## Acceptance

Accepted by Product Owner as Architecture v1.2 baseline on **2026-09-04** via architecture-alignment task (pre–Block C).
