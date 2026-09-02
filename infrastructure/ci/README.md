# CI workflow definitions

## Origin (canonical)

**Origin merge CI is Depot**, defined in [`.depot/workflows/ci.yml`](../../.depot/workflows/ci.yml). That file is the only CI definition that is a merge gate once Depot is attached to Origin.

Merge also still requires independent Origin review and the Origin ruleset.

Do not treat GitHub Actions as the Origin approval path.

## GitHub Actions (dormant / backup-compatible)

Files:

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — same workflow text, kept so a GitHub backup clone could run Actions later
- [`github-actions-ci.yml`](./github-actions-ci.yml) — reference/legacy copy under `infrastructure/ci`

These are **not** Origin merge gates and must not become a second CI source of truth. Edit Depot first; copy the same test/build steps into the two GitHub copies only to avoid silent drift. Do not dual-write product changes through GitHub Actions.
