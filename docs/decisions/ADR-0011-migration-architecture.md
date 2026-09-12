# ADR-0011: Migration Architecture

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-04
- **Accepted:** 2026-09-12 (PO ACCEPT WITH DELTAS)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, ADR-0003, ADR-0008, ADR-0009, ADR-0010, ADR-0015 (Accepted)

## Context

KiU must offer a first-class migration path from competitor POS systems (Vietnam start: iPOS.vn, MISA CUKCUK, KiotViet F&B, Sapo FnB). Ad-hoc import scripts create unrepeatable, unaudited onboarding debt.

## Decision

### 1. Migration pipeline

```text
Source Adapter
  → Staging
  → Normalize
  → Map
  → Validate
  → Dry-run
  → Idempotent Apply
  → Reconcile
  → Audit
```

- Migration must **not** write directly into Operational Core storage tables.
- Application of accepted data must cross **normal domain / import command** boundaries.

### 2. Adapter framework

- Migration uses **extensible source adapters**.
- Architecture should support adapters for major Vietnam F&B POS sources such as: **iPOS.vn**, **MISA CUKCUK**, **KiotViet F&B**, **Sapo FnB**, and future POS systems.
- Do **not** freeze the first implemented adapter in this ADR.
- Do **not** put source-specific branching inside Operational Core.
- One adapter per source system; understands **source formats only**; must **not** encode KiU domain business rules.
- Inputs may be API, DB export, Excel/CSV/JSON/XML, proprietary files.
- New sources = new adapters; Migration Core unchanged.

### 3. Import modes

Distinguish conceptually (separate risk / validation modes):

| Mode | Name |
| --- | --- |
| **A** | **Master Data** migration |
| **B** | **Opening State / Cutover** migration |
| **C** | **Historical Transaction** migration |

Do **not** assume every source supports all modes.

Within mode C (and related historical classes), choose carefully how fiscal/payment/loyalty history lands (e.g. operational replay vs read-only archive vs aggregated opening) — default toward non-ledger forms for fiscal/payment history where uncertain.

### 4. Staging

- All imported source data must first enter a **migration-owned staging** boundary.
- Staging preserves: original source payload / reference; source identifiers; mapping state; validation issues; rejected / skipped records.
- Staging data is **not** Operational Core truth.

Normalized intermediate types (versioned canonical model examples): CanonicalProduct, CanonicalCategory, CanonicalModifier, CanonicalRecipe, CanonicalIngredient, CanonicalStockBalance, CanonicalSupplier, CanonicalCustomer, CanonicalEmployee, CanonicalLoyaltyBalance, CanonicalHistoricalOrder.

### 5. Source identity / provenance

Imported entities must preserve provenance equivalent to:

- `sourceSystem`;
- source account / tenant where applicable;
- `sourceEntityType`;
- `sourceEntityId`;
- `migrationRunId`;
- mapping / version context.

Persist mapping `(source_system, source_tenant, source_outlet?, entity_type, external_id) → kiu_id` for replay, incremental import, reconciliation, temporary parallel operation.

### 6. Idempotency

- Migration apply must be **idempotent**.
- Exact retries must **not** duplicate Core entities / facts.
- Semantic mismatch against a previously applied source identity must surface as an **explicit conflict**.

### 7. Catalog / unit / package mapping

- Migration must respect **ADR-0009** and measurement invariants.
- Do **not** flatten supplier packages or variable-weight semantics into incorrect base units.
- Map stock item, base unit, supplier pack, and variable weight / count conversions through **normal domain concepts**.

### 8. Recipes

- Recipe import must use Recipe / Catalog domain boundaries.
- Do **not** import mutable `product.cost`.
- Recipe versions and preparation semantics must remain compatible with accepted architecture (ADR-0003 / Catalog).
- Historical sales must **not** be recalculated merely because a newer imported recipe version exists.

### 9. Inventory / costing

- Migration must **not** create `product.cost` truth.
- Opening State import may introduce explicitly typed opening: quantity; valuation currency; opening cost basis; provenance — through a dedicated import boundary compatible with **ADR-0003**.
- Historical transaction import, where supported, must obey: business chronology; replay semantics; immutable historical facts; costing rules.
- Do **not** use upload order as economic chronology.

### 10. Privacy / security

- ADR-0011 **explicitly depends on ADR-0015**.
- Migration staging and imported PII require policy for: minimization; access; retention; deletion; egress; audit.
- Migration must not bypass the Privacy Control Plane / vault / egress rules.

### 11. Target scope

Every `MigrationRun` targets an explicit:

- Tenant / Business Group;
- LegalEntity where applicable;
- Location / Warehouse scope where applicable.

Migration must **not** silently cross independent tenant / legal-entity boundaries.

### 12. Cutover lifecycle

Architecture must support explicit phases equivalent to:

- prepare;
- dry-run;
- validated;
- cutover-ready;
- applying;
- reconciling;
- completed / failed.

Exact enum may remain implementation-later.

### 13. Reconciliation

Migration completion requires a **reconciliation result** able to report:

- source vs target counts;
- mapped / unmapped / skipped records;
- stock quantities;
- valuation totals where applicable;
- sales totals where historical import applies;
- exceptions / conflicts.

### 14. Parallel run

- Parallel / repeated pre-cutover migration may be supported where the source adapter allows it.
- Do **not** make a specific parallel-run duration an architecture invariant.

### 15. Rollback / correction

- **Before apply:** staging / dry-run may be discarded safely.
- **After Core apply:** do **not** rely on destructive delete-based rollback of operational truth; use correction / compensating mechanisms or disposable pre-production target environments where appropriate.

### 16. Acceptance scope

ADR-0011 acceptance freezes **migration boundaries / invariants only**. It does **NOT** mean:

- any source adapter implemented;
- iPOS / MISA / KiotViet / Sapo integration complete;
- migration UI complete;
- historical import universally supported;
- cutover tooling implemented.

## Consequences

- Onboarding UX “Перейти на KiU” is a product surface over this architecture.
- First concrete adapter may ship later; Core boundaries are fixed now.
- Forbidden: `scripts/import-from-xxx.ts` as the long-term architecture.

## Alternatives considered

- CSV-only manual imports — rejected as sole mechanism.
- Direct write to domain tables from source rows — rejected.
- Source-specific branching inside Operational Core — rejected.
- Freezing the first adapter as architecture invariant — rejected.
- Importing mutable `product.cost` — rejected.
- Destructive delete rollback of applied Core history — rejected.
- Silent cross-tenant / cross-LE migration — rejected.
- Upload order as economic chronology — rejected.
