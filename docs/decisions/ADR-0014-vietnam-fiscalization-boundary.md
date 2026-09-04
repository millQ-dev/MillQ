# ADR-0014: Vietnam Fiscalization Architecture Boundary

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-04
- **Related:** Architecture v1.3, ADR-0012, ADR-0013, ADR-0016, Fiscalization module

## Context

Vietnam e-invoice / fiscal compliance is a market P0. Treating fiscalization as “implement later after research” without an architecture boundary invites fiscal logic into Orders/Payments and blocks safe offline design.

## Decision

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
- Correction / cancellation chains (compensating fiscal documents — not silent edit)
- Provider adapter **interface**
- Idempotency keys and reconciliation against provider/status

Fiscalization **does not** own Order or Payment SoT; it consumes settlement/payment outcomes and emits fiscal submissions.

Do **not** invent Vietnam statute text, tax rates, or mandatory provider choice in this ADR.

Offline: queue fiscal submissions; never fabricate successful government acceptance offline (see ADR-0018 / offline-foundation).

## Consequences

- Settlement/split bill (ADR-0016) must define how Checks map to fiscal documents without embedding provider SDKs in Orders.
- Architecture acceptance ≠ permission to go live fiscally in Vietnam.

## Alternatives considered

- Defer entire fiscal topic until provider chosen — rejected (boundary now).
- Fiscal fields on Order row as SoT — rejected.
