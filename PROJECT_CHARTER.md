# MillQ Project Charter

This document is the governing charter for MillQ. It defines product direction, development principles, decision-making rules, scope boundaries, quality expectations, and AI-agent responsibilities. All contributors and agents must treat it as the highest-level project authority unless superseded by an explicitly approved charter revision.

## 1. Mission

MillQ exists to give restaurant businesses in Vietnam a reliable operating system for daily work and financial control. The mission is to replace fragmented and primitive local tooling with a coherent platform that records operations accurately, exposes true food cost and unit economics, and supports growth without sacrificing auditability or trust in the data.

## 2. Product Vision

MillQ will become a modular restaurant management platform covering the full operating cycle of a food business: sales, inventory, purchasing, production, costing, finance, analytics, people, CRM, and automation.

The vision is product-led, not technology-led. Long-term modules may include POS, inventory and warehouse accounting, ingredients and recipes, purchasing and goods receipt, production and write-offs, food cost control, finance and unit economics, analytics, employee management, CRM, and business automation. Technology choices remain deferred until architecture decisions are made deliberately and recorded.

## 3. Initial Target Market

The initial market is restaurant businesses operating in Vietnam.

The first focus is Russian-speaking founders and operators who already understand advanced restaurant management systems, but currently lack a local platform with comparable operational depth. Early product design should respect their expectations for inventory accuracy, costing, and process discipline while remaining practical for Vietnamese operating conditions, suppliers, and day-to-day restaurant workflows.

## 4. Core Product Principles

- **Operational accuracy over visual complexity.** Correct stock, cost, and sales data matter more than decorative UI.
- **Deep restaurant economics.** Every material flow should support trustworthy food cost and unit economics.
- **Simple daily workflows.** Frontline staff must complete routine tasks quickly with minimal training.
- **Reliable inventory accounting.** Stock movements must be complete, consistent, and reconcilable.
- **Auditability.** Financial and inventory changes must be traceable to who did what, when, and why.
- **Localization for Vietnam.** Language, tax/currency realities, supplier practices, and local operating patterns must be first-class.
- **Modular growth.** The platform should expand by coherent modules without forcing a rewrite.
- **Offline and unstable-network tolerance where required.** Critical operational flows must degrade gracefully under poor connectivity.
- **Security and data integrity.** Access control, validation, and durable records are non-negotiable.

## 5. Initial Product Vertical

The first complete business flow is:

Restaurant → Employee → Ingredient → Recipe → Goods Receipt → Sale → Automatic Write-off → Food Cost Report

This vertical is the proof that MillQ can connect people, materials, recipes, procurement, sales, and costing into one closed operational loop.

## 6. MVP Scope

The initial MVP includes only the capabilities required to execute and report on the first complete vertical end to end:

- restaurant and employee setup needed to operate the flow
- ingredient master data
- recipes linking ingredients to sellable items
- goods receipt into inventory
- sale recording
- automatic write-off of ingredients based on recipes and sales
- food cost reporting derived from the resulting movements

Anything not required to complete, verify, and trust this loop is deferred.

## 7. Out of Scope for the Initial MVP

The following are explicitly excluded from the initial MVP:

- marketplace
- delivery aggregator integrations
- payroll
- full CRM
- loyalty program
- advanced marketing automation
- franchise management
- microservices decomposition
- Kubernetes
- premature multi-country expansion

These items may be reconsidered later only through normal product and architecture decision processes.

## 8. Architecture Principles

- Start with a **modular monolith**.
- Keep the codebase in a **monorepo**.
- Define **API-first boundaries** between domains and clients.
- Maintain **clear domain ownership**.
- Preserve **transactional integrity** for inventory and financial operations.
- Require **idempotency** for critical operations that may be retried.
- Maintain an **audit trail** for financial and inventory events.
- **Avoid premature abstraction**.
- Record significant architecture decisions as **ADRs**.

This charter does not select frameworks, programming languages, cloud vendors, or infrastructure platforms.

## 9. Development Workflow

- **GitHub is the source of truth** for code, reviews, and project history.
- Work is planned and tracked through **Issues**.
- Implementation happens on **feature branches**.
- Use branch naming conventions `feature/*`, `fix/*`, and `chore/*`.
- Changes land through **Pull Requests**.
- The **main branch is protected**.
- Prefer **small atomic changes** over large mixed commits.
- Require **independent review** before merge.
- Once CI exists, **CI must pass before merge**.

## 10. AI Agent Operating Model

MillQ uses specialized AI-agent roles. A single person or tool may support multiple roles across the project, but implementation and review for the same change must use separate contexts.

| Role | Responsibility |
| --- | --- |
| Product Analyst | Clarify requirements, acceptance criteria, and scope boundaries |
| System Architect | Define structure, boundaries, trade-offs, and ADRs |
| Implementation Agent | Implement approved changes inside the stated scope |
| Autonomous Developer | Execute isolated, well-scoped tasks with minimal supervision |
| Reviewer | Critically review correctness, scope, risk, and convention adherence |
| QA Agent | Validate acceptance criteria, regressions, and test coverage |
| Security Agent | Assess auth, data integrity, secrets handling, and abuse risks |
| Documentation Agent | Keep charter-aligned docs accurate and current |

Operating rules:

- Agents must **not invent business logic**.
- Agents must **not edit unrelated files**.
- Agents must **explain assumptions**.
- **Implementation and review must be performed by separate contexts**.
- **Cursor** is the primary workstation for interactive development.
- **Codex** is used for isolated autonomous tasks.
- **GitHub** remains the source of truth for collaboration and history.

## 11. Definition of Done

A task is complete only when all of the following are true:

- acceptance criteria are met
- implementation is reviewed
- tests pass
- documentation is updated where relevant
- migrations are checked when schema changes are involved
- the Pull Request is linked to the relevant Issue
- CI passes when CI exists

## 12. Decision-Making

- **Product decisions** belong to product ownership.
- **Architecture decisions** require an ADR.
- **Uncertain business logic** must be escalated rather than invented.
- **Irreversible decisions** require explicit approval.
- **Reversible decisions** should prefer speed and simplicity.

## 13. Documentation Hierarchy

Intended documentation structure:

- `PROJECT_CHARTER.md` — governing project charter
- `README.md` — repository orientation
- `AGENTS.md` — rules for AI agents
- `docs/product/` — product specs and scope artifacts
- `docs/architecture/` — system design and domain boundaries
- `docs/decisions/` — Architecture Decision Records
- `docs/processes/` — engineering and delivery processes
- `docs/glossary.md` — shared terminology

Lower-level documents must not contradict this charter. If they conflict, the charter prevails until revised.

## 14. Change Control

Changes to this charter must be made through a dedicated Pull Request with a clear rationale. Editorial corrections may be small; changes to mission, scope, principles, workflow, or decision rights are material and require explicit review before merge.
