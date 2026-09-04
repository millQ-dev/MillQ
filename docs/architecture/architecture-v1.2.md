# MillQ Architecture v1.2

- **Status:** Accepted architectural baseline (Product Owner, 2026-09-04)
- **Canonical host:** Cursor Origin
- **Related ADRs:** [ADR-0008](../decisions/ADR-0008-domain-boundaries-v1.2.md), [ADR-0009](../decisions/ADR-0009-catalog-units-supplier-item.md), [ADR-0010](../decisions/ADR-0010-document-posting-correction.md), plus Accepted ADR-0001…0004, 0006, 0007
- **Module map:** [`domain-module-map.md`](domain-module-map.md)
- **Next vertical:** [`block-c-goods-received-contract.md`](block-c-goods-received-contract.md)

## 1. Purpose

Architecture v1.2 freezes **domain boundaries and conceptual models** before Block C and later application verticals. It is informed by reverse engineering of iiko and restaurant practice, but:

```text
Observed in iiko ≠ Must be copied into MillQ
```

Preserve business invariants with the simplest model compatible with the modular monolith.

## 2. Non-negotiable foundation (unchanged)

| Topic | Decision |
| --- | --- |
| Style | Modular monolith, one deployable backend |
| Stack | TypeScript monorepo, Fastify, React/Vite, PostgreSQL, Zod, decimal.js, Vitest, plain SQL migrations (foundation) |
| Hosting | Origin SoT; GitHub backup only (ADR-0004) |
| Measurement | ADR-0002 Money / Quantity / units |
| Costing / yield | ADR-0003 moving average, VIRTUAL vs STOCK_TRACKED, chronology |
| Intelligence | ADR-0006 read-side recommendations only |
| Fact feed | `operational_fact_feed` = immutable evidence/integration feed — **not** a central ledger |

Do **not** introduce: microservices, Kafka, global event bus, event-sourcing core, CQRS framework, universal rule engine, premature ORM.

## 3. Network-first organization

Even a single restaurant exists inside a **Tenant**.

**Not** a rigid ownership tree for commerce:

```text
Tenant → LegalEntity → Brand → Restaurant   ← do not use as menu/inheritance spine
```

### Dimensions (membership / assignment)

```text
Tenant
├── LegalEntities[]
├── Brands[]
├── Outlets[]
└── Users[]
```

Outlet carries references:

```text
Outlet
- tenantId
- brandId
- legalEntityId
- regionId?
```

### Operational inheritance hierarchy (configuration)

```text
Tenant → Brand → Outlet → TerminalGroup → Terminal
```

May inherit: menu, pricing, availability, POS layout, production routing, operational config.

**LegalEntity does not inherit menu.** It owns fiscalization, contracts, bank accounts, accounting, taxes.

## 4. Packages vs capabilities

Corner / Cafe / Restaurant are **not** separate products.

```text
PackageEntitlement     — what the tariff allows
OutletCapabilityConfig — what this outlet enabled
```

Forbidden pattern: scattered `if (package === 'corner')` across the codebase.

Tables are an **optional capability**, not a hard schema requirement for Orders.

## 5. Separation of commercial surfaces

| Layer | Question | Examples |
| --- | --- | --- |
| **Catalog** | What exists? | CatalogItem + profiles |
| **Menu Configuration** | What can be sold where/when/at what price? | MenuDefinition, AvailabilityRule, PriceRule, MenuPublication |
| **POS Presentation** | How does POS show the resolved menu? | MenuLayout, MenuPage, MenuSlot |
| **Channel Menu** | How is assortment published externally? | Grab, QR, kiosk, website |

Do **not** put on CatalogItem: `buttonColor`, `menuPosition`, `grabName`, `availableFrom`, `terminalPage`.

## 6. Catalog composition

```text
CatalogItem
├── InventoryProfile?
├── SellableProfile?
├── RecipeProfile?
├── SupplyProfile?
├── NutritionProfile?
└── ComplianceProfile?
```

Not a single giant polymorphic row with dozens of nullables. Not “StockItem only”.

## 7. Units, packaging, suppliers

Separate subdomain: **Units & Packaging** + **Supplier Management** relationship.

```text
Unit / ItemUnitConversion / SupplierPack
Supplier → SupplierItem → catalogItemId + supplierPack + price + validity
```

Inventory ledger uses **normalized base quantities**. Source documents keep **actual supplier packaging**.

Do **not** embed `supplierSku` / `supplierPrice` / `supplierPackage` on CatalogItem.

## 8. Recipes as a graph

```text
RecipeVersion → RecipeLine → CatalogItem → RecipeVersion?
```

Requires future `RecipeGraphResolver`: recursive expansion, cycle detection, effective dates, yield, cold/hot loss, historical reproduction. Cycles forbidden.

Published recipes change via **new RecipeVersion**, not in-place mutation.

Consumption strategy (aligned with ADR-0003):

| Mode | Sale write-off |
| --- | --- |
| `EXPLODE_RECIPE_ON_SALE` / VIRTUAL | Expand to stock-tracked leaves |
| `CONSUME_FINISHED_ITEM` / STOCK_TRACKED | Consume finished/prep stock only |

**Invariant:** one physical consumption must not hit inventory twice.

## 9. Cost semantics

**Forbidden:** universal `product.cost`.

Distinguish at least: SupplierPurchasePrice, InventoryUnitValuation, TheoreticalRecipeCost, ExpectedCOGS, ActualCOGS, SalePrice, GrossMargin, FoodCostRatio — plus certainty (ADR-0003: FINAL / ESTIMATED_FROM_LAST_KNOWN / UNKNOWN / ORDER_UNRESOLVED).

Conceptual `CostQuote` carries amount, currency, basis, asOf, confidence/status. Production Intelligence must not present estimated cost as established fact.

## 10. SalesContext + resolvers

```text
SalesContext
- tenant, brand, outlet, terminalGroup, terminal
- serviceMode, orderChannel, businessDateTime
```

Employee role/permission is **not** part of SalesContext — use separate AuthorizationPolicy / VisibilityPolicy.

Specialized resolvers (no universal rules DSL): Availability, Pricing, Promotion, ProductionRouting, Authorization, Loyalty (later).

**Pricing ≠ Promotions ≠ Loyalty.**

## 11. Orders and tables

`Order` exists independently. Table assignment is optional. Schema must not require `table_id NOT NULL`.

OrderLine stores historically significant resolved snapshot (product, variant, recipe version, price, modifiers, commercial/tax classification where applicable).

## 12. Production routing

Not `dish → printer` or even `dish → kitchen` alone.

```text
ProductionRoute (versioned, condition) → ProductionStation → OutputEndpoint[]
```

Endpoints: KDS, Printer, AssemblyScreen, ExternalDevice. Execution stores routing snapshot/version at send time.

Modifiers may affect `priceDelta`, `recipeDelta`, and `routingOverride` together.

## 13. Inventory documents vs movements

```text
Typed InventoryDocument (aggregate)  →  posts  →  InventoryMovement[]
Stock balance = projection of movements
```

Typed aggregates (not one polymorphic document with 50 nullables): GoodsReceipt, GoodsIssue, StockTransfer, ProductionBatch/Document, InventoryCountSession, StockAdjustment, SupplierReturn.

Posting lifecycle: **DRAFT → POSTED → REVERSED/CORRECTED**. No silent edit after POSTED. See ADR-0010.

## 14. Event taxonomy

```text
DOMAIN | AUDIT | INTEGRATION | TELEMETRY
```

Transactional outbox only for integrations / offline sync / durable async side effects — not for every internal call.

## 15. Audit

Append-only evidence with conceptual distinction: `actor` vs `authorizer?`, aggregate, action, reason, before/after, correlationId, source, riskLevel, occurredAt.

## 16. UX constraints on architecture

Architecture must not block: Role Workspaces, progressive disclosure, professional high-density tables, long-running jobs with progress, posting preview before financially significant POST.

## 17. Deferred implementation

All of the above are **boundaries and contracts**. Implementation of Catalog profiles, MenuResolver, POS, loyalty, delivery connectors, Management Ledger, offline sync protocol, ORM choice remain deferred until their verticals.

## 18. Work sequence after this alignment

```text
Architecture v1.2 (Accepted)
        ↓
Block C — GoodsReceived / Inventory vertical — MERGED
        ↓
Architecture v1.3 alignment (Proposed) — see architecture-v1.3.md
        ↓
Later verticals only after v1.3 acceptance (PO launch)
```

Former “accept Block B ADRs first” draft numbering is superseded by Architecture v1.2 + ADR-0008…0010 for boundaries. Remaining open product questions from old Block B drafts may still need PO answers, but they no longer block documenting the v1.2 model.
