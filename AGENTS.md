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

Do not start implementation on ambiguous product rules.

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

- GitHub is the source of truth.
- Work must be linked to an Issue.
- Allowed branch prefixes are `feature/`, `fix/`, and `chore/`.
- Commits must be atomic and use Conventional Commit style.
- Pull Requests must include summary, scope, testing, risks, and linked Issue.
- Do not push directly to `main`.
- Do not merge your own work without the required review process.

## 9. AI role separation

- Cursor is the primary interactive workstation.
- Codex is for isolated autonomous tasks.
- Implementation and review for the same change must use separate contexts.
- An agent must not approve its own unreviewed implementation.
- Reviewers should inspect correctness, scope, tests, security, and documentation.

## 10. Definition of Done

A change is complete only when:

- acceptance criteria are met
- relevant tests pass
- documentation is updated
- migrations are reviewed when applicable
- the PR is linked to the relevant Issue
- review is complete
- CI passes when CI exists

## 11. Required completion report

At the end of every task, the agent must report:

- files changed
- decisions made
- assumptions
- tests performed
- known limitations or follow-up work
