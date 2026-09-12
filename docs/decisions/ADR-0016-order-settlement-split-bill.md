# ADR-0016: Order Settlement and Split Bill

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-04
- **Accepted:** 2026-09-12 (PO ACCEPT WITH DELTAS)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, Orders, Payments, ADR-0012 (Accepted), ADR-0013 (Accepted), ADR-0014 (Accepted)

## Context

Split/merge bill, mixed and partial payment are P0 restaurant capabilities. Modeling them as “many Payments hanging on Order” loses Check identity, guest partitions, and fiscal mapping.

## Decision

### Order ≠ Settlement

**Order ≠ Settlement.** Conceptual model:

```text
Order
  → SettlementGroup
  → Check(s)
  → CheckLineAllocation
  → PaymentAllocation
```

| Concept | Role |
| --- | --- |
| `SettlementGroup` | Settlement context for an Order (combined orders within one LegalEntity may be supported later; not required for MVP) |
| `Check` | Bill partition presented for payment |
| `CheckLineAllocation` | Line / guest / amount allocation onto a Check |
| `PaymentAllocation` | Links payment amounts to Check(s) |

Order remains independent of Table (v1.2). Settlement does not require tables.

### Supported capabilities

- split bill;
- partial payment;
- mixed tenders;
- multiple payments;
- multiple Checks from one Order.

### Payment outcome vs allocation

- **Payment provider outcome** and **internal payment allocation** are **distinct** concepts.
- Settlement **completion** depends on **allocated valid payment coverage**, not merely presence of a payment record.

### Deposits / prepayments (ADR-0013)

- External deposits / prepayments may be **referenced / allocated later**.
- They remain **non-custodial** per ADR-0013.
- Must **not** create a MillQ wallet / internal money balance.

### Tips

- Represent tips **separately** from order revenue / payment principal where needed.
- **No** custody of tip funds.
- Tax / accounting treatment is delegated to **JurisdictionProfile** / legal policy (ADR-0012) — not hardcoded here.

### Refund / reversal

- Explicit **compensating history**.
- **No** silent mutation of prior settled / payment records.

### Cross-LegalEntity settlement

- One `SettlementGroup` must **NOT** combine Orders / Checks belonging to **different LegalEntities**.
- Any future cross-entity financial orchestration requires a **separate ADR + legal review**.

### Combined orders (same LegalEntity)

- Combined Orders within **one** LegalEntity may be supported **later**.
- **Not required** for MVP.

### Fiscalization boundary

- Fiscalization consumes settlement outcomes through the ADR-0014 boundary.
- Settlement must **not** embed provider fiscal SDK behavior.

## Consequences

- Orders module coordinates settlement structure; Payments owns Payment / provider-outcome records; Fiscalization owns fiscal documents / submissions.
- Implementation deferred until Orders/Payments vertical; boundary fixed now.
- Aligns with ADR-0013 non-custody and ADR-0014 fiscal immutability / offline status discipline.

## Alternatives considered

- Only Payment rows on Order — rejected as insufficient for split bill / fiscal.
- Settlement inside Fiscalization — rejected.
- Settlement completion = any payment record exists — rejected.
- MillQ wallet for deposits/tips — rejected (ADR-0013).
- Silent mutation of settled/payment history — rejected.
- Cross-LegalEntity SettlementGroup — rejected for this ADR.
- Requiring multi-order SettlementGroup in MVP — rejected.
