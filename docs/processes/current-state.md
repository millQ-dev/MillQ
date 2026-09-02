# MillQ Current State

**Checkpoint:** Origin `main` @ `fee3e84` — **foundation merged** (2026-09-01)  
**Canonical host:** Cursor Origin (`https://origin.cursor.com/millqdev/MillQ.git`)  
**Backup host:** GitHub `https://github.com/millQ-dev/MillQ.git` (mirror only)  
**Origin PR:** https://cursor.com/codebase/millqdev/MillQ/pull/1 — **merged**  
**Updated:** 2026-09-01

## Foundation merge

Operational Core foundation merged to Origin `main` via PR #1 with **temporary CI exception** (see [`foundation-merge-ci-exception.md`](foundation-merge-ci-exception.md)).

Merge gates used: local checks + strategic APPROVE WITH CONDITIONS + Origin ruleset.

**Origin CI:** still **not attached** — must be attached before next serious application merge.

**GitHub backup:** as of this checkpoint, GitHub `main` may still lag Origin until backup automation runs (`scripts/backup-origin-to-github.sh` / owner wiring). Verify before treating GitHub as current.

## Accepted decisions

| ADR | Status | Topic |
| --- | --- | --- |
| ADR-0001 | Accepted | TypeScript monorepo, React, Node modular monolith, PostgreSQL |
| ADR-0002 | Accepted | Money, quantity, units, rounding |
| ADR-0003 | Accepted | Yield, preparations, moving-average costing |
| ADR-0004 | Accepted | Cursor Origin is source of truth; GitHub is backup |
| ADR-0006 | Accepted | Production Intelligence boundary |
| ADR-0007 | Accepted | Concrete foundation scaffolding stack |

## Still Proposed / separate review

| Item | Status |
| --- | --- |
| Block B domain-boundary ADRs (draft branch) | Proposed — **not** Origin hosting ADR-0004 |
| Block B questions B-01–B-18 | Open |

## What exists on Origin main

- Runnable monorepo: `@millq/domain`, `@millq/contracts`, `@millq/api`, `@millq/web`
- Architecture docs + ADR-0006/0007 + fact feed guardrail
- Dormant GHA definition (backup-compatible, not Origin merge gate)

## Not started

- Block C (GoodsReceived / inventory vertical)
- Block B acceptance

## Next recommended sequence (Product Owner)

1. ~~Merge foundation~~ — **done** (`fee3e84`)
2. Verify GitHub backup received Origin `main`
3. **Block B** — accept domain-boundary ADRs
4. Attach Origin CI before next application block
5. **Block C** — only after Block B
