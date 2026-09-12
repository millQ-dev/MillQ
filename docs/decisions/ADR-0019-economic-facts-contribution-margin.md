# ADR-0019: Economic Facts and Contribution Margin

- **Status:** Accepted (Architecture v1.3)
- **Date:** 2026-09-04
- **Accepted:** 2026-09-12 (PO ACCEPT WITH ECONOMIC TAXONOMY)
- **Decision owners:** Product Owner and System Architect
- **Related:** Architecture v1.3, ADR-0003, ADR-0006, ADR-0012 (JurisdictionProfile), CostQuote

## Context

Competitive positioning requires dish contribution margin and channel economics. These must not collapse into mutable `product.cost` or become Operational Core ledgers.

## Decision

### Nature of economic facts

Economic metrics are **derived / read-side facts** (Reporting / Finance views), built from operational facts. They are **never** Operational Core mutable truth.

- **No** universal `product.cost` field as SoT.
- Production Intelligence may consume these facts but **cannot** mutate ledgers (ADR-0006 / ADR-0020).

### Metric ladder (conceptual)

```text
Gross Sales
  → restaurant-borne discounts / promotions (where applicable)
  → Revenue Basis / Net Sales
  → COGS
  → Gross Profit
  → Direct Variable Selling Costs
  → Contribution Margin
```

- Do **not** hard-code jurisdiction-specific tax treatment into a universal formula.
- Revenue / tax treatment must remain compatible with **JurisdictionProfile** (ADR-0012).

Related named concepts (still derived): InventoryUnitValuation / CostQuote; TheoreticalRecipeCost / ExpectedCOGS / ActualCOGS; ChannelProfit (channel slice of the ladder); SalePrice / GrossMargin / FoodCostRatio distinctions.

### COGS

- Comes from **historical** sale / write-off / effective-recipe costing.
- Uses **CostQuote / history** (ADR-0003).
- **Never** current mutable product cost.

### MVP Direct Variable Cost categories (typed components)

Contribution Margin’s direct variable layer must be capable of representing typed components such as:

- ingredient / recipe COGS;
- order-attributable packaging;
- payment processing fee;
- channel / delivery-platform commission;
- restaurant-borne promotional subsidy not already represented in revenue reduction;
- merchant-paid per-order delivery / courier cost;
- other **explicitly typed** direct per-order cost.

### Excluded from MVP Contribution Margin

Belong to future **Operating Profit / P&L** layers (not MVP CM):

- rent;
- fixed salary / payroll;
- general utilities;
- depreciation;
- SaaS subscriptions;
- office / admin overhead;
- non-attributable general marketing.

Do **not** automatically allocate labor into MVP Contribution Margin. Future labor / unit-economics treatment requires an **explicit** separate decision.

### Certainty / provenance

Every economic **component** preserves:

- source / provenance;
- amount;
- currency;
- certainty.

Derived metric certainty must reflect missing or estimated **material** components.

- **UNKNOWN must not silently become zero.**
- Do **not** present a false exact Contribution Margin when a required material component is UNKNOWN.

### Currency

- **Original currency must be preserved.**
- Any cross-currency consolidated view requires explicit: FX rate; rate source; effective time/date; reporting currency.
- **No silent FX conversion.**

### Owner / Accountant read models

- Owner and Accountant may receive **different read models / views** over the **same** underlying economic facts.
- Do **not** create separate economic truth per persona.

## Consequences

- Action Center / owner / accountant dashboards consume these read models.
- Implementation after sales + costing verticals exist; taxonomy is frozen now.
- ChannelProfit and Food Cost UX must follow this ladder and certainty rules.
- Jurisdiction-specific tax presentation is a JurisdictionProfile concern, not a hardcoded CM formula.

## Alternatives considered

- Store margin on CatalogItem — rejected.
- Intelligence writes margin into operational tables — rejected.
- Universal `product.cost` — rejected.
- Including rent/payroll/overhead in MVP Contribution Margin — rejected.
- Auto-allocating labor into MVP CM — rejected.
- Silent zero for UNKNOWN components — rejected.
- Silent FX conversion — rejected.
- Separate economic SoT per persona — rejected.
