# Operational Core and Production Intelligence

- **Status:** Accepted architectural direction (aligned with Architecture v1.2)
- **Date:** 2026-08-19
- **Updated:** 2026-09-04
- **Related:** `PROJECT_CHARTER.md`, ADR-0001…0004, ADR-0006, ADR-0007, [ADR-0008](../decisions/ADR-0008-domain-boundaries-v1.2.md), [`architecture-v1.2.md`](architecture-v1.2.md)

## 1. Purpose

MillQ is not only a POS and accounting system. It has two connected but deliberately separated capabilities:

1. **MillQ Operational Core** — the authoritative operational system.
2. **MillQ Production Intelligence** — recommendations and business intelligence built on reliable operational facts.

## 2. Operational Core

The Operational Core owns operational truth. It includes everything required to run a restaurant day to day and to keep auditable records of what happened.

Responsibilities include:

- POS and order lifecycle (orders do not require tables)
- payments (TenderDefinition) and cash operations (CashShift lifecycle)
- catalog, menu configuration, POS presentation, channel menus (separated)
- recipes as graphs and preparations; consumption VIRTUAL vs STOCK_TRACKED
- inventory movements and typed source documents; purchasing/goods receipt
- production routing (route → station → endpoints)
- delivery and external order intake
- identity, workforce, permissions, dangerous-operation audit (actor vs authorizer)
- tenancy / outlet network dimensions and jurisdiction context on facts
- offline-capable operation with server reconciliation

**Rule:** only the Operational Core may create or change authoritative operational records.

## 3. Production Intelligence

Production Intelligence consumes facts from the Operational Core. It does not become a second ledger.

It may:

- calculate derived metrics and features
- detect patterns and anomalies
- generate forecasts
- produce recommendations with **evidence chains**
- track recommendation status (accepted/rejected/acted upon)

Conceptual artifacts: OperationalIssue, KpiSnapshot, AlertOccurrence, Recommendation, EvidenceBundle.

It must not silently rewrite sales, payments, inventory movements, purchase documents, recipe history, financial history, or audit history.

Any recommendation that should cause an operational change must pass through an **explicit operational command / approval boundary** (ADR-0006).

Estimated costs must not be presented as established fact (ADR-0003 certainty).

## 4. Mapping to module boundaries (v1.2)

| Layer | Modules |
| --- | --- |
| **Operational Core** | Organization & Tenancy; Identity & Access; Workforce; Catalog; Units & Packaging; Recipes & Costing (incl. derived cost revisions); Menu Configuration; POS Presentation; Orders; Payments; Cash Management; Inventory; Production Routing; Procurement; Supplier Management; Integrations; Fiscalization; Audit & Risk; Channel Menu; Delivery; … |
| **Production Intelligence** | Reporting projections + Intelligence recommendations (ADR-0006) |
| **Shared foundation** | Domain measurement (ADR-0002); operational fact contracts; historical truth / posting (ADR-0010) |

`operational_fact_feed` is a **read-side / integration mirror**, not module SoT.

## 5. Design consequences for implementation

1. Operational facts are append-oriented and versioned where history matters.
2. APIs distinguish **commands** (Operational Core) from **projections/recommendations**.
3. Catalog ≠ Menu ≠ POS Layout ≠ Channel Menu.
4. Pricing ≠ Promotions ≠ Loyalty.
5. Offline POS records operational commands locally; Intelligence runs after sync unless designed otherwise later.
6. Next vertical: Block C per [`block-c-goods-received-contract.md`](block-c-goods-received-contract.md).

## 6. Conflicts resolved

| Topic | Resolution |
| --- | --- |
| Earlier Block B draft naming | Superseded by Architecture v1.2 + ADR-0008 module map |
| Food cost in charter vs Intelligence | Costing produces authoritative revisions; Intelligence analyses/recommends |
| Central fact feed as ledger | Rejected — feed mirrors only |

## 7. Deferred

- Exact Intelligence UI surfaces and detector algorithms
- Recommendation auto-execution policies (Product Owner)
- Vietnam fiscal adapter behavior (dedicated research)
