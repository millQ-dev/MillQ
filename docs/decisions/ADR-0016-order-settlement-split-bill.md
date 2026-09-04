# ADR-0016: Order Settlement and Split Bill

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-04
- **Related:** Architecture v1.3, Orders, Payments, ADR-0013, ADR-0014

## Context

Split/merge bill, mixed and partial payment are P0 restaurant capabilities. Modeling them as “many Payments hanging on Order” loses Check identity, guest partitions, and fiscal mapping.

## Decision

Introduce settlement concepts:

| Concept | Role |
| --- | --- |
| `SettlementGroup` | Settlement context for an Order (or combined orders when product allows) |
| `Check` | Bill partition presented for payment |
| `CheckLineAllocation` | Line / guest / amount allocation onto a Check |
| `PaymentAllocation` | Links `Payment` amounts to Check(s) |

Capabilities:

- split by order lines;
- split by guests;
- mixed tenders;
- partial payment;
- interaction with FiscalDocument generation per jurisdiction policy (ADR-0014) without Orders owning fiscal provider SDKs.

Order remains independent of Table (v1.2). Settlement does not require tables.

Payments remain non-custodial (ADR-0013).

## Consequences

- Orders module coordinates settlement structure; Payments owns Payment records; Fiscalization owns fiscal submissions.
- Implementation deferred until Orders/Payments vertical; boundary fixed now.

## Alternatives considered

- Only Payment rows on Order — rejected as insufficient for split bill / fiscal.
- Settlement inside Fiscalization — rejected.
