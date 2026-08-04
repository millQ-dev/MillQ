# ADR-0001: Initial technology stack

- **Status:** Accepted
- **Date:** 2026-07-25
- **Decision owners:** Product ownership and System Architect (approval required before implementation)
- **Related issue:** [#6 — Select the initial technology stack](https://github.com/millQ-dev/MillQ/issues/6)
- **Related analysis:** [`docs/architecture/technology-stack-analysis.md`](../architecture/technology-stack-analysis.md)

## Context

MillQ is ready to plan implementation of the first restaurant operations vertical:

Restaurant → Employee → Ingredient → Recipe → Goods Receipt → Sale → Automatic Write-off → Food Cost Report

The repository foundation, charter, agent instructions, and collaboration workflow exist. No application runtime has been selected yet.

The stack must support:

- modular monolith and monorepo
- API-first domain boundaries
- transactional inventory and financial operations
- idempotent critical retries
- auditability
- practical macOS + Docker local development
- GitHub Actions compatibility
- effective AI-assisted development in Cursor and Codex
- a small initial team

Out of scope for this decision: microservices, Kubernetes, premature event-driven architecture, unnecessary cloud lock-in, and any invented Vietnam legal/tax/fiscal-device requirements.

## Decision drivers

1. Deliver the first vertical with operational accuracy, not decorative complexity.
2. Minimize cognitive and toolchain overhead for a small team.
3. Keep frontend and backend co-evolving inside one monorepo.
4. Preserve transactional integrity, audit trails, and deliberate money/quantity handling.
5. Maximize AI-agent effectiveness without sacrificing review discipline.
6. Prefer reversible library choices; seek approval for irreversible language/database strategy.
7. Avoid popularity-driven technology selection.

## Considered options

- **Option A:** TypeScript across frontend and backend
- **Option B:** TypeScript frontend with Python backend
- **Option C:** TypeScript frontend with a JVM backend
- **Option D:** Alternative stack only if materially stronger (screened; not advanced)

Full comparison: `docs/architecture/technology-stack-analysis.md`.

## Proposed decision

Adopt **Option A** as the initial MillQ stack direction:

| Area | Decision |
| --- | --- |
| Primary languages | TypeScript for web clients and backend |
| Web frontend approach | React-based web clients |
| Backend approach | Node.js modular monolith in the monorepo |
| Database | PostgreSQL |
| Database access & migrations | Versioned migrations and an explicit database access layer. Exact query, ORM, and migration tooling are deferred. |
| API style | REST over HTTP initially |
| Validation | Shared schema contracts across API and clients; exact library deferred |
| Test layers | Domain/unit, database integration, API, and later critical UI flows |
| Background jobs | Background processing will remain within the modular monolith. PostgreSQL-backed jobs may be used if asynchronous execution is required. Exact topology and tooling are deferred. |
| Local development | Docker Compose for dependent services (at minimum PostgreSQL) |
| Deployment direction | Container-friendly single backend + web assets; no Kubernetes |
| Observability direction | Structured logs + correlation IDs first; vendors deferred |
| Offline POS direction | Client-capable offline/unstable-network support with server reconciliation; protocol deferred |

### Classification

- **Recommended, pending ADR acceptance:** TypeScript monorepo; React-based clients; Node.js modular monolith; PostgreSQL; REST initially; shared-schema validation approach; Docker Compose local development; no microservices/Kubernetes.
- **Decisions deferred:** exact React meta-framework, Node HTTP framework, query/ORM/migration tooling, validation library, test runners, background-processing topology and tooling, hosting vendor, offline sync protocol, auth mechanism details.
- **Requires explicit follow-up approval before sales/costing code:** money and quantity representation rules (integer minor units and/or decimal types, rounding policy).

### Implementation gate

No sales, inventory valuation, recipe write-off, or food-cost implementation may begin until a dedicated money, quantity, unit-of-measure, and rounding decision is accepted.

## Consequences

### Positive

- One language across most of the codebase improves speed, reviewability, and AI-assisted changes.
- Monorepo + shared schemas reduce contract drift between POS/admin clients and backend.
- PostgreSQL provides a durable transactional foundation for inventory and financial records.
- Deployment and local development stay simple enough for a small team.

### Negative / accepted costs

- Numerical and transactional correctness must be enforced by design and tests; they are not automatic.
- Some enterprise teams may prefer JVM/.NET defaults; MillQ accepts TypeScript with strict domain rules instead.
- Deferred library choices mean early implementation Issues must include short ADR addenda or task-level decisions when a concrete tool becomes necessary.

## Risks

1. **Money/quantity defects** if JavaScript numbers are used naively.
2. **Lost updates / double write-offs** if transactions and idempotency keys are incomplete.
3. **Framework sprawl** if popular tools are introduced without product-specific need.
4. **Offline POS ambiguity** if sync rules are invented during coding instead of specified.
5. **Scope creep into polyglot backends** without a new ADR.

## Rejected alternatives

- **Option B (Python backend):** strong numerically, but polyglot overhead is not justified for the current team size and AI-assisted monorepo workflow.
- **Option C (JVM backend):** strong for enterprise transactional systems, but too heavy for MillQ’s small-team MVP iteration speed and AI-assisted full-stack flow.
- **Option D (.NET/Go and similar):** no materially stronger overall case under current constraints.
- **Microservices / Kubernetes / event-driven core:** excluded by charter and Issue #6 constraints.
- **Non-PostgreSQL primary database:** no material reason found to reject PostgreSQL as default candidate.

## Unresolved questions

1. Money/quantity representation and rounding rules (blocker before sales & food-cost implementation).
2. AuthN/AuthZ model for employees and restaurants.
3. Exact module boundaries package layout under `apps/` and `packages/`.
4. Exact migration/query/validation/job libraries.
5. React delivery shape for admin vs POS.
6. Offline conflict resolution and reconciliation rules.
7. Hosting, backup, and point-in-time recovery strategy.
8. Vietnam localization requirements that are legal/tax/fiscal in nature (must come from product ownership; not invented here).

## Validation plan

1. Independent review of the analysis and this ADR (separate context from the authoring agent).
2. Explicit acceptance by decision owners (move status from **Proposed** to **Accepted**).
3. Create follow-up Issues for deferred blockers (money model, auth, module layout).
4. When CI is introduced, verify TypeScript checks and PostgreSQL-backed integration tests can run on GitHub Actions.
5. Re-check that first implementation PRs do not silently introduce rejected alternatives.

## Conditions for revisiting the decision

Revisit this ADR if any of the following become true:

- Production defects show TypeScript cannot meet inventory/financial integrity even with enforced money/transaction patterns.
- Team composition changes materially toward a backend-specialized staff where polyglot cost is acceptable.
- Product requirements introduce workloads that are demonstrably better served by another backend platform, with measured evidence.
- Offline POS or reporting needs force a stack change that cannot be contained behind API boundaries.
- Decision owners reject this proposal during review.

Until revisited and superseded, implementation must not adopt a different primary language strategy, database family, or distributed runtime model without a new ADR.
