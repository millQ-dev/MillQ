# MillQ Agent Instructions

Operational rules for all AI agents working in the MillQ repository. This file is practical and enforceable. Product direction, scope, and governance live in `PROJECT_CHARTER.md` — do not treat this file as a substitute for the charter.

## 1. Authority and precedence

Resolve guidance in this order:

1. Explicit task instructions
2. `PROJECT_CHARTER.md`
3. Accepted ADRs
4. Product and architecture documentation
5. `AGENTS.md`
6. Existing repository conventions

Lower-level instructions must not contradict higher-level ones. If they conflict, follow the higher authority and escalate the conflict.

## 2. Before starting work

Before making changes, every agent must:

- read `PROJECT_CHARTER.md`
- inspect relevant documentation and existing code
- confirm the task scope and acceptance criteria
- identify assumptions, dependencies, and risks
- stop and escalate when business logic is unclear

Do not start implementation on ambiguous product rules. If the change is Level C and no owner decision exists, stop.

Classify the change as Level A, B, or C before editing (see `docs/processes/autonomous-development.md`). If unsure, use the stricter class. Unsure B vs C means C.

## 3. Scope discipline

- Modify only files necessary for the task.
- Do not perform unrelated refactoring.
- Do not introduce dependencies without justification.
- Do not change architecture silently.
- Do not generate speculative functionality.
- Do not invent business rules.

## 4. Architecture and domain rules

- Prefer a modular monolith first.
- Keep work within the monorepo structure.
- Preserve domain boundaries and ownership.
- Critical inventory and financial operations require transactional integrity.
- Retried critical operations must be idempotent.
- Inventory and financial events must remain auditable.
- Significant architecture decisions require an ADR.
- Avoid premature abstraction.

Do not select frameworks or languages unless an approved decision already exists.

## 5. Implementation rules

- Prefer small, reviewable changes.
- Keep code explicit and readable.
- Follow existing repository conventions.
- Validate inputs and failure cases.
- Handle rounding and monetary values deliberately.
- Preserve backward compatibility unless a breaking change is approved.
- Do not leave dead code or commented-out implementation.
- Never commit secrets or credentials.

## 6. Testing rules

Add or update tests relevant to the change.

When the change touches restaurant-domain behavior, cover applicable cases such as:

- rounding
- units of measurement and conversions
- inventory balances
- recipe write-offs
- returns and cancellations
- duplicate or retried operations
- concurrent operations
- offline/reconnect behavior

Agents must report what was tested and what was not tested.

## 7. Documentation rules

Update documentation when behavior, architecture, setup, API, or workflows change.

Use the intended docs layout:

- `docs/product/`
- `docs/architecture/`
- `docs/decisions/`
- `docs/processes/`
- `docs/glossary.md`

Do not let docs drift from implemented behavior.

## 8. Git and Pull Request rules

- Cursor Origin is the only source of truth after cutover. GitHub is a backup mirror only.
- Start Cloud Agents against the Origin repository, not GitHub.
- Create branches from Origin `main`. Open pull requests on Origin only.
- Work must be linked to a Cloud Agent run and/or an Origin pull request. Do not open new GitHub issues for the same work.
- Every PR must declare autonomy level **A**, **B**, or **C**.
- Allowed branch prefixes are `feature/`, `fix/`, and `chore/`.
- Commits must be atomic and use Conventional Commit style.
- Pull Requests must include summary, scope, testing, risks, linked work item, and autonomy level.
- **Do not push directly to `main`.** Protection stays on. Autonomy is auto-merge after review and CI, not an unprotected default branch.
- **Do not approve or merge your own implementation.** Independent review is mandatory and may be an authorized independent agent.
- **Do not push to GitHub.** After cutover only backup automation writes to GitHub. Dual-write is forbidden.
- Follow `docs/processes/origin-github-hosting.md`, `docs/processes/autonomous-development.md`, and ADR-0004. Do not use Origin’s Sync-from-GitHub mode (that keeps GitHub as source).

## 9. AI role separation

- Cursor is the primary interactive workstation and canonical Origin + Cloud Agent surface.
- Codex is for isolated autonomous tasks against Origin, not a second GitHub history.
- Implementation Agent, Review Agent, and Fix Agent are defined in `docs/processes/autonomous-development.md`.
- Implementation and review for the same change must use separate contexts.
- An agent must not approve its own unreviewed implementation.
- Reviewers inspect correctness, scope, tests, security, documentation, invariants, and whether the declared level is honest.
- Review result is `APPROVE` or `REQUEST CHANGES`. Human owner review is not required on Level A or B PRs.
- Level C needs an owner decision on the proposal/ADR. After that, implementation and review are autonomous; the owner does not have to merge.

## 10. Definition of Done

A change is complete only when:

- acceptance criteria are met
- autonomy level is declared and correct
- Level C has a recorded owner decision
- relevant tests pass
- documentation is updated
- migrations are reviewed when applicable
- the PR is linked to the relevant Cloud Agent run and/or Origin work item
- independent review is `APPROVE` from a context that did not author the change
- unresolved review threads are empty
- CI passes when CI exists
- Level A/B PRs are eligible for auto-merge (`origin pr merge --auto` once Origin requirements are configured)

## 11. Required completion report

At the end of every task, the agent must report:

- files changed
- decisions made
- assumptions
- tests performed
- known limitations or follow-up work
- autonomy level (A/B/C)
- whether independent review was requested (implementation agents must not self-approve)
