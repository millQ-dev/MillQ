# Domain Module Map

- **Status:** Foundation reference (provisional alignment with Block B proposal)
- **Date:** 2026-08-19
- **Updated:** 2026-08-30
- **Block B:** domain-boundary ADRs remain **Proposed** on the draft Block B branch (historically labeled ADR-0004/0005 there — **not** the same document as Accepted Origin hosting [ADR-0004](../decisions/ADR-0004-origin-source-of-truth.md)). This map **anticipates** that proposal; it does **not** accept Block B Product Owner decisions.
- **Aligns with:** Operational Core + Production Intelligence model ([ADR-0006 Accepted](../decisions/ADR-0006-production-intelligence-boundary.md))

Implementation must not hard-code unresolved Block B Product Owner decisions before that review is complete.

Each row is an internal module boundary inside the **modular monolith** (one deployable application, strict internal ownership).

Legend:

- **Owns** — source of truth; only this module writes these records
- **Produces** — immutable or versioned facts/events other modules may consume
- **Depends on** — reads or commands other modules; no circular ownership

## Module reference

### Identity & Access

| | |
| --- | --- |
| **Owns** | Users, employee profiles (minimal), roles, permissions, access grants, session/device registration metadata |
| **Does not own** | Business structure, orders, inventory, recommendations |
| **Key concepts** | User, Employee, Role, Permission, AccessGrant, Session |
| **Commands in** | Authenticate, GrantAccess, RevokeAccess, AssignRole |
| **Facts out** | AccessGranted, AccessRevoked, DangerousOperationAttempted (with Audit & Risk) |
| **Depends on** | Business Structure (scope targets), Jurisdiction (policy references) |

### Organization (Business Structure)

| | |
| --- | --- |
| **Owns** | BusinessGroup, Organization, LegalEntity, ManagementEntity, Brand, RestaurantLocation, Department, Warehouse identity, Terminal identity, effective-dated structural relationships |
| **Does not own** | Inventory balances, orders, payments, menu content |
| **Key concepts** | BusinessGroup, LegalEntity, RestaurantLocation, Warehouse, Terminal, OwnershipInterest, LegalOperatorAssignment |
| **Commands in** | RegisterEntity, AssignOperator, AssignBrand, PlaceTerminal |
| **Facts out** | StructureRelationshipActivated, StructureRelationshipEnded |
| **Depends on** | Jurisdiction (profile references) |

### Jurisdiction

| | |
| --- | --- |
| **Owns** | JurisdictionProfile versions, default currency, rounding policy references, capability flags, adapter registry metadata |
| **Does not own** | Legal entities, operational transactions, fiscal submission payloads |
| **Key concepts** | JurisdictionProfile, RoundingPolicyRef, CurrencyDefault |
| **Commands in** | PublishJurisdictionVersion |
| **Facts out** | JurisdictionVersionActivated |
| **Depends on** | None (reference data root) |

### Restaurant / Location

Implemented inside **Business Structure** (`RestaurantLocation`, `Department`, `Terminal`). This row documents operational responsibilities at location level.

| | |
| --- | --- |
| **Owns** | Location operational settings that are not owned by Menu/Inventory/Orders (e.g. service hours metadata — deferred) |
| **Does not own** | Legal registration (LegalEntity), stock balances |
| **Key concepts** | RestaurantLocation, Department, Terminal placement |
| **Commands in** | OpenServiceDay (deferred), ConfigureLocation |
| **Facts out** | LocationConfigured |
| **Depends on** | Business Structure, Jurisdiction |

### POS / Orders

| | |
| --- | --- |
| **Owns** | Orders, order lines, modifiers, applied commercial snapshots, order lifecycle state |
| **Does not own** | Payment ledger entries (Payments), inventory movements (Inventory), kitchen ticket state (Kitchen) |
| **Key concepts** | Order, OrderLine, OrderModifier, AppliedPriceSnapshot |
| **Commands in** | OpenOrder, AddOrderLine, ApplyDiscount, CancelOrder, CloseOrder |
| **Facts out** | OrderOpened, OrderItemAdded, OrderCancelled, OrderClosed |
| **Depends on** | Menu, Pricing, Identity, Business Structure, Catalog (item refs) |

### Catalog / Menu

**Catalog** owns canonical item identity; **Menu** owns channel assortment and publication.

| | |
| --- | --- |
| **Catalog owns** | StockItem identity, categories, base unit, package/conversion versions |
| **Menu owns** | Channel menus, location publication, availability windows |
| **Does not own** | Prices (Pricing), inventory quantities |
| **Key concepts** | StockItem, PackageVersion, MenuChannel, MenuPublication |
| **Commands in** | CreateStockItem, PublishMenu, SetAvailability |
| **Facts out** | StockItemCreated, MenuPublished, ItemAvailabilityChanged |
| **Depends on** | Catalog → Jurisdiction; Menu → Catalog, Business Structure |

### Pricing

| | |
| --- | --- |
| **Owns** | Price lists, discount rules, promotion definitions, evaluation metadata |
| **Does not own** | Applied prices on orders (Orders owns snapshots at sale time) |
| **Key concepts** | PriceListVersion, DiscountRule, Promotion |
| **Commands in** | PublishPriceList, ActivatePromotion |
| **Facts out** | PriceListActivated |
| **Depends on** | Catalog, Business Structure |

### Recipes & Preparations

| | |
| --- | --- |
| **Owns** | Recipe versions, PreparationSpecification versions, effective-recipe resolution rules |
| **Does not own** | ProductionBatch execution (Inventory + Kitchen), cost revisions (Costing) |
| **Key concepts** | RecipeVersion, PreparationSpecification, MaterializationMode (VIRTUAL / STOCK_TRACKED) |
| **Commands in** | ActivateRecipeVersion, CreatePreparationSpec |
| **Facts out** | RecipeVersionActivated, PreparationSpecActivated |
| **Depends on** | Catalog |

### Inventory

| | |
| --- | --- |
| **Owns** | Inventory ledgers, movements, balances, ProductionBatch as movement facts, adjustments |
| **Does not own** | Derived unit cost (Costing), purchase documents (Purchasing) |
| **Key concepts** | InventoryLedger, InventoryMovement, ProductionBatch, BusinessPosition |
| **Commands in** | RecordGoodsReceipt, RecordProductionBatch, AdjustInventory, RecordWriteOff |
| **Facts out** | GoodsReceived, PreparationProduced, InventoryAdjusted, InventoryConsumed |
| **Depends on** | Catalog, Business Structure, Recipes (for write-off expansion rules) |

### Purchasing

| | |
| --- | --- |
| **Owns** | Suppliers, purchase orders, supplier receipt source documents |
| **Does not own** | Inventory movements (commands Inventory), payment settlement |
| **Key concepts** | Supplier, PurchaseOrder, SupplierReceipt |
| **Commands in** | CreatePurchaseOrder, PostSupplierReceipt |
| **Facts out** | PurchasePriceRecorded, SupplierReceiptPosted |
| **Depends on** | Catalog, Business Structure |

### Payments

| | |
| --- | --- |
| **Owns** | Payment and refund transactions, provider-neutral status |
| **Does not own** | Order commercial content, cash drawer sessions (Cash Management) |
| **Key concepts** | Payment, Refund, PaymentMethod |
| **Commands in** | RecordPayment, RecordRefund |
| **Facts out** | PaymentRecorded, RefundRecorded |
| **Depends on** | Orders, Business Structure |

### Cash Operations (Cash Management)

| | |
| --- | --- |
| **Owns** | Cash drawers, shifts, cash in/out, counts, reconciliation |
| **Does not own** | Card/e-wallet payments (Payments) |
| **Key concepts** | CashDrawer, CashShift, CashMovement |
| **Commands in** | OpenShift, CloseShift, RecordCashInOut |
| **Facts out** | CashShiftOpened, CashShiftClosed |
| **Depends on** | Identity, Business Structure, Terminal |

### Kitchen / Production

| | |
| --- | --- |
| **Owns** | Kitchen tickets, routing, execution timestamps, station workflow state |
| **Does not own** | Recipe definitions, inventory movements, preparation cost |
| **Key concepts** | KitchenTicket, StationRoute, ExecutionState |
| **Commands in** | RouteTicket, StartPreparation, CompleteTicket |
| **Facts out** | KitchenTicketCreated, KitchenTicketCompleted |
| **Depends on** | Orders, Recipes (for routing hints) |

### Delivery / External Orders (Fulfillment)

| | |
| --- | --- |
| **Owns** | Delivery tasks, external channel order mapping, dispatch timing, address snapshots |
| **Does not own** | Core order lines (Orders), provider protocol (Integrations) |
| **Key concepts** | FulfillmentTask, ExternalOrderLink |
| **Commands in** | CreateFulfillmentTask, MarkDispatched |
| **Facts out** | FulfillmentTaskCreated, OrderHandedOff |
| **Depends on** | Orders, Integrations, Customer |

### Audit & Risk Events

| | |
| --- | --- |
| **Owns** | Immutable audit evidence, risk signals, cases, explanations, review outcomes |
| **Does not own** | Business facts being audited |
| **Key concepts** | AuditRecord, RiskSignal, RiskCase |
| **Commands in** | RecordAuditEvent, OpenRiskCase |
| **Facts out** | DangerousOperationRecorded, RiskCaseOpened |
| **Depends on** | All modules (consumes evidence references) |

### Reporting (Analytics)

| | |
| --- | --- |
| **Owns** | Derived read models, aggregates, report definitions, refresh metadata |
| **Does not own** | Source operational facts |
| **Key concepts** | ReportDefinition, ReadModelProjection, AggregateSnapshot |
| **Commands in** | RefreshProjection (internal) |
| **Facts out** | ProjectionRefreshed |
| **Depends on** | Operational facts, Costing revisions |

### Production Intelligence

| | |
| --- | --- |
| **Owns** | Recommendations, explanations, detector outputs, forecast artifacts (derived only) |
| **Does not own** | Inventory, orders, payments, or any operational ledger |
| **Key concepts** | Recommendation, EvidenceBundle, DetectorRun, ForecastArtifact |
| **Commands in** | GenerateRecommendations (batch), AcceptRecommendation, RejectRecommendation |
| **Facts out** | RecommendationGenerated, RecommendationAccepted, RecommendationRejected |
| **Depends on** | Analytics projections, Costing, Inventory facts (read-only) |

See ADR-0006 for the approval boundary when a recommendation triggers operational action.

## Dependency direction (summary)

```text
Jurisdiction, Business Structure
        ↓
Catalog, Recipes & Preparations
        ↓
Menu, Pricing, Purchasing
        ↓
Inventory ← Purchasing
        ↓
Orders → Kitchen, Payments, Fulfillment
        ↓
Costing (derived from Inventory/Purchasing/Recipes)
        ↓
Analytics, Production Intelligence (read-only + recommendations)
```

Audit & Risk observes all layers. Integrations and Fiscalization sit at the edge.
