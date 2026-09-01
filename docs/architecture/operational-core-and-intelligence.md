# Operational Core and Production Intelligence

- **Status:** Accepted architectural direction (documentation reconciliation)
- **Date:** 2026-08-19
- **Related:** `PROJECT_CHARTER.md`, ADR-0001, ADR-0002, ADR-0003, [ADR-0006](../decisions/ADR-0006-production-intelligence-boundary.md) (Accepted), [ADR-0007](../decisions/ADR-0007-foundation-scaffolding-stack.md) (Accepted)

## 1. Purpose

MillQ is not only a POS and accounting system. It has two connected but deliberately separated capabilities:

1. **MillQ Operational Core** — the authoritative operational system.
2. **MillQ Production Intelligence** — recommendations and business intelligence built on reliable operational facts.

This document reconciles that product direction with the existing accepted architecture. It does not replace Block B module boundaries (Block B domain ADRs remain **Proposed** until accepted; foundation only provisionally aligns with that proposal). Note: Accepted [ADR-0004](../decisions/ADR-0004-origin-source-of-truth.md) is Origin hosting, not Block B.

## 2. Operational Core

The Operational Core owns operational truth. It includes everything required to run a restaurant day to day and to keep auditable records of what happened.

Responsibilities include:

- POS and order lifecycle
- payments and cash operations
- menu and pricing application at sale time
- recipes and preparations (normative and actual production)
- inventory, purchasing, and warehouse movements
- kitchen execution
- delivery and external order intake
- identity, permissions, and dangerous-operation audit
- business structure and jurisdiction context on every fact
- offline-capable operation with server reconciliation

**Rule:** only the Operational Core may create or change authoritative operational records.

## 3. Production Intelligence

Production Intelligence consumes facts from the Operational Core. It does not become a second ledger.

It may:

- calculate derived metrics and features
- detect patterns and anomalies
- generate forecasts
- produce recommendations with explanations
- track recommendation status (accepted/rejected/acted upon)

It must not silently rewrite:

- sales, payments, inventory movements, purchase documents
- recipe history, financial history, or audit history

Any recommendation that should cause an operational change must pass through an **explicit operational command / approval boundary** implemented in the Operational Core.

## 4. Mapping to module boundaries

Block B (Proposed) defines twenty internal modules inside one modular monolith. The two-layer model maps as follows:

| Layer | Modules |
| --- | --- |
| **Operational Core** | Identity & Access; Business Structure; Jurisdiction; Catalog; Recipes & Preparations; Purchasing; Inventory; Menu; Pricing & Promotions; Orders; Kitchen; Payments; Cash Management; Customer; Fulfillment/Delivery; Integrations; Fiscalization; Audit & Risk (evidence capture) |
| **Production Intelligence** | Costing (derived valuation — reads inventory/purchasing/recipes, writes only cost revisions); Analytics (read models); Intelligence (recommendations — Proposed module, see ADR-0006) |
| **Shared foundation** | Domain measurement types (ADR-0002); operational fact contracts; historical truth storage patterns |

Costing remains separate from Inventory per ADR-0003 and Block B: Inventory owns movements; Costing owns derived valuation and recalculation revisions.

Analytics and Intelligence are **read-side and recommendation-side**. They never mutate source operational facts.

## 5. Design consequences for implementation

1. Operational facts are append-oriented and versioned where history matters (see `historical-truth-model.md`).
2. APIs and internal contracts distinguish **commands** (Operational Core) from **projections/recommendations** (Intelligence layer).
3. Future sellable Intelligence features plug into the Intelligence boundary without rewriting POS or inventory modules.
4. Offline POS records operational commands locally; Intelligence runs on the server after sync unless explicitly designed otherwise later.

## 6. Conflicts resolved

| Topic | Resolution |
| --- | --- |
| Block B has no “Production Intelligence” name | ADR-0006 Proposed adds the boundary; Block B modules remain valid inside Operational Core + Costing/Analytics |
| Food cost in charter vs Intelligence | Operational Core produces authoritative cost revisions (Costing module); Intelligence may analyse and recommend on top |
| Analytics in Block B | Stays read-only; part of Intelligence layer, not Operational Core |

## 7. Deferred

- Exact Intelligence module package name and UI surfaces
- ML/forecasting algorithms
- Recommendation auto-execution policies (Product Owner)
