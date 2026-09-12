# Domain Module Map (Architecture v1.3)

- **Status:** Proposed reference with Architecture v1.3
- **Date:** 2026-09-04
- **Supersedes:** Architecture v1.2 module map naming for extended modules
- **Authority:** [`architecture-v1.3.md`](architecture-v1.3.md), ADR-0008 (Accepted), ADR-0011…0021 (Accepted)
- **Note:** Origin hosting ADR-0004 is unrelated.

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
| **Owns** | Order, OrderLine, modifiers on lines, commercial snapshots, lifecycle; SettlementGroup / Check / CheckLineAllocation coordination |
| **Does not own** | Payments, FiscalDocument, kitchen ticket state, inventory movements, FloorPlan geometry, TableAssignment / TableRuntimeState |
| **Key concepts** | Order (table optional), OrderLine snapshot, SettlementGroup, Check, CheckLineAllocation, PaymentAllocation (ADR-0016 **Accepted**: Order ≠ Settlement; completion = allocated coverage; no cross-LE SettlementGroup) |
| **Commands in** | OpenOrder, AddLine, CancelOrder, SendToProduction, OpenSettlement, SplitCheck |
| **Facts out** | OrderOpened, OrderItemAdded, OrderCancelled, OrderPaid (signal; payment owned by Payments) |
| **Depends on** | Menu/Pricing resolvers, Catalog, Organization, Identity |

### Payments

| | |
| --- | --- |
| **Owns** | Payment/refund transactions; TenderDefinition registry; PaymentAllocation |
| **Does not own** | Order lines, cash drawer sessions, merchant/customer fund custody (forbidden — ADR-0013) |
| **Key concepts** | TenderDefinition, Payment, PaymentAllocation, non-custody boundary (ADR-0013 **Accepted**: no wallet/internal balance; tips as allocation only; gift cards / marketplace settlement out of scope) |
| **Commands in** | RecordPayment, RecordRefund, AllocatePayment |
| **Facts out** | PaymentRecorded |
| **Depends on** | Orders (settlement), Organization |

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
| **Owns** | FiscalPolicy, FiscalSeries, FiscalDocument, FiscalSubmission, correction chains, provider adapter **interface**, fiscal reconciliation |
| **Does not own** | LegalEntity master data beyond fiscal binding; Order/Payment SoT; legal production clearance |
| **Key concepts** | Architecture boundary now (Accepted ADR-0014); Order ≠ FiscalDocument; immutable docs + correction chains; offline queue statuses; LEGAL GATE G2 for go-live; provider impl later |
| **Commands in** | SubmitFiscal, RecordFiscalCorrection |
| **Facts out** | FiscalSubmitted, FiscalCorrected |
| **Depends on** | Organization (LegalEntity), JurisdictionProfile, Payments/Orders settlement outcomes |

### Floor / Table Engine

| | |
| --- | --- |
| **Owns** | DiningArea, FloorPlanVersion, Table, TableLayoutObject, TableRuntimeState, TableAssignment, TableCombination |
| **Does not own** | Order content / Order truth (Orders remain valid independently of Floor/Table) |
| **Key concepts** | Optional capability `tables.enabled` (Corner/Cafe/Restaurant); versioned FloorPlan; Floor/Table-owned optional TableAssignment (references OrderId); multi-order/table; TableCombination; ADR-0017 **Accepted**; offline per ADR-0018 |
| **Commands in** | PublishFloorPlan, UpdateTableRuntimeState, AssignOrderToTable, MoveOrderTable, CombineTables, EndTableCombination |
| **Facts out** | FloorPlanPublished, TableStateChanged, OrderTableAssigned, OrderTableMoved, TableCombinationCreated, TableCombinationEnded |
| **Depends on** | Organization, PackageEntitlement / OutletCapabilityConfig |

### Migration

| | |
| --- | --- |
| **Owns** | MigrationRun / MigrationJob, staging store, canonical import model versions, external identity map, dry-run / reconcile reports |
| **Does not own** | Authoritative Catalog/Inventory/Order ledgers (writes only via Core commands) |
| **Key concepts** | Pipeline Adapter→…→Audit; modes A Master Data / B Opening·Cutover / C Historical; provenance; idempotent apply; cutover lifecycle; ADR-0011 **Accepted**; ADR-0015 privacy |
| **Commands in** | StartMigrationRun, RunDryRun, ApplyImportPlan, CompleteReconciliation |
| **Facts out** | MigrationRunPhaseChanged, MigrationJobCompleted, MigrationConflictRaised (AUDIT/INTEGRATION as applicable) |
| **Depends on** | Organization (explicit target scope), Catalog, Inventory, Recipes (via Core commands), Privacy Control Plane (ADR-0015) |

### Privacy & Security Control Plane

| | |
| --- | --- |
| **Owns** | PII Vault access policies (logical boundary), EgressGate decisions, GovernmentRequestCase; support/break-glass audit plane (distinct) |
| **Does not own** | Business aggregates; Professional Account detailed model (ADR PENDING); Workforce/Assessment media policy (ADR PENDING) |
| **Key concepts** | Tenant isolation; exceptional professional cross-BG grants; Vietnam-primary preferred residency; attributable Egress Gate (ADR-0015 **Accepted**) |
| **Commands in** | ApproveEgress, OpenGovernmentRequestCase |
| **Facts out** | AUDIT events |
| **Depends on** | Identity, Organization |

### Reporting

| | |
| --- | --- |
| **Owns** | Read models, aggregates, report definitions; ContributionMargin / ChannelProfit projections (ADR-0019 **Accepted**) |
| **Does not own** | Source ledgers; separate economic SoT per persona |
| **Key concepts** | Metric ladder (Gross Sales → … → Contribution Margin); typed Direct Variable Costs; certainty/provenance; original currency; Owner/Accountant views over same facts |
| **Depends on** | Fact feed, module facts (read) |

### Production Intelligence (supporting — ADR-0006 + ADR-0020)

| | |
| --- | --- |
| **Owns** | Recommendations, detector/forecast artifacts, EvidenceBundle assembly, ModelGateway **contract** usage, ApprovedModelRegistry **contract** |
| **Does not own** | Orders, Inventory, Payments, Purchasing, or any Operational Core ledger |
| **Key concepts** | Tenant-scoped projections → EvidenceBuilder → ModelGateway → Recommendation → human accept → **normal domain command** |
| **Commands in** | GenerateRecommendation (read-side), RecordRecommendationDecision (accept/reject metadata) |
| **Facts out** | RecommendationIssued, RecommendationAccepted/Rejected (AUDIT / DOMAIN as applicable) |
| **Depends on** | Reporting projections, Privacy/Egress (ADR-0015), Operational Core (**read only**) |

```text
Operational Core
  → Intelligence projections / EvidenceBuilder
  → ModelGateway
```

No new deployable/microservice required by this map row.

### Voice & Multilingual Interaction (supporting — ADR-0021)

| | |
| --- | --- |
| **Owns** | Voice interaction sessions (when implemented), speech provider adapter **interface**, translation/preview orchestration |
| **Does not own** | Order/Inventory/Payment ledgers; AuthorizationPolicy |
| **Key concepts** | PTT/VAD → server ASR → router → classes A Informational / B Translation / C Command preview / D Critical command |
| **Commands in** | StartVoiceCapture, SubmitVoiceUtterance, ConfirmVoiceCommandPreview (C/D only mutate via normal app commands) |
| **Facts out** | VoiceInteractionRecorded (AUDIT as applicable) |
| **Depends on** | ModelGateway / SpeechProviderAdapter (ADR-0020), Identity/RBAC, Catalog/Menu resolvers, application commands |

```text
Voice & Multilingual Interaction
  → ModelGateway / SpeechProviderAdapter
  → existing application commands
```

Voice and Intelligence remain **supporting / read-side** capabilities, not owners of Orders/Inventory/Payments truth.

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
| **Migration** | See dedicated Migration module above | ADR-0011 **Accepted** |
| **Central Production** | Multi-outlet production plans | |
| **Operational / Production Intelligence** | Recommendations, EvidenceBundle, ModelGateway contract | ADR-0006 + ADR-0020 |
| **Voice & Multilingual Interaction** | Speech/translation UX path | ADR-0021 |
| **Jurisdiction** | JurisdictionProfile (policy; versioned/effective-dated; LegalEntity-owned; Outlet inherits) | ADR-0012 **Accepted** |

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
Reporting
        ↓
Production Intelligence (projections / EvidenceBuilder → ModelGateway)   [supporting]
Voice & Multilingual Interaction → ModelGateway / SpeechAdapter → commands [supporting]
```

Audit observes all. Integrations and Fiscalization at the edge. Intelligence and Voice **do not** own Core ledgers.

---

## Explicit non-goals in this map

- Implementing all modules now
- Microservices split
- Central event store as SoT
- Universal rules DSL
