# ADR-0012: JurisdictionProfile vs Provider Adapters

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-04
- **Accepted:** 2026-09-12 (PO ACCEPT WITH CLARIFICATION)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, ADR-0008, ADR-0014, ADR-0015, domain-module-map

## Context

Vietnam and Thailand require different payments, delivery, and fiscal providers. Collapsing all country behavior into one `VietnamAdapter` couples Orders, Fiscalization, Delivery, and Payments incorrectly.

## Decision

### Separation of layers

| Layer | Owns |
| --- | --- |
| **JurisdictionProfile** | **Policy only** — not provider implementation. Rounding, tax classification hooks, fiscal policy refs, residency/egress policy refs, allowed tender categories, and related jurisdiction rules |
| **Provider adapters** | Concrete integrations selected **separately by capability** (fiscal / payment / channel / delivery / …): MISA, Viettel, VietQR, GrabFood, ShopeeFood, PromptPay, LINE MAN, … |

```text
Core domains  ←  JurisdictionProfile (policy / config)
              ←  Provider adapters (edge Integrations / Fiscalization / Payments)
```

**JurisdictionProfile is policy, not provider implementation.**

### Ownership and inheritance

- **Primary jurisdiction ownership** is the **LegalEntity** (economic / legal boundary), not Brand, Outlet UI, or a provider.
- **JurisdictionProfile is versioned and effective-dated.**
- Historical business and fiscal documents **retain the profile/version applicable at their business time** (no silent rewrite of past jurisdiction semantics).
- A restaurant **Location (Outlet)** normally **inherits** its LegalEntity’s jurisdiction profile.
- **Location-level jurisdiction override is NOT a generic capability.** Any such override requires a **separate explicit architecture decision** — not implied by accepting this ADR.

### Provider selection

- Provider adapters are chosen **per capability**, independently of the JurisdictionProfile policy layer.
- **Changing a provider must not change Operational Core domain semantics** (orders, inventory, payments records remain Core-owned; adapters stay at the edge).
- **Forbidden:** giant `VietnamAdapter` (or any country façade) that mutates core order/inventory ledgers outside normal Core commands.

Channel connectors (Grab/Shopee) remain Integrations adapters importing/publishing via Core commands (`ImportExternalOrder`, `PushPublication`).

## Consequences

- Adding Thailand does not fork the monolith.
- Fiscal/payment/channel provider implementation can lag architecture boundaries (ADR-0014 and related).
- Outlet-level jurisdiction exceptions stay closed until a dedicated decision exists.

## Alternatives considered

- Single `VietnamAdapter` façade — rejected.
- Hard-coded `if (country === 'VN')` in Orders — rejected.
- Generic per-Location jurisdiction override as MVP capability — rejected (requires separate ADR if ever needed).
- Binding Core domain semantics to a specific provider — rejected.
