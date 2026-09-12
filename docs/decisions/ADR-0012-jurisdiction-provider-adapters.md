# ADR-0012: JurisdictionProfile vs Provider Adapters

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-04
- **Related:** Architecture v1.3, ADR-0014, ADR-0015, domain-module-map

## Context

Vietnam and Thailand require different payments, delivery, and fiscal providers. Collapsing all country behavior into one `VietnamAdapter` couples Orders, Fiscalization, Delivery, and Payments incorrectly.

## Decision

Separate:

| Layer | Owns |
| --- | --- |
| **JurisdictionProfile** (versioned) | Jurisdiction policies: rounding, tax classification hooks, fiscal policy refs, residency/egress policy refs, allowed tender categories |
| **Provider adapters** | Concrete integrations: MISA, Viettel, VietQR, GrabFood, ShopeeFood, PromptPay, LINE MAN, … |

```text
Core domains  ←  JurisdictionProfile (config)
              ←  Provider adapters (edge Integrations / Fiscalization)
```

**Forbidden:** giant country adapter that mutates core order/inventory ledgers outside normal Core commands.

Channel connectors (Grab/Shopee) remain Integrations adapters importing/publishing via Core commands (`ImportExternalOrder`, `PushPublication`).

## Consequences

- Adding Thailand does not fork the monolith.
- Fiscal provider implementation can lag architecture boundary (ADR-0014).

## Alternatives considered

- Single `VietnamAdapter` façade — rejected.
- Hard-coded `if (country === 'VN')` in Orders — rejected.
