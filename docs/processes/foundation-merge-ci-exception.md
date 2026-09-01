# Foundation merge — temporary CI exception

- **Status:** Active for Origin PR #1 only (foundation block)
- **Date:** 2026-09-01
- **Authority:** Product Owner strategic review (APPROVE WITH CONDITIONS)

## Context

Origin CI is **not attached yet** for `millqdev/MillQ`. The foundation Operational Core block is the first large code merge after Origin cutover.

## Temporary exception (this merge only)

For **Origin PR #1** (foundation Operational Core), merge is permitted **without** attached Origin CI, based on:

1. **Local verification** (recorded in PR): `pnpm install --frozen-lockfile`, `typecheck`, `test`, `build`, migration ×2 idempotency, live PostgreSQL `/health` (`status=ok`, `database=up`)
2. **Independent strategic review** — APPROVE WITH CONDITIONS (2026-09-01)
3. **Origin ruleset** — push protection on `main`; merge via Origin PR workflow

This is a **one-time foundation exception**, not a new norm that CI is optional.

## Not a merge gate

- GitHub Actions (dormant definition under `.github/workflows/` / `infrastructure/ci/`) is **not** required and is **not** canonical after Origin cutover.

## Required before next serious application merge

Attach **Origin CI** or an equivalent automatic merge-gate (per ADR-0004 / ADR-0001 amended guidance) before the next major applied-code block (expected: after Block B acceptance, before or as part of Block C).

## After foundation merge (Product Owner sequence)

1. Record new Origin `main` SHA
2. Verify GitHub backup received the merge
3. Mark foundation checkpoint
4. Review Block B domain boundaries (separate from Origin hosting ADR-0004)
5. Only then start Block C (GoodsReceived / inventory / costing vertical)
