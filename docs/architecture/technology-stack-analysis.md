# Technology Stack Analysis — MillQ Initial Stack

Related issue: [#6 — Select the initial technology stack](https://github.com/millQ-dev/MillQ/issues/6)  
Related ADR: [`ADR-0001-initial-technology-stack.md`](../decisions/ADR-0001-initial-technology-stack.md)  
Date: 2026-07-25  
Status: Analysis for review (not approved)

## 1. Purpose

This document provides a structured comparison of candidate technology stacks for the MillQ MVP. It does not scaffold code, install dependencies, or select exact libraries unless marked as **Recommended, pending ADR acceptance** or **decision deferred**.

The goal is to recommend a stack that can deliver the first product vertical with operational accuracy, while remaining compatible with the charter constraints: modular monolith, monorepo, API-first boundaries, and deliberate growth.

## 2. Classification of statements

### 2.1 Confirmed project requirements

Drawn from `PROJECT_CHARTER.md`, Issue #6, and established repository conventions:

- Restaurant management platform for Vietnam; initial focus on Russian-speaking operators.
- First vertical: Restaurant → Employee → Ingredient → Recipe → Goods Receipt → Sale → Automatic Write-off → Food Cost Report.
- Modular monolith first; monorepo; API-first boundaries.
- Transactional integrity for inventory and financial operations.
- Idempotency for critical retried operations.
- Audit trail for inventory and financial events.
- Practical local development on macOS; Docker-based development environment.
- GitHub Actions compatibility.
- Strong support for AI-assisted development in Cursor and Codex.
- Small initial team.
- No microservices and no Kubernetes for the initial architecture.
- Avoid unnecessary infrastructure and premature event-driven architecture.
- Do not invent Vietnam legal, tax, or fiscal-device requirements.

### 2.2 Architecture assumptions

Assumptions used for this analysis. They are not product law and must be corrected if wrong:

- The first client surfaces will be web-based operational UIs, with POS eventually needing offline/unstable-network tolerance.
- One deployable backend serving multiple clients is acceptable for MVP.
- PostgreSQL is an acceptable default relational database unless a material counter-argument appears.
- Exact cloud vendor choice can remain deferred if deployment remains portable.
- “Strong AI-agent effectiveness” means large training corpus, clear typed APIs, and low context-switching cost across frontend and backend.

### 2.3 Reversible decisions

Prefer speed and simplicity here; change later if evidence appears:

- Exact web framework within a React-based approach.
- Exact Node.js HTTP framework.
- Exact query, ORM, and migration tooling.
- Exact validation library within a shared-schema approach.
- Exact test runners and coverage tooling.
- Exact background-processing topology and tooling, if asynchronous execution is required at all.
- Exact observability vendor/tooling.
- Exact offline sync protocol details for POS.

### 2.4 Decisions that require explicit approval

- Primary language strategy (TypeScript-only vs polyglot).
- Database family if not PostgreSQL.
- API style if not REST for the initial public/internal HTTP surface.
- Any move toward microservices, Kubernetes, or event-driven core.
- Any fiscal, tax, or legal integration claims for Vietnam (must come from product ownership with real requirements).
- Acceptance of ADR-0001 itself.

## 3. Options under consideration

| Option | Summary |
| --- | --- |
| **A** | TypeScript across frontend and backend |
| **B** | TypeScript frontend with Python backend |
| **C** | TypeScript frontend with JVM backend |
| **D** | Alternative only if materially stronger |

### 3.1 Option D screening

Candidates sometimes proposed for transactional backends (.NET, Go) were screened against MillQ’s constraints.

- **.NET**: strong typing, excellent transactional/data tooling, mature enterprise patterns. Material downside for MillQ now: polyglot monorepo cost, weaker default alignment with the React/TypeScript client ecosystem in one language, and comparatively less uniform AI-agent fluency across full-stack changes for a tiny team.
- **Go**: strong for networked services and operational simplicity, weaker for rapid product/UI co-evolution and rich domain modeling ergonomics in an inventory/costing monolith for a small product team.

**Conclusion:** neither presents a *materially stronger* overall case than A–C for this MVP context. Option D is not advanced.

## 4. Evaluation criteria and comparison

Ratings are relative for MillQ MVP (small team, modular monolith, inventory/costing accuracy), not absolute industry rankings.

Scale: **Strong** / **Adequate** / **Weak** for this product context.

| Criterion | A — TS/TS | B — TS + Python | C — TS + JVM |
| --- | --- | --- | --- |
| Implementation speed (small team) | **Strong** | Adequate | Weak |
| Type safety | Adequate–Strong (with discipline) | Adequate (typed Python helps; two ecosystems) | **Strong** |
| Maintainability | **Strong** (one language) | Adequate | Adequate (higher ceremony) |
| Transactional inventory/finance logic | Adequate (must be designed deliberately) | **Strong** | **Strong** |
| Monetary & quantity calculations | Adequate (must avoid IEEE float money; use decimals/integers) | **Strong** (`Decimal`) | **Strong** (`BigDecimal`) |
| Database access & migrations | **Strong** | **Strong** | **Strong** |
| Testing ecosystem | **Strong** | **Strong** | **Strong** |
| API development | **Strong** | **Strong** | **Strong** |
| Background jobs | Adequate | **Strong** | **Strong** |
| Auditability | Adequate–Strong (app-level + DB) | Adequate–Strong | Adequate–Strong |
| Idempotency | Adequate–Strong (design, not language) | Adequate–Strong | Adequate–Strong |
| Offline-capable POS support | **Strong** (client-side; same TS models) | Adequate (split models) | Adequate (split models) |
| AI-assisted development (Cursor/Codex) | **Strong** | Adequate | Adequate–Weak |
| Hiring availability | **Strong** | **Strong** | Adequate |
| Deployment complexity | **Strong** (simple Node deploy) | Adequate | Weak–Adequate |
| Operational cost | **Strong** | Adequate | Adequate |
| Long-term modular-monolith suitability | **Strong** | Adequate | **Strong** |

### 4.1 Narrative trade-offs

**Option A — TypeScript across frontend and backend**

- **Pros:** One language and shared types/schemas across clients and server; fastest path for a small team; excellent fit for Cursor/Codex and monorepo workflows; natural alignment with React-based clients and offline-capable POS clients; simple deployment story without Kubernetes.
- **Cons:** JavaScript numbers are a known hazard for money and quantities if used naively; transactional patterns and background-job maturity are adequate but require explicit design; less “enterprise default” perception than JVM.
- **Fit:** Best overall for MillQ’s constraints if monetary/quantity handling, transactions, idempotency, and audit trails are treated as first-class design rules—not optional libraries.

**Option B — TypeScript frontend + Python backend**

- **Pros:** Excellent for calculations (`Decimal`), data tooling, and fast backend experimentation; strong testing culture.
- **Cons:** Permanent polyglot tax (two package ecosystems, two CI toolchains, duplicated validation models unless a schema contract is rigidly enforced); weaker shared-type story for offline POS; AI agents must switch mental models more often.
- **Fit:** Attractive if the team were backend-data-heavy and larger. For MillQ’s tiny team and closed operational loop across UI + domain, the split is a net drag.

**Option C — TypeScript frontend + JVM backend**

- **Pros:** Strongest default for strict typing, transactional enterprise systems, and numerical robustness.
- **Cons:** Highest ceremony and slowest iteration for a small team; heaviest local/dev cognitive load; weakest AI-assisted full-stack throughput among the three for this repo shape.
- **Fit:** Reasonable for a larger staffed platform org. Premature for MillQ MVP given charter emphasis on small team, speed with integrity, and AI-assisted delivery.

## 5. Critical review of the preferred direction

Preferred candidate to evaluate (not accept automatically):

- TypeScript monorepo
- React-based web clients
- Node.js backend
- PostgreSQL
- Modular monolith
- REST API initially
- Shared schemas and validation
- Docker Compose for local development

### 5.1 Why this direction survives critical review

1. **Matches confirmed constraints** better than polyglot options for a small team and monorepo.
2. **Maximizes AI-agent effectiveness** where MillQ explicitly invests (Cursor + Codex).
3. **Supports API-first modular monolith** without forcing microservices.
4. **PostgreSQL** covers transactional integrity, constraints, and audit-friendly durability without exotic infrastructure.
5. **React-based clients** are a stable approach for operational UIs and a plausible base for offline-tolerant POS clients later.
6. **REST initially** is enough for the first vertical; avoids premature GraphQL/event complexity.

### 5.2 Why it must not be accepted blindly

1. **Money and quantities are not “free” in TypeScript.** The stack is only acceptable if the project mandates integer minor units and/or decimal types, explicit rounding rules, and tests for restaurant-domain cases (rounding, UoM conversion, write-offs, retries).
2. **Transactional boundaries are application design**, not a framework gift. Sale → automatic write-off → cost impact must be modeled as atomic units of work with idempotency keys.
3. **Exact libraries are not decided here.** Choosing popular ORMs or meta-frameworks without product-specific need would violate charter guidance against premature abstraction and popularity-driven choices.
4. **Offline POS is a product/architecture workstream**, not solved by choosing React. Sync, conflict rules, and partial connectivity behavior remain unresolved and must not be invented.

## 6. Recommended stack definition (no scaffolding)

The following is the **proposed** stack definition for ADR-0001. Exact libraries are deferred unless noted.

| Area | Recommendation | Status |
| --- | --- | --- |
| Primary language(s) | TypeScript for web clients and backend | **Recommended, pending ADR acceptance** |
| Web frontend approach | React-based web clients (SPA or hybrid web app) | **Recommended, pending ADR acceptance**; exact meta-framework **decision deferred** |
| Backend approach | Node.js modular monolith in the monorepo | **Recommended, pending ADR acceptance**; exact HTTP framework **decision deferred** |
| Database | PostgreSQL | **Recommended, pending ADR acceptance** |
| DB access & migrations | Versioned migrations and an explicit database access layer. Exact query, ORM, and migration tooling are deferred. | **Recommended, pending ADR acceptance**; exact tooling **decision deferred** |
| API style | REST over HTTP for initial boundaries; versionable resource APIs | **Recommended, pending ADR acceptance** |
| Validation approach | Shared schema contracts used by API and clients | **Recommended, pending ADR acceptance**; exact library **decision deferred** |
| Test layers | Unit (domain/money/UoM), integration (DB transactions/idempotency), API tests, critical UI flow tests later | **Recommended, pending ADR acceptance**; runners **decision deferred** |
| Background jobs | Background processing will remain within the modular monolith. PostgreSQL-backed jobs may be used if asynchronous execution is required. Exact topology and tooling are deferred. | **Recommended, pending ADR acceptance**; exact topology and tooling **decision deferred** |
| Local development | Docker Compose for PostgreSQL and app dependencies; macOS host tooling for TypeScript | **Recommended, pending ADR acceptance** |
| Deployment direction | Single backend service + web assets; container-friendly; no Kubernetes | **Recommended, pending ADR acceptance**; cloud vendor **decision deferred** |
| Observability direction | Structured logs, request correlation IDs, error tracking; metrics later as needed | **Recommended, pending ADR acceptance**; vendors **decision deferred** |
| Offline POS direction | Design for offline/unstable network as a client capability with server reconciliation; must not invent fiscal rules | **Recommended, pending ADR acceptance**; protocol and mechanism **decision deferred** |

### 6.1 Explicit non-goals for this decision

- Microservices
- Kubernetes
- Event-driven core architecture
- Multi-region active-active
- Fiscal printer / Vietnam tax engine selection
- Delivery aggregator integrations

## 7. Material risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Floating-point money bugs in TypeScript | Mandate decimal/integer money model + domain tests before sales/costing land |
| Weak transaction discipline in Node | Require explicit unit-of-work patterns for inventory/finance; integration tests for concurrent updates |
| Hidden polyglot creep | Reject adding a second backend language without a new ADR |
| Over-selecting frameworks early | Keep library choices deferred until first vertical implementation Issues |
| Offline POS over-promising | Keep offline as a direction; define sync rules in a later ADR/product spec |

## 8. Unresolved questions

1. Exact React delivery shape (SPA vs SSR/hybrid) for admin vs POS.
2. Exact Node HTTP framework and module layout conventions inside `apps/` / `packages/`.
3. Exact migration and query tooling for PostgreSQL.
4. Shared schema technology for validation and types.
5. AuthN/AuthZ approach for employees/restaurants (product + security decision).
6. Money representation standard (integer minor units vs decimal type) — **must be decided before sales/costing implementation**.
7. Unit-of-measure model and conversion rules — product-owned, not invented here.
8. Offline conflict resolution rules for POS — product-owned later.
9. Hosting vendor and backup/PITR strategy.
10. Whether background work runs in-process worker or separate worker process in Compose.

## 9. Recommendation summary

**Recommend Option A:** TypeScript monorepo with React-based web clients, Node.js modular monolith, PostgreSQL, REST APIs initially, shared schema validation approach, and Docker Compose local development.

This is the best balance of charter constraints, small-team speed, AI-assisted development, and long-term modular-monolith suitability—**provided** monetary/quantity correctness, transactions, idempotency, and auditability are enforced as design rules.

Option B and C remain viable fallbacks if ADR review rejects TypeScript-for-backend on numerical/transactional grounds. Option D is not justified now.

## 10. Validation plan (for ADR acceptance)

Before implementation scaffolding:

1. Independent architecture review of this analysis and ADR-0001.
2. Explicit product/owner approval of ADR-0001.
3. Open follow-up Issues for deferred decisions that block coding (money model, auth, module layout).
4. Confirm GitHub Actions can run TypeScript lint/test and PostgreSQL integration tests in CI when CI is introduced.
