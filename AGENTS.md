# Agent guidelines

Rules for AI agents working in the MillQ repository.

## Core rules

- Never invent business logic. Implement only what is specified in requirements, docs, or explicit user instructions.
- Never modify unrelated files. Limit changes to the scope of the current task.
- Always explain architectural decisions when proposing or making structural changes.
- Keep commits atomic. One logical change per commit.
- Follow repository conventions documented in `README.md`, `CONTRIBUTING.md`, and future architecture docs.
- Prefer small pull requests that are easy to review and revert.

## Working principles

- Prefer clarity over cleverness.
- Do not introduce frameworks, dependencies, or infrastructure unless explicitly requested.
- When requirements are ambiguous, ask before inventing behavior.
- Preserve the existing repository structure unless a change is required and explained.
