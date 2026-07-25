# Contributing to MillQ

Thank you for contributing. Keep changes focused, reviewable, and aligned with the current repository foundation.

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

1. Create a branch from the default branch (`main`).
2. Make a focused set of changes.
3. Open a pull request with:
   - a clear summary of what changed and why
   - notes on risks, follow-ups, or unanswered questions
   - a short test plan (even for docs: what was checked)
4. Keep pull requests small. Prefer multiple narrow PRs over one large PR.
5. Do not mix unrelated refactors with feature work.

## Code review expectations

- Reviewers check correctness, clarity, scope, and alignment with repository conventions.
- Authors respond to feedback or explain trade-offs before merge.
- Request changes when scope creeps, decisions are unexplained, or docs/conventions are violated.
- Approve only when the PR is understandable and ready to land as-is.
