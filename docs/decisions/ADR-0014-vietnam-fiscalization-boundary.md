# ADR-0014: Vietnam Fiscalization Architecture Boundary

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-04
- **Accepted:** 2026-09-12 (PO ACCEPT WITH DELTAS)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, ADR-0012 (Accepted), ADR-0013 (Accepted), ADR-0016, ADR-0018, Fiscalization module

## Context

Vietnam e-invoice / fiscal compliance is a market P0. Treating fiscalization as “implement later after research” without an architecture boundary invites fiscal logic into Orders/Payments and blocks safe offline design.

## Decision

### Dedicated domain boundary

Fiscalization is a **dedicated domain boundary**. Pipeline:

```text
Settlement / business outcome
  → Fiscal Policy evaluation
  → FiscalDocument
  → FiscalSubmission
  → ProviderAdapter
  → Provider response / status
  → Audit
```

### Three layers (do not conflate)

| Layer | Timing |
| --- | --- |
| **Architecture boundary** | **Now** |
| **Provider adapter implementation** (MISA, Viettel, …) | Later |
| **Legal production clearance** | **LEGAL GATE G2** (separate) |

### Concepts owned by Fiscalization module

- `FiscalPolicy` (jurisdiction-bound, versioned)
- `FiscalSeries`
- `FiscalDocument`
- `FiscalSubmission`
- Correction / cancellation / replacement chains (compensating fiscal documents — not silent edit)
- Provider adapter **interface**
- Idempotency keys and reconciliation against provider/status

### What Fiscalization does NOT own

Fiscalization does **not** own:

- Order truth;
- Payment truth;
- Inventory truth.

It consumes settlement / payment outcomes and emits fiscal documents and submissions.

### Order ≠ FiscalDocument

- **Order ≠ FiscalDocument.**
- Cardinality must support: split settlement; partial settlement; corrections; refunds / reversals; **multiple** fiscal documents where policy requires.

### Immutability and corrections

- Fiscal documents are **immutable historical records**.
- Corrections create **explicit correction / replacement chains**.
- Do **not** mutate prior accepted fiscal history in place.

### Provider adapters

- Provider adapters are **capability-specific and replaceable** (ADR-0012).
- **No** provider SDK logic inside Orders or Settlement.

### Offline

- Business operation may complete according to offline policy.
- Fiscal submission may **queue**.
- System must distinguish statuses such as: **PENDING / QUEUED / SUBMITTED / ACCEPTED / REJECTED** (and equivalents as appropriate).
- **Never fabricate** provider acceptance while offline (aligns with ADR-0018 / offline-foundation).

### Jurisdiction / policy versioning

- **JurisdictionProfile** determines the applicable fiscal policy / version (ADR-0012).
- Historical fiscal behavior must remain traceable to the policy / version **effective at the relevant business time**.

### Legal gate

- Architecture acceptance is **NOT** legal approval.
- Specific Vietnam document types, required fields, deadlines, correction rules, and providers remain **LEGAL GATE** items.
- Do **not** invent Vietnam statute text, tax rates, or mandatory provider choice in this ADR.

## Consequences

- Settlement (ADR-0016) maps Checks / settlement outcomes to fiscal documents without embedding provider SDKs.
- Architecture acceptance ≠ permission to go live fiscally in Vietnam.

## Alternatives considered

- Defer entire fiscal topic until provider chosen — rejected (boundary now).
- Fiscal fields on Order row as SoT — rejected.
- Mutating accepted fiscal history in place — rejected.
- Provider SDK inside Orders/Settlement — rejected.
- Fabricating offline provider acceptance — rejected.
