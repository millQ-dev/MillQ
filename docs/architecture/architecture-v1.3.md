# MillQ Architecture v1.3

- **Status:** Proposed for acceptance (alignment after Block C merge + competitive/migration gap-analysis)
- **Date:** 2026-09-04
- **Canonical host:** Cursor Origin
- **Base:** Architecture [v1.2](architecture-v1.2.md) (Accepted) + Block C merged @ `a5e84b0` / main tip at alignment start `46f01ec`
- **Related ADRs:** ADR-0001…0004, 0006…0010 (Accepted); ADR-0011…0021 (Proposed with this alignment)
- **Module map:** [`domain-module-map.md`](domain-module-map.md)
- **Authority command:** KiU correcting command after gap-analysis (PO / strategic architecture); PO directions for Intelligence execution + Voice (2026-09-12)

## 1. Purpose

Architecture v1.3 **extends** v1.2 with boundaries that must be frozen **before** further application verticals (POS, FloorPlan, Migration adapters, fiscal providers, Grab/Shopee, Recipes/Sale write-off).

```text
v1.2 domain boundaries (Accepted)
        +
v1.3 deltas (this document + ADR-0011…0021)
        =
Architecture v1.3 baseline for resumed implementation
```

**Does not** restart Block C. Block C remains the first completed goods-receipt vertical and is **v1.3-compatible** (audit below).

**Does not** start Block D or any new product vertical in the alignment PR.

## 2. Current factual state

| Item | State |
| --- | --- |
| Origin main | `46f01ec` |
| Block C | **Merged** (PR #7 → `a5e84b0`) and **v1.3-compatible** |
| Architecture v1.3 alignment | **PR #9 pending strategic acceptance** |
| New application verticals | **STOP** until architecture acceptance |

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
| JurisdictionProfile ≠ provider adapters | ADR-0012 |
| Payment non-custody (no merchant/customer funds) | ADR-0013 |
| Vietnam fiscalization architecture boundary now | ADR-0014 |
| PII Vault, VN-primary residency, egress gate, MillQ LLC boundary | ADR-0015 |
| Order Settlement / Split Bill | ADR-0016 |
| FloorPlan / Table Engine | ADR-0017 |
| Offline multi-platform client runtime | ADR-0018 |
| Economic facts / contribution margin / channel profit | ADR-0019 |
| Security Control Plane / GovernmentRequestCase | ADR-0015 §Security |
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

Settlement is **not** “just multiple Payment rows on Order”.

Conceptual model:

```text
Order
  └── SettlementGroup? (one open settlement context)
        ├── Check[]            (bill partitions)
        │     └── CheckLineAllocation[]  (lines / guests / amounts)
        └── PaymentAllocation[] → Payment
```

Supports: split by lines, by guests, mixed tender, partial payment, fiscal interaction per Check/FiscalDocument rules (ADR-0014).

See ADR-0016.

## 7. FloorPlan / Table Engine (new)

Accepted direction before Restaurant implementation:

```text
DiningArea
FloorPlanVersion (immutable published layout)
  └── TableLayoutObject[] / Table[]
TableRuntimeState (operational)
TableAssignment (Order ↔ Table, optional)
TableCombination
```

Tables remain an **optional capability** (`tables.enabled`). Orders must not require `table_id NOT NULL`.

See ADR-0017.

## 8. Fiscalization (architecture now ≠ provider later ≠ legal G2)

| Layer | Timing |
| --- | --- |
| Architecture boundary (FiscalPolicy, FiscalSeries, FiscalDocument, FiscalSubmission, correction chains, idempotency, reconciliation, provider adapter **interface**) | **Now** (ADR-0014) |
| Concrete MISA/Viettel/… adapter | Later |
| Legal production clearance | **LEGAL GATE G2** — separate from architecture acceptance |

Do **not** invent Vietnam legal text in ADRs.

## 9. Privacy, residency, egress, LLC

Architecture **now** must include:

- Vietnam PII Vault (sensitive personal data isolation)
- Vietnam-primary regulated operational data residency intent
- Cross-border Egress Gate for processor/subprocessor flows
- Controller/processor role distinctions (conceptual)
- Synthetic-data-only paths for non-cleared environments
- MillQ Vietnam foreign-owned LLC as legal/operating boundary context (ADR-0015)

Exact legal qualification / certificates = **LEGAL GATE**, not architecture invent.

## 10. Payments non-custody

MillQ **does not** hold merchant or customer funds and **does not** become a payment intermediary on MVP. Tender flows are records of external provider / cash drawer outcomes (ADR-0013).

## 11. JurisdictionProfile vs provider adapters

```text
Core domains
JurisdictionProfile / jurisdiction policies   ← configuration & rules version
Provider adapters (MISA, VietQR, GrabFood, ShopeeFood, …)  ← edge
```

**Forbidden:** one giant `VietnamAdapter` owning orders+fiscal+delivery+payments.

See ADR-0012.

## 12. Migration (product capability)

```text
Source POS → Source Adapter → Staging → Normalize → Map → Validate
  → Dry Run → Import Plan → Idempotent Apply → Reconcile → Audit
```

Adapters do not encode KiU business rules. Historical import uses explicit A/B/C modes (ADR-0011).

**No** ad-hoc `scripts/import-from-xxx.ts` as the architecture.

## 13. Offline multi-platform

`offline-foundation.md` remains conceptual. Before POS implementation, ADR-0018 freezes:

- browser / iPad-iOS / Android runtimes
- local persistence
- sync authority & conflict/reconciliation
- device identity
- device gateway

## 14. Economic facts

Beyond CostQuote: ContributionMargin (dish), ChannelProfit, and related certainty — **derived read models**, never `product.cost` (ADR-0019). Intelligence consumes them under ADR-0006 / ADR-0020.

## 15. Production Intelligence Execution / ModelGateway (supporting)

ADR-0006 remains Accepted (Intelligence must not mutate Core). ADR-0020 adds execution contracts:

```text
Operational Core
  → Intelligence projections / EvidenceBuilder
  → ModelGateway (+ ApprovedModelRegistry)
  → Recommendation (human accept/reject)
  → normal domain command → audit
```

- No arbitrary LLM SQL/DB access.
- Primary inference: MillQ-controlled Vietnam infrastructure; no restaurant-local model weights in MVP.
- POS does not depend on AI availability.
- Specific models (e.g. Qwen*) are candidates, not permanent invariants.
- External providers only via Egress Gate (ADR-0015).

## 16. Voice & Multilingual Interaction (supporting)

ADR-0021: voice is first-class **supporting** capability, not a command bypass.

```text
mic → PTT/VAD → server ASR → router
  → translation | VoiceCommandPreview | owner Q→EvidenceBuilder
  → auth/confirm → normal application command → audit
```

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
