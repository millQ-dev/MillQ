# Domain Module Map (Architecture v1.2)

- **Status:** Accepted reference (Architecture v1.2)
- **Date:** 2026-09-04
- **Supersedes:** provisional Block B–aligned map (2026-08) for boundary naming
- **Authority:** [ADR-0008](../decisions/ADR-0008-domain-boundaries-v1.2.md), [`architecture-v1.2.md`](architecture-v1.2.md)
- **Note:** Origin hosting ADR-0004 is unrelated. Old draft “Block B ADR-0004/0005” names on a draft branch are **not** Accepted MillQ ADRs.

Each row is an internal module boundary inside the **modular monolith**.

Legend:

- **Owns** — source of truth; only this module writes these records
- **Produces** — immutable or versioned facts other modules may consume
- **Depends on** — reads/commands other modules; no circular ownership

---

## Core modules

### Organization & Tenancy

| | |
| --- | --- |
| **Owns** | Tenant; LegalEntity; Brand; Outlet; TerminalGroup; Terminal; Region; Warehouse identity; PackageEntitlement; OutletCapabilityConfig; structural assignments |
| **Does not own** | Menu content, inventory balances, orders, fiscal submissions |
| **Key concepts** | Tenant, Outlet (`tenantId`, `brandId`, `legalEntityId`, `regionId?`), operational inheritance spine Brand→Outlet→TerminalGroup→Terminal |
| **Commands in** | RegisterTenant, CreateOutlet, AssignBrand, PlaceTerminal, SetOutletCapability |
| **Facts out** | OutletConfigured, CapabilityChanged, StructureAssignmentActivated |
| **Depends on** | Jurisdiction (profile refs) |

LegalEntity is fiscal/legal — **not** part of menu inheritance.

### Identity & Access

| | |
| --- | --- |
| **Owns** | Users, credentials, roles, permissions, access grants, sessions/devices |
| **Does not own** | Workforce HR records beyond access, commercial availability |
| **Key concepts** | User, Role, Permission, AccessGrant, Session, AuthorizationPolicy, VisibilityPolicy |
| **Commands in** | Authenticate, GrantAccess, AuthorizeDangerousOperation |
| **Facts out** | AccessGranted, DangerousOperationAuthorized (AUDIT) |
| **Depends on** | Organization (scope targets) |

### Workforce

| | |
| --- | --- |
| **Owns** | Employee profiles, PersonalShift (attendance), employment assignments to outlets |
| **Does not own** | CashShift, POS auth grants (Identity) |
| **Key concepts** | Employee, PersonalShift |
| **Commands in** | AssignEmployee, OpenPersonalShift |
| **Facts out** | PersonalShiftOpened |
| **Depends on** | Organization, Identity |

### Catalog

| | |
| --- | --- |
| **Owns** | CatalogItem identity and attached profiles (Inventory/Sellable/Recipe/Supply/Nutrition/Compliance) |
| **Does not own** | Prices, menu publication, POS layout, supplier SKU/price, stock qty |
| **Key concepts** | CatalogItem, profiles, ProductVariant (identity side) |
| **Commands in** | CreateCatalogItem, AttachProfile, CreateVariant |
| **Facts out** | CatalogItemCreated, ProfileAttached |
| **Depends on** | Units & Packaging, Organization |

### Units & Packaging

| | |
| --- | --- |
| **Owns** | Unit definitions, ItemUnitConversion, SupplierPack definitions used for conversion |
| **Does not own** | Supplier commercial relationship (SupplierItem), inventory balances |
| **Key concepts** | Unit, ItemUnitConversion, SupplierPack |
| **Commands in** | DefineUnit, DefineConversion, DefineSupplierPack |
| **Facts out** | ConversionActivated |
| **Depends on** | Catalog (item refs) |

### Recipes & Costing

| | |
| --- | --- |
| **Owns** | RecipeVersion graph, RecipeLine, RecipeVariantBinding, Preparation specs, materialization mode; **derived** cost revisions / CostQuote artifacts |
| **Does not own** | ProductionBatch stock effects (Inventory), sale prices |
| **Key concepts** | RecipeVersion, RecipeGraphResolver (future), EXPLODE_RECIPE_ON_SALE / CONSUME_FINISHED_ITEM, CostQuote |
| **Commands in** | ActivateRecipeVersion, RecalculateCost (derived) |
| **Facts out** | RecipeVersionActivated, CostRevisionRecorded |
| **Depends on** | Catalog, Units, Inventory facts (read for valuation) |

Costing writes **only derived revisions**, never invents inventory movements (ADR-0003, ADR-0006).

### Menu Configuration

| | |
| --- | --- |
| **Owns** | MenuDefinition, MenuAssignment, AvailabilityRule, PriceRule (list/base), Schedule, MenuPublication, MenuResolver inputs |
| **Does not own** | POS layout, channel overrides, Catalog identity, applied order snapshots |
| **Key concepts** | SalesContext (commercial), MenuResolver, effective-dated rule versions |
| **Commands in** | PublishMenu, ActivateAvailability, ActivatePriceRule |
| **Facts out** | MenuPublished, PriceRuleActivated |
| **Depends on** | Catalog, Organization |

### POS Presentation

| | |
| --- | --- |
| **Owns** | MenuLayout, MenuPage, MenuSlot, LayoutAssignment |
| **Does not own** | Resolved commercial availability/price (Menu Configuration) |
| **Key concepts** | Layout for a TerminalGroup/Terminal |
| **Commands in** | PublishLayout |
| **Facts out** | LayoutPublished |
| **Depends on** | Menu Configuration, Organization |

### Orders

| | |
| --- | --- |
| **Owns** | Order, OrderLine, modifiers on lines, commercial snapshots, lifecycle; optional TableAssignment |
| **Does not own** | Payments, kitchen ticket state, inventory movements |
| **Key concepts** | Order (table optional), OrderLine snapshot (product, variant, recipe version, price, modifiers) |
| **Commands in** | OpenOrder, AddLine, CancelOrder, SendToProduction |
| **Facts out** | OrderOpened, OrderItemAdded, OrderCancelled, OrderPaid (signal; payment owned by Payments) |
| **Depends on** | Menu/Pricing resolvers, Catalog, Organization, Identity |

### Payments

| | |
| --- | --- |
| **Owns** | Payment/refund transactions; TenderDefinition registry |
| **Does not own** | Order lines, cash drawer sessions |
| **Key concepts** | TenderDefinition (category, provider, settlement, fiscal mapping, policies), Payment |
| **Commands in** | RecordPayment, RecordRefund |
| **Facts out** | PaymentRecorded |
| **Depends on** | Orders, Organization |

### Cash Management

| | |
| --- | --- |
| **Owns** | CashShift lifecycle (OPEN → CLOSED → RECONCILED → ACCEPTED), tender reconciliation, cash in/out |
| **Does not own** | PersonalShift (Workforce), card/QR settlement details beyond drawer |
| **Key concepts** | CashShift, acceptedBy/acceptedAt, ExpectedVsActual tender |
| **Commands in** | OpenCashShift, CloseCashShift, AcceptReconciliation |
| **Facts out** | CashShiftOpened, CashShiftAccepted |
| **Depends on** | Identity, Organization, Payments (refs) |

### Inventory

| | |
| --- | --- |
| **Owns** | InventoryMovement, balances (projection), ProductionBatch stock effects, StockAdjustment, count posting effects |
| **Does not own** | Purchasing source documents (GoodsReceipt header lives with Purchasing posting coordination — see Block C contract), derived unit cost |
| **Key concepts** | InventoryMovement, warehouse stock projection, explain-balance chain |
| **Commands in** | ApplyPostedMovements, AdjustStock, CompleteProductionBatch |
| **Facts out** | InventoryAdjusted, InventoryConsumed, PreparationProduced |
| **Depends on** | Catalog, Units, Recipes (expansion rules), Organization |

### Production Routing

| | |
| --- | --- |
| **Owns** | ProductionRoute versions, stations, OutputEndpoint bindings, routing snapshots at send |
| **Does not own** | Order content, recipe definitions |
| **Key concepts** | ProductionRoute, ProductionStation, KDS/Printer/Assembly/External endpoints |
| **Commands in** | ActivateRoute, RouteOrderItems |
| **Facts out** | RouteActivated, ItemsRouted |
| **Depends on** | Orders, Catalog, Organization |

### Integrations

| | |
| --- | --- |
| **Owns** | Provider adapters, external IDs, sync cursors, inbound/outbound integration payloads |
| **Does not own** | Core orders/inventory ledgers |
| **Key concepts** | IntegrationConnector, ExternalOrderLink |
| **Commands in** | ImportExternalOrder, PushPublication |
| **Facts out** | INTEGRATION facts (e.g. GrabOrderImported) |
| **Depends on** | Orders, Channel Menu, Organization |

### Audit & Risk

| | |
| --- | --- |
| **Owns** | Append-only audit evidence, risk cases, actor vs authorizer distinction |
| **Does not own** | Business aggregates being audited |
| **Key concepts** | AuditRecord, RiskSignal, EvidenceBundle refs |
| **Commands in** | RecordAudit, OpenRiskCase |
| **Facts out** | AUDIT events |
| **Depends on** | All (references) |

### Fiscalization

| | |
| --- | --- |
| **Owns** | Jurisdiction fiscal adapters, submission records, fiscal mapping config |
| **Does not own** | LegalEntity master data beyond fiscal binding |
| **Key concepts** | FiscalDocument, Adapter |
| **Commands in** | SubmitFiscal (jurisdiction-specific; Vietnam deferred research) |
| **Facts out** | FiscalSubmitted |
| **Depends on** | Organization (LegalEntity), Payments/Orders |

### Reporting

| | |
| --- | --- |
| **Owns** | Read models, aggregates, report definitions |
| **Does not own** | Source ledgers |
| **Key concepts** | Projection, KpiSnapshot |
| **Depends on** | Fact feed, module facts (read) |

---

## Extensible modules (boundaries only until scheduled)

| Module | Owns (when built) | Notes |
| --- | --- | --- |
| **Channel Menu** | ChannelMenu, overrides, publications | Separate from POS layout |
| **Procurement** | PurchaseOrder, GoodsReceipt source docs | Posts into Inventory movements |
| **Supplier Management** | Supplier, SupplierItem | ADR-0009 |
| **Finance / Management Ledger** | Management accounting views | Not POS cash |
| **Customer & Consent** | Customer, consent | |
| **Promotions** | PromotionRule, StackingPolicy | ≠ PriceRule |
| **Loyalty** | LoyaltyRule | ≠ Promotion |
| **Delivery** | Fulfillment tasks | |
| **Central Production** | Multi-outlet production plans | |
| **Operational / Production Intelligence** | Recommendations, EvidenceBundle | ADR-0006 |

**Procurement** is the purchasing vertical for Block C (GoodsReceipt). Named distinctly from Supplier Management master data.

---

## Dependency direction (summary)

```text
Organization & Tenancy, Jurisdiction
        ↓
Catalog, Units & Packaging, Supplier Management
        ↓
Recipes & Costing (derived), Menu Configuration, POS Presentation, Channel Menu
        ↓
Procurement ──posts──► Inventory
        ↓
Orders → Production Routing, Payments, Cash Management, Delivery
        ↓
Reporting, Production Intelligence (read-only + recommendations)
```

Audit observes all. Integrations and Fiscalization at the edge.

---

## Explicit non-goals in this map

- Implementing all modules now
- Microservices split
- Central event store as SoT
- Universal rules DSL
