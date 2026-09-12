# ADR-0019: Economic Facts and Contribution Margin

- **Status:** Proposed (Architecture v1.3)
- **Date:** 2026-09-04
- **Related:** Architecture v1.3, ADR-0003, ADR-0006, CostQuote

## Context

Competitive positioning requires dish contribution margin and channel profit. These must not collapse into mutable `product.cost`.

## Decision

Economic facts are **derived read-side concepts** (Reporting / Finance views), built from operational facts:

| Concept | Notes |
| --- | --- |
| InventoryUnitValuation / CostQuote | ADR-0003 (existing) |
| TheoreticalRecipeCost / ExpectedCOGS / ActualCOGS | Existing cost semantics |
| **ContributionMargin** (per dish / period) | Sale contribution after variable cost basis — certainty required |
| **ChannelProfit** | Profitability by channel (dine-in, Grab, …) |
| SalePrice / GrossMargin / FoodCostRatio | Existing distinctions |

Rules:

- No universal `product.cost` field as SoT.
- Certainty/status required when showing numbers to owners (FINAL / ESTIMATED / UNKNOWN / ORDER_UNRESOLVED as applicable).
- Production Intelligence may recommend using these facts but cannot mutate ledgers (ADR-0006).

## Consequences

- Action Center / owner dashboards consume these read models.
- Implementation after sales + costing verticals exist.

## Alternatives considered

- Store margin on CatalogItem — rejected.
- Intelligence writes margin into operational tables — rejected.
