# Contributing to MillQ

Thank you for contributing. Keep changes focused, reviewable, and aligned with the current repository foundation.

Canonical hosting is **Cursor Origin**. GitHub is a backup mirror. Clone, push, and open pull requests on Origin. Do not push to GitHub. See [`docs/processes/origin-github-hosting.md`](docs/processes/origin-github-hosting.md) and [`docs/processes/autonomous-development.md`](docs/processes/autonomous-development.md).

Owners are not a required reviewer on every PR. Independent review may be an authorized agent. Direct push to `main` is forbidden. Level A and B PRs auto-merge when review and CI requirements pass.

## Branch naming

Use short, descriptive branch names with a type prefix:

- `feat/<short-description>` — new capability
- `fix/<short-description>` — bug fix
- `docs/<short-description>` — documentation only
- `chore/<short-description>` — maintenance, cleanup, tooling
- `refactor/<short-description>` — internal restructuring without behavior change

Examples:

- `feat/pos-order-draft`
- `docs/architecture-overview`
- `chore/repo-foundation`

## Commit message convention

Follow Conventional Commits:

```text
<type>(optional-scope): <short summary>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`.

Guidelines:

- Use the imperative mood (`add`, `fix`, `update`)
- Keep the subject concise and specific
- Explain why in the body when the reason is not obvious
- Keep commits atomic

Examples:

```text
docs: add repository foundation guidelines
chore: ignore local editor artifacts
```

## Pull request workflow

1. Create a branch from the default branch (`main`) on Origin.
2. Make a focused set of changes.
3. Open a pull request **on Origin** (not GitHub) with:
   - autonomy level **A**, **B**, or **C**
   - a clear summary of what changed and why
   - the linked Cloud Agent run or other Origin work item
   - notes on risks, follow-ups, or unanswered questions
   - a short test plan (even for docs: what was checked)
4. Keep pull requests small. Prefer multiple narrow PRs over one large PR.
5. Do not mix unrelated refactors with feature work.
6. Request an **independent** Review Agent. The implementation agent must not approve the PR.
7. After `APPROVE`, CI (when it exists), and empty review threads, Level A/B PRs use auto-merge (`origin pr merge --auto`). Do not push to `main`.
8. GitHub backup is updated by backup automation after Origin merge — never by a parallel GitHub PR or dual-write from the implementer.

## Code review expectations

Independent review is mandatory and may be performed by an authorized independent agent. It does not have to be a human owner.

- Reviewers check correctness, clarity, scope, tests, security, docs, invariants, and autonomy-level classification.
- Result is `APPROVE` or `REQUEST CHANGES`.
- Authors (or a Fix Agent) respond to feedback before merge.
- Request changes when scope creeps, the level is under-classified, decisions are unexplained, or docs/conventions are violated.
- The author must not approve their own change.
- Approve only when the PR is understandable and ready to land as-is.
