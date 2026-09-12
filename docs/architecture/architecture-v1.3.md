# MillQ Architecture v1.3

- **Status:** Proposed for acceptance (alignment after Block C merge + competitive/migration gap-analysis)
- **Date:** 2026-09-04
- **Canonical host:** Cursor Origin
- **Base:** Architecture [v1.2](architecture-v1.2.md) (Accepted) + Block C merged @ `a5e84b0` / main tip at alignment start `46f01ec`
- **Related ADRs:** ADR-0001…0004, 0006…0010, 0012…0019 (Accepted); ADR-0020, ADR-0021 (Accepted); ADR-0011 (Proposed)
- **Module map:** [`domain-module-map.md`](domain-module-map.md)
- **Authority command:** KiU correcting command after gap-analysis (PO / strategic architecture); PO ACCEPT ADR-0017 deltas (2026-09-12)

## 1. Purpose

Architecture v1.3 **extends** v1.2 with boundaries that must be frozen **before** further application verticals (POS, FloorPlan, Migration adapters, fiscal providers, Grab/Shopee, Recipes/Sale write-off).

```text
v1.2 domain boundaries (Accepted)
        +
v1.3 deltas (this document + ADR-0011 Proposed + ADR-0012…0021 Accepted)
        =
Architecture v1.3 baseline for resumed implementation
```

**Does not** restart Block C. Block C remains the first completed goods-receipt vertical and is **v1.3-compatible** (audit below).

**Does not** start Block D or any new product vertical in the alignment PR.

## 2. Current factual state

| Item | State |
| --- | --- |
| Origin main tip | `be58388` (ADR-0018 Accept PR #17) |
| Architecture v1.3 merge | `77c6949` (PR #9) |
| Block C | **Merged** (PR #7 → `a5e84b0`) and **v1.3-compatible** |
| Architecture v1.3 alignment | **Merged** (PR #9 → `77c6949`) |
| ADR-0012 / ADR-0013 | **Accepted** (PR #11 → `cf3375f`) |
| ADR-0015 / ADR-0019 | **Accepted** (PR #13 → `4510092`) |
| ADR-0014 / ADR-0016 | **Accepted** (PR #15 → `f764599`) |
| ADR-0018 | **Accepted** (PR #17 → `be58388`) |
| New application verticals | **STOP** until PO launches next vertical |

**Do not** describe Block C as the next vertical. After acceptance, the current candidate is:

```text
Recipes → Sale write-off → Food Cost
```

(only when PO launches — not in this PR).

## 3. Non-negotiable foundation (unchanged from v1.2)

Modular monolith; TypeScript monorepo; Origin SoT; ADR-0002/0003 measurement & costing; ADR-0006 Intelligence read-side; `operational_fact_feed` = mirror not ledger; ADR-0010 document posting.

## 4. v1.3 deltas (summary)

| Contour | Decision pointer |
| --- | --- |
| Migration Core + Canonical + Mapping + Historical policy | ADR-0011 |
| JurisdictionProfile ≠ provider adapters | ADR-0012 (**Accepted**) |
| Payment non-custody (no merchant/customer funds) | ADR-0013 (**Accepted**) |
| Vietnam fiscalization architecture boundary now | ADR-0014 (**Accepted**) |
| PII Vault, VN-primary residency, egress gate, MillQ LLC boundary | ADR-0015 (**Accepted**) |
| Order Settlement / Split Bill | ADR-0016 (**Accepted**) |
| FloorPlan / Table Engine | ADR-0017 (**Accepted**) |
| Offline multi-platform client runtime | ADR-0018 (**Accepted**) |
| Economic facts / contribution margin / channel profit | ADR-0019 (**Accepted**) |
| Security Control Plane / GovernmentRequestCase | ADR-0015 §Security (**Accepted**) |
| Production Intelligence Execution / ModelGateway | ADR-0020 (does **not** supersede ADR-0006) |
| Voice & Multilingual Interaction | ADR-0021 |

Detailed module ownership: [`domain-module-map.md`](domain-module-map.md).

## 5. Organization / packages / catalog (v1.2 retained)

- Network-first Tenant; LegalEntity fiscal/legal — not menu spine.
- `PackageEntitlement` + `OutletCapabilityConfig` — no package forks.
- CatalogItem + profiles; Catalog ≠ Menu ≠ POS Layout ≠ Channel Menu.
- Units / ItemUnitConversion / SupplierPack; SupplierItem (ADR-0009).
- Recipe graph + ConsumptionStrategy (ADR-0003); no double write-off.
- CostQuote / certainty; no `product.cost`.
- SalesContext + specialized resolvers; Pricing ≠ Promotions ≠ Loyalty.
- Order independent of Table.
- Production routing versioned.
- Typed inventory documents + InventoryCountSession (ADR-0010).
- Workforce PersonalShift ≠ CashShift.
- TenderDefinition + payment lifecycle (plus ADR-0013 non-custody).
- Event taxonomy DOMAIN / AUDIT / INTEGRATION / TELEMETRY.
- Audit / provenance (actor vs authorizer).

## 6. Settlement / Split Bill (new)

**Order ≠ Settlement** (ADR-0016 **Accepted**).

```text
Order → SettlementGroup → Check(s) → CheckLineAllocation → PaymentAllocation
```

Supports: split bill, partial payment, mixed tenders, multiple payments, multiple Checks per Order. Settlement completion = allocated valid payment coverage (not mere payment-record presence). Provider outcome ≠ allocation. Deposits/prepayments referenceable/allocatable without MillQ wallet (ADR-0013). Tips separate from principal; no custody; tax via JurisdictionProfile. Refunds = compensating history. One SettlementGroup must not span LegalEntities. Combined orders within one LE optional later (not MVP). Fiscalization consumes settlement via ADR-0014 — no fiscal SDK in Settlement.

## 7. FloorPlan / Table Engine (new)

ADR-0017 **Accepted**: Order does **not** require Table; Floor/Table is optional capability (Corner OFF / Cafe optional / Restaurant enabled — not product forks).

```text
RestaurantLocation → DiningArea → FloorPlanVersion → Table
Runtime: TableRuntimeState; Floor/Table-owned optional TableAssignment (refs OrderId); optional TableCombination
```

- Floor plans versioned; no silent rewrite of historical table/plan context.
- TableRuntimeState is operational only — not settlement/inventory SoT.
- Assignment/move is explicit + auditable (Floor/Table owns TableAssignment; Orders does not); multiple Orders/Checks per table allowed.
- Combinations must not destroy Table identities; do not force `Order.table_id` as sole model.
- Reservations out of scope. Offline per ADR-0018. Not coupled to ProductionRoute.
- Accept = boundaries only (no floor editor / POS / reservation product).

See ADR-0017.

## 8. Fiscalization (architecture now ≠ provider later ≠ legal G2)

Dedicated Fiscalization boundary (ADR-0014 **Accepted**):

```text
Settlement / business outcome → Fiscal Policy evaluation → FiscalDocument
  → FiscalSubmission → ProviderAdapter → provider status → Audit
```

| Layer | Timing |
| --- | --- |
| Architecture boundary (FiscalPolicy, FiscalSeries, FiscalDocument, FiscalSubmission, correction chains, idempotency, reconciliation, provider adapter **interface**) | **Now** (Accepted) |
| Concrete MISA/Viettel/… adapter | Later |
| Legal production clearance | **LEGAL GATE G2** — separate from architecture acceptance |

- Does **not** own Order / Payment / Inventory truth. Order ≠ FiscalDocument; cardinality supports split/partial/corrections/refunds/multi-doc.
- Fiscal documents immutable; corrections = explicit chains.
- Offline: business may complete; fiscal may queue; statuses PENDING/QUEUED/SUBMITTED/ACCEPTED/REJECTED…; never fabricate acceptance.
- JurisdictionProfile selects policy/version at business time.
- No provider SDK in Orders/Settlement. Do **not** invent Vietnam legal text in ADRs.

## 9. Privacy, residency, egress, LLC

Architecture includes (ADR-0015 **Accepted** — single control-plane ADR, not split):

- Tenant / Business Group operational isolation; professional cross-BG access is exceptional (detailed Professional Account ADR PENDING)
- Mutations in exactly one selected client context; cross-client mutation prohibited by default
- PII Vault as **logical** boundary (modular monolith OK for MVP; no mandatory separate deployable)
- Vietnam-primary **preferred/default** residency — not a claim that data never crosses borders; cross-border only via Egress Gate
- Egress decisions attributable (purpose, data categories, provider, destination, retention, approved service, tenant context, audit)
- Support/break-glass ≠ GovernmentRequestCase; scoped, reasoned, audited, not permanent super-admin
- Voice Interaction audio (zero-retention default) ≠ assessment/interview media (future Workforce/Assessment policy — ADR PENDING)

Exact legal qualification / certificates = **LEGAL GATE**, not architecture invent.

## 10. Payments non-custody

MillQ **MVP is non-custodial** (ADR-0013 **Accepted**): no merchant/customer fund custody; no wallet / internal money balance; Payments records provider outcomes, allocations, reconciliation, and references only. Tips may be payment allocations without custody; deposits/prepayments only as records of external receipt. Gift cards and marketplace collection/distribution are **out of scope** pending separate ADR/legal review.

## 11. JurisdictionProfile vs provider adapters

```text
LegalEntity (primary jurisdiction ownership)
  → JurisdictionProfile (policy; versioned + effective-dated)
Location/Outlet normally inherits LegalEntity profile
Provider adapters selected separately by capability (fiscal/payment/channel/…)
```

- Profile = **policy**, not provider implementation.
- Historical business/fiscal documents keep the profile/version at **business time**.
- Location-level jurisdiction override is **not** a generic capability (needs separate ADR).
- Changing a provider must **not** change Operational Core domain semantics.
- **Forbidden:** giant `VietnamAdapter`.

See ADR-0012 (**Accepted**).

## 12. Migration (product capability)

```text
Source POS → Source Adapter → Staging → Normalize → Map → Validate
  → Dry Run → Import Plan → Idempotent Apply → Reconcile → Audit
```

Adapters do not encode KiU business rules. Historical import uses explicit A/B/C modes (ADR-0011).

**No** ad-hoc `scripts/import-from-xxx.ts` as the architecture.

## 13. Offline multi-platform

ADR-0018 **Accepted** freezes architecture boundaries (not full sync implementation):

- First-class clients: Browser, iPad/iOS, Android (need not ship simultaneously).
- Server remains authoritative after sync — no second permanent SoT.
- Data classes: offline command capture; cached server-authoritative reference/config; external-service outcomes never fabricated.
- Business chronology outranks upload order; sync concepts: Local Store, Outbox, Inbox, Sync Cursor, idempotency, entity-specific conflict policy (no universal LWW; no specific local DB frozen).
- DeviceIdentity + attributable offline commands; encrypted-at-rest / scoped cache direction.
- Professional offline cross-client mutation out of MVP scope.
- Fiscal/payment/channel: queue OK; never fabricate ACCEPTED/SUCCESS.
- POS/KDS/printing usable without AI/voice; no mandatory local LLM/ASR.

`offline-foundation.md` remains the operational behavior reference.
## 14. Economic facts

Economic metrics are **derived read-side** facts (ADR-0019 **Accepted**), never Operational Core mutable truth and never `product.cost`.

Conceptual ladder:

```text
Gross Sales → (restaurant-borne discounts/promotions) → Revenue Basis / Net Sales
  → COGS → Gross Profit → Direct Variable Selling Costs → Contribution Margin
```

- COGS from historical sale/write-off/recipe costing via CostQuote/history.
- MVP Direct Variable Costs are typed components (packaging, payment fee, channel commission, …); rent/payroll/overhead excluded from MVP CM.
- Certainty/provenance per component; UNKNOWN ≠ silent zero; no false exact CM.
- Original currency preserved; FX only with explicit rate/source/time/reporting currency.
- Owner vs Accountant may use different views over the **same** facts.
- Tax/revenue treatment remains JurisdictionProfile-compatible (ADR-0012); Intelligence consumes under ADR-0006 / ADR-0020.

## 15. Production Intelligence Execution / ModelGateway (supporting)

ADR-0006 remains Accepted (Intelligence must not mutate Core). ADR-0020 (**Accepted**) adds execution contracts:

```text
Operational Core
  → Intelligence projections / EvidenceBuilder
  → ModelGateway (+ ApprovedModelRegistry)
  → Recommendation (human accept/reject)
  → normal domain command → audit
```

- No arbitrary LLM SQL/DB access.
- Preferred / default target: MillQ-controlled Vietnam-hosted / self-hosted inference **where economically, legally, and operationally justified** — **not** a mandatory MVP hosting invariant.
- Approved external providers **MAY** be used in production via `ModelGateway → ApprovedModelRegistry → ADR-0015 Egress Gate`.
- Provider/deployment-neutral; specific models (OpenAI/Kimi/Qwen/etc.) are replaceable candidates, not invariants.
- No restaurant-local model weights in MVP; POS does not depend on AI availability.

## 16. Voice & Multilingual Interaction (supporting)

ADR-0021 (**Accepted**): voice is first-class **supporting** capability, not a command bypass.

```text
mic → PTT/VAD → server ASR → router
  → A Informational query | B Translation
  → C Command preview | D Critical command
```

- **A/B:** no domain command; no command confirmation required.
- **C:** `VoiceCommandPreview` + auth; confirmation per command policy.
- **D:** refund / reversal / inventory adjustment / sensitive financial — explicit confirmation, authorization, reason when policy requires, normal domain command, audit.
- Voice/LLM/ASR never mutate Operational Core directly.

VI speech in + written VI out (no VI TTS required in MVP); EN/RU speech + text (+ optional guest TTS). Voice offline must not block POS/KDS/printing.

## 17. Action Center / Compliance Center

Read-side operational surfaces over Audit, Risk, FiscalSubmission status, MigrationJob, GovernmentRequestCase — **not** alternate SoT.

## 18. Device / Printing

OutputEndpoint (KDS/Printer/…) remains Production Routing. Device gateway / print spooler ownership sits at Integrations or Device edge — no UI-hardcoded `dish→printer`.

## 19. Block C compatibility (audit result)

| Check | Result |
| --- | --- |
| Document ≠ movement; DRAFT→POSTED→REVERSED | Compliant |
| No `product.cost`; CostQuote | Compliant |
| Warehouse-scoped MA (ADR-0003 §5) | Compliant |
| LE on balance = ownership denorm, not averaging axis | Compliant |
| Fact feed mirror; line-level GoodsReceived | Compliant |
| Catalog stubs without full profiles | Acceptable temporary stub |
| Code change required for v1.3 | **None** |

## 20. Work sequence after v1.3 acceptance

```text
Architecture v1.3 accepted
        ↓
PO launches next application vertical
(current candidate: Recipes → Sale write-off → Food Cost)
        ↓
Migration Core scaffolding when scheduled (adapters later)
        ↓
POS / FloorPlan / Fiscal provider / Grab / Voice·AI runtime — only after their ADRs + gates
```

## 21. Explicit non-goals of the alignment PR

- No Migration adapter implementations
- No fiscal provider adapter
- No POS / FloorPlan / Grab / Shopee code
- No Recipes / Sale write-off implementation
- No ModelGateway / ASR / TTS / GPU / vLLM / Qwen install
- No dozens of empty future SQL tables
