# ADR-0011: Migration Architecture

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-04
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, ADR-0008, ADR-0009, ADR-0010, ADR-0015

## Context

KiU must offer a first-class migration path from competitor POS systems (Vietnam start: iPOS.vn, MISA CUKCUK, KiotViet F&B, Sapo FnB). Ad-hoc import scripts create unrepeatable, unaudited onboarding debt.

## Decision

### Migration Core

Pipeline (product capability, not one-off scripts):

```text
Source POS → Source Adapter → Raw/Staging → Normalization
  → Entity Mapping → Validation → Dry Run Report → Import Plan
  → Idempotent Apply → Reconciliation → Migration Report / Audit
```

### Source Adapter

- One adapter per source system; understands **source formats only**.
- Must **not** encode KiU domain business rules.
- Inputs may be API, DB export, Excel/CSV/JSON/XML, proprietary files.
- New sources = new adapters; Migration Core unchanged.

### Staging

External rows never land directly in authoritative domain tables. Staging retains source system, tenant/outlet, job, entity type, external id, original/normalized payloads, validation/mapping/import status, errors.

### Canonical Migration Model

Normalized intermediate types (examples): CanonicalProduct, CanonicalCategory, CanonicalModifier, CanonicalRecipe, CanonicalIngredient, CanonicalStockBalance, CanonicalSupplier, CanonicalCustomer, CanonicalEmployee, CanonicalLoyaltyBalance, CanonicalHistoricalOrder. Version the model.

### External identity mapping

Persist `(source_system, source_tenant, source_outlet?, entity_type, external_id) → kiu_id` for replay, incremental import, reconciliation, temporary parallel operation.

Idempotency key minimum: `source_system + source_tenant + entity_type + external_id` with create/update/skip/conflict strategies.

### Historical import policy (per data class)

| Mode | Meaning |
| --- | --- |
| **A. Full domain import** | Becomes normal KiU domain objects via Core commands |
| **B. Historical read-only archive** | Analytics/view only; not operational ledger |
| **C. Aggregated opening state** | Opening balances / cumulative values only |

Especially careful: historical payments, fiscal docs, accounting entries, closed cash shifts, immutable audit, tax docs, old loyalty txns — choose A/B/C explicitly; default toward B or C for fiscal/payment history.

### Dry run, validation, reconciliation, audit, rollback

- Dry run required before apply.
- Validation: blocking / warning / auto-fixable.
- Reconciliation compares source vs target counts/values.
- `MigrationJob` audit: source, actor, times, status, adapter/mapping versions, warnings/errors, reconciliation.
- Pre-go-live: isolated workspace or `migrationJobId` batch ownership for safe redo. Post-go-live: no casual delete of operational history.

### Migration privacy / regulatory gate

PII and regulated data in migration obey ADR-0015 (vault, residency, egress). Migration must not bypass Privacy Control Plane.

## Consequences

- Onboarding UX “Перейти на KiU” is a product surface over this architecture.
- First concrete adapter may ship later; Core boundaries are fixed now.
- Forbidden: `scripts/import-from-xxx.ts` as the long-term architecture.

## Alternatives considered

- CSV-only manual imports — rejected as sole mechanism.
- Direct write to domain tables from source rows — rejected.
