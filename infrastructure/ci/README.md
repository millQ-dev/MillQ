# CI workflow definitions

## Origin (canonical)

**Origin CI is not attached yet.** Merge gates today are:

- local `pnpm install --frozen-lockfile` / typecheck / test / build
- migrate + `/health` smoke when Postgres is available
- independent Origin review
- Origin ruleset

Do not claim Origin CI is green until a Cursor Origin CI integration is actually wired.

## GitHub Actions (dormant / backup-compatible)

Files:

- `.github/workflows/ci.yml` (same definition)
- [`github-actions-ci.yml`](./github-actions-ci.yml) (copy under infrastructure)

These are **not** Origin merge gates. They remain for future backup-remote compatibility only. Do not dual-write or treat GitHub Actions as the approval path after Origin cutover.
