# CI workflow source

GitHub OAuth tokens without the `workflow` scope cannot push files under `.github/workflows/`.

Canonical CI definition for this foundation block:

- [`github-actions-ci.yml`](./github-actions-ci.yml)

To activate on GitHub:

1. `gh auth refresh -h github.com -s workflow`

2. Copy this file to `.github/workflows/ci.yml` and push

Or paste the same content via the GitHub UI (Actions → New workflow).
