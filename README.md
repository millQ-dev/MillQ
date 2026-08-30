# MillQ

MillQ is a modern restaurant management platform for Vietnam.

The long-term product vision includes POS, inventory management, warehouse accounting, purchasing, recipes, production, food cost, CRM, analytics, finance, employee management, and business automation.

This repository currently contains only the project foundation. Application code, frameworks, and infrastructure decisions will be added in later stages.

## Hosting

**Cursor Origin is the source of truth.** GitHub `millQ-dev/MillQ` is a backup mirror only.

- Canonical remote: `https://origin.cursor.com/{owner}/MillQ.git` (replace `{owner}` with the Origin codebase name)
- Browse: [cursor.com/codebase](https://cursor.com/codebase)
- Start Cloud Agents against the Origin repository
- Do not merge work on GitHub

Details: [`docs/processes/origin-github-hosting.md`](docs/processes/origin-github-hosting.md) and [ADR-0004](docs/decisions/ADR-0004-origin-source-of-truth.md).

## Goals

- Build a durable enterprise SaaS foundation for restaurant operations
- Support multi-module growth without premature technology lock-in
- Keep architecture, documentation, and delivery practices explicit and reviewable

## Repository structure

```text
.
├── apps/             # Deployable applications (future)
├── packages/         # Shared libraries and modules (future)
├── infrastructure/   # Infrastructure definitions (future)
├── docs/             # Product and engineering documentation
├── tests/            # Cross-cutting or shared test assets (future)
└── .github/          # Templates retained for the GitHub backup remote; not the live workflow
```

## Status

Foundation only. No application runtime, dependencies, or CI/CD are defined yet.
