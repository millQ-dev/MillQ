# ADR-0013: Payment Non-Custody Boundary

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-04
- **Accepted:** 2026-09-12 (PO ACCEPT WITH MVP BOUNDARY)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, Payments module, ADR-0014, ADR-0016

## Context

Restaurant POS systems record tenders. Becoming a payment intermediary or custodian of merchant/customer funds creates regulatory and operational scope MillQ must not enter on MVP.

## Decision

### MVP non-custodial freeze

- **MillQ MVP is non-custodial.**
- MillQ does **not** hold merchant funds or customer funds.
- MillQ does **not** provide a **wallet** or **internal money balance** as product SoT.
- MillQ does **not** act as a payment intermediary / money transmitter on MVP.
- Payments module records **provider outcomes, allocations, reconciliation evidence, and references only** (`TenderDefinition`, `Payment`, `PaymentAllocation`, statuses, external refs).
- Provider settlement happens at the payment provider / acquirer / merchant account; MillQ does not custody those funds.

Cash in drawer remains Cash Management documents (in/out), not a MillQ wallet balance of customer money.

### Explicitly in / out of MVP scope

| Topic | MVP stance |
| --- | --- |
| **Tips** | May be represented/accounted as **payment allocation**. MillQ does **not** custody tip funds. |
| **Deposits / prepayments** | May be **recorded** when funds are received through an **external** provider / merchant account. **No** MillQ-held balance. |
| **Gift cards / stored-value instruments** | **OUT OF SCOPE** pending a **separate ADR + legal/accounting** decision. |
| **Marketplace settlement / collecting funds for later distribution** | **OUT OF SCOPE** pending a **separate ADR + legal** review. |

## Consequences

- Architecture must not introduce customer wallet ledgers or merchant balance accounts as Core SoT for MVP.
- QR/card flows are adapter + Payment records.
- Tips/deposits modeling must not smuggle custody or internal balances.
- Gift cards and marketplace collection require future ADRs before design or implementation.

## Alternatives considered

- In-app wallet / escrow — rejected for MVP.
- MillQ as payment aggregator / marketplace collector — rejected for MVP (separate ADR if ever revisited).
- Gift cards as MVP Payments feature — rejected (separate ADR/legal/accounting).
