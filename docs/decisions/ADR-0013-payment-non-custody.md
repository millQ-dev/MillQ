# ADR-0013: Payment Non-Custody Boundary

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-04
- **Related:** Architecture v1.3, Payments module, ADR-0014, ADR-0016

## Context

Restaurant POS systems record tenders. Becoming a payment intermediary or custodian of merchant/customer funds creates regulatory and operational scope MillQ must not enter on MVP.

## Decision

**Hard boundary:**

- MillQ does **not** store merchant funds or customer funds.
- MillQ does **not** act as a payment intermediary / money transmitter on MVP.
- Payments module records **outcomes and allocations** of external providers and cash-drawer events (`TenderDefinition`, `Payment`, `PaymentAllocation`).
- Provider settlement happens at the payment provider / acquirer; MillQ stores references, statuses, and reconciliation evidence.

Cash in drawer remains Cash Management documents (in/out), not a MillQ wallet balance of customer money.

## Consequences

- Architecture must not introduce customer wallet ledgers or merchant balance accounts as Core SoT for MVP.
- QR/card flows are adapter + Payment records.

## Alternatives considered

- In-app wallet / escrow — rejected for MVP.
- MillQ as payment aggregator — rejected for MVP.
