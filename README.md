# MillQ

MillQ is a modern restaurant management platform for Vietnam.

The long-term product vision includes POS, inventory management, warehouse accounting, purchasing, recipes, production, food cost, CRM, analytics, finance, employee management, and business automation.

This repository currently contains only the project foundation. Application code, frameworks, and infrastructure decisions will be added in later stages.

## Hosting

**Cursor Origin is the source of truth.** GitHub `millQ-dev/MillQ` is a backup mirror only.

- Canonical remote: `https://origin.cursor.com/{owner}/MillQ.git` (replace `{owner}` with the Origin codebase name)
- Browse: [cursor.com/codebase](https://cursor.com/codebase)
- Start Cloud Agents against the Origin repository
- Open PRs on Origin; Implementation Agent arms merge-when-ready; independent agent review; ruleset merges for Level A/B
- Do not merge work on GitHub; do not dual-write
- After cutover only the backup identity writes GitHub `main`, as the sole GitHub ruleset bypass

Details: [`docs/processes/origin-github-hosting.md`](docs/processes/origin-github-hosting.md), [`docs/processes/autonomous-development.md`](docs/processes/autonomous-development.md), and [ADR-0004](docs/decisions/ADR-0004-origin-source-of-truth.md).

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
├── scripts/          # Operational scripts (GitHub backup job is not live until wired)
├── tests/            # Cross-cutting or shared test assets (future)
└── .github/          # Templates retained for the GitHub backup remote; not the live workflow
```

## Status

Foundation only. No application runtime is defined yet. Hosting, autonomy levels, and Origin/GitHub backup **process** are defined; Origin Detach, rulesets, CI, auto-merge, and backup automation are **not** verified live from this checkout.
