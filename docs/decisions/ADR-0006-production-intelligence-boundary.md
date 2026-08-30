# ADR-0006: Production Intelligence Boundary

- **Status:** Accepted
- **Date:** 2026-08-19
- **Accepted:** 2026-08-30
- **Decision owners:** Product Owner and System Architect
- **Related:** [`operational-core-and-intelligence.md`](../architecture/operational-core-and-intelligence.md), [`domain-module-map.md`](../architecture/domain-module-map.md)

## Context

MillQ’s long-term product includes a recommendation and business-intelligence layer (Production Intelligence) that must become a sellable capability. The Operational Core already owns authoritative facts for sales, inventory, costing, and audit.

Without an explicit boundary, analytics code could mutate operational data or duplicate ledger logic.

## Decision drivers

1. Single source of operational truth (Operational Core).
2. Future recommendations must be explainable and auditable.
3. No microservices — boundary is modular inside the monolith.
4. No fake AI or external LLM dependency in foundation phase.
5. Recommendations that cause operational change require human approval path.

## Decision

### Layer separation

| Layer | May write | May read |
| --- | --- | --- |
| **Operational Core modules** | Their owned operational facts | Other modules via contracts |
| **Costing** | Derived cost revisions only | Inventory, purchasing, recipe facts |
| **Analytics** | Read models and aggregates only | Operational facts, cost revisions |
| **Production Intelligence** | Recommendations, detector runs, forecast artifacts only | Analytics projections, operational facts (read-only) |

**Operational Core is the only source of operational truth.**

Production Intelligence may:

- read facts;
- calculate derived data;
- detect patterns;
- forecast;
- produce recommendations;
- explain evidence;
- track human decisions.

Production Intelligence **must not** silently mutate:

- purchases;
- inventory;
- sales;
- payments;
- recipe history;
- cost history;
- audit history.

Production Intelligence **must not** INSERT/UPDATE/DELETE rows in Inventory, Orders, Payments, Purchasing, or Audit source tables.

Any recommendation that causes an operational change must cross an explicit **Operational Core command** boundary.

### Recommendation lifecycle

A `Recommendation` record contains at minimum:

- `recommendationType` (e.g. STOCKOUT_RISK, WASTE_ANOMALY, MENU_ENGINEERING)
- `target` (structured reference: restaurant, item, supplier, etc.)
- `generatedAt`
- `evidenceFactIds` / `evidenceRevisionIds` — input facts used
- `explanation` — human-readable text or structured explanation blocks
- `confidence` — optional scored confidence (0–1 or enum)
- `expectedImpact` — optional structured estimate
- `status` — GENERATED | ACCEPTED | REJECTED | EXPIRED | SUPERSEDED
- `humanDecisionAt`, `humanDecisionBy`
- `resultingOperationalCommandId` — if user approved an action, link to the Operational Core command that executed it (null if no action)

### Approval boundary

When a recommendation implies an operational change (e.g. create purchase order, adjust par level):

1. User accepts recommendation in UI.
2. Operational Core receives an explicit **command** (e.g. `CreatePurchaseOrderDraft`) — not a silent Intelligence write.
3. Intelligence stores the link `resultingOperationalCommandId`.
4. Audit & Risk may record the decision chain.

Intelligence never auto-executes operational commands in the foundation phase unless a future Product Owner policy explicitly allows it with ADR amendment.

### Data flow

```text
Operational facts (immutable/versioned)
        ↓
Analytics projections (derived, refreshable)
        ↓
Metrics / features / detectors (Intelligence)
        ↓
Recommendations + explanations
        ↓
Human decision
        ↓
Optional: Operational Core command (explicit)
```

### Module placement

- New internal module: **Production Intelligence** (package `packages/intelligence` or domain submodule — exact layout deferred).
- **Analytics** remains separate read-model owner; Intelligence consumes Analytics outputs plus selective fact queries.

## Consequences

### Positive

- Clear sellable boundary for Intelligence features.
- Operational integrity preserved.
- Explainability built into recommendation model.

### Negative / accepted cost

- Extra indirection for “one-click” actions from recommendations.
- Two layers (Analytics + Intelligence) to maintain.

## Rejected alternatives

- **Intelligence writes inventory directly** — rejected; violates single source of truth.
- **Separate microservice for ML** — rejected per ADR-0001; revisit only with new ADR.
- **LLM-as-source-of-truth** — rejected; explanations may use LLM later but not authoritative numbers.

## Unresolved questions

1. Which recommendation types ship in MVP vs later?
2. Auto-execution policies for low-risk recommendations?
3. Real-time vs batch detector scheduling?
4. Tenant data isolation for model training (if any)?

## Validation plan

1. Code review: Intelligence package has no imports that mutate Operational Core repositories.
2. Contract tests: recommendation acceptance produces command DTO, not direct SQL to inventory tables.
3. Product Owner accepts boundary before Intelligence features ship.

## Acceptance

Accepted by Product Owner on **2026-08-30** as part of the foundation correction block. Core rule confirmed: Operational Core alone owns operational truth; Intelligence recommendations that change operations must pass through an explicit Operational Core command.

## Conditions for revisiting

- Regulatory requirement for automated ordering
- Measured need for separate ML runtime that cannot live in monolith
- Product Owner merges Analytics and Intelligence into one module
