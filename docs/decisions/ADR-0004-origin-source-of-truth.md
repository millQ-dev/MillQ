# ADR-0004: Cursor Origin is the source of truth; GitHub is a backup mirror

- **Status:** Accepted (product-owner instruction, 2026-08-30). Independent review of this PR is still required before merge.
- **Date:** 2026-08-30
- **Decision owners:** Product ownership
- **Related work:** [Cloud Agent run — mobile development access](https://cursor.com/agents/bc-d33dc84f-fbfa-4bb4-96a0-0b3f98ca1549)
- **Related process:** [`docs/processes/origin-github-hosting.md`](../processes/origin-github-hosting.md), [`docs/processes/autonomous-development.md`](../processes/autonomous-development.md)

## Context

MillQ’s charter previously named GitHub as the source of truth for code, reviews, and project history. Day-to-day development now runs in Cursor, including Cloud Agents started from any device. The product owner directed that **all project base hosting move into Cursor Origin**, with GitHub kept only as a backup mirror.

This is a material charter change: it relocates where agents clone, branch, open pull requests, and treat history as canonical.

Cursor Origin’s built-in **Sync from GitHub** feature is the opposite of this decision. That flow copies GitHub into Origin, keeps **GitHub as the source**, and passes Origin pushes through to GitHub. MillQ must not leave that mode in place after cutover.

Origin in early beta does not provide a GitHub Issues equivalent. Issues, Actions, and secrets do not move when a GitHub repo is mirrored. After Origin becomes canonical, new work is tracked in Cursor (Cloud Agent runs and Origin pull requests), not by opening new GitHub issues.

## Decision drivers

1. One canonical git host so Cloud Agents, desktop, and phone never write to different histories.
2. Keep GitHub as a recoverable backup, not as a second place to merge work.
3. Do not invent a second issue tracker. Use Cursor surfaces that already exist.
4. Record the cutover so later agents do not assume GitHub is still canonical.

## Considered options

- **Option A:** Keep GitHub as source of truth; use Origin only as a GitHub mirror (Cursor’s default sync).
- **Option B:** Origin-hosted repository as source of truth; GitHub is a one-way backup (push Origin `main` to GitHub; no primary PRs or issue workflow on GitHub).
- **Option C:** Dual-write: agents and humans push independently to both hosts.

## Decision

Adopt **Option B**.

| Area | Decision |
| --- | --- |
| Canonical git host | Cursor Origin (`https://origin.cursor.com/{owner}/MillQ.git`, browse at `https://cursor.com/codebase`) |
| Backup git host | GitHub `https://github.com/millQ-dev/MillQ` — Origin `main` and Origin tags only (not other branches) |
| Auto-merge | Implementation Agent arms merge-when-ready on Level A/B PRs (`origin pr merge --auto`). That is not self-approval. Origin rulesets still require independent approval and CI. Immediate merge and Origin `main` bypass are forbidden. Level C: arm only after owner decision is recorded |
| Who writes GitHub after cutover | Backup automation / service account only. Sole bypass actor on two GitHub rulesets: branch `main` (routine writes blocked) and release/protected tags (create/update/delete restricted) |
| Dual-write | Forbidden. Agents and developers must not push one commit to both remotes |
| Pull requests | Open, review, and merge on Origin. Direct push to Origin `main` is forbidden |
| Review | Independent review is mandatory and may be an authorized independent agent. Authors cannot approve their own change |
| Work tracking | Cloud Agent run URL and/or Origin pull request. Historical GitHub issues remain citations only |
| CI | When CI is introduced, attach it to Origin (Depot, Buildkite, or equivalent) after Detach. GitHub Actions on the backup is optional and not canonical |
| Security reports | Private report to Origin/Cursor repository maintainers. Do not file public GitHub issues |

### Classification

- **Accepted:** Origin is the source of truth; GitHub is backup only; dual-write is forbidden; independent agent review is sufficient except Level C owner decisions; Implementation Agents arm merge-when-ready without that counting as self-approval.
- **Operational gate:** Cutover steps in `docs/processes/origin-github-hosting.md` must be completed so Origin is a **native / detached** repository, not a GitHub-sourced mirror. Rulesets, CI, auto-merge, and backup automation are owner/platform operations and are **not** claimed as live from the GitHub-cloned authoring environment.
- **Deferred:** Exact Origin namespace `{owner}` once confirmed in the codebase UI; wiring of Origin `pull_request.merged` (or equivalent) to the backup job; Origin Rules and Protections contents once configured in the dashboard.

This ADR amends ADR-0001’s “GitHub Actions compatibility” requirement: CI must be runnable against the Origin-hosted repo. Compatibility with GitHub Actions on the backup is no longer a hosting constraint.

## Consequences

### Positive

- Agents started from a phone or laptop share one history.
- Review and merge happen on the same surface as Cloud Agents.
- GitHub remains a recoverable copy if Origin is unavailable.

### Negative / accepted costs

- Origin is early beta. Namespace cannot be renamed during beta. Feature gaps vs GitHub (issues, Actions, public repos) are accepted.
- After **Detach from GitHub**, Cursor stops syncing to GitHub. Backup must be a separate one-way job: Origin `main` → backup identity → GitHub `main`, plus Origin release/protected tags → GitHub, after each merge. On GitHub that identity is the only bypass on the `main` branch ruleset and on the tag ruleset. Origin `main` stays without implementer bypass.
- Historical GitHub issue links stay valid as archive; they are not the live backlog.
- This Cloud Agent run still clones GitHub. Hosting cutover, rulesets, CI apps, and backup credentials cannot be finished from a GitHub-only checkout and must not be reported as done.

## Risks

1. **Two sources of truth** if anyone keeps merging on GitHub after cutover.
2. **Wrong mirror direction** if Origin stays in Sync-from-GitHub mode: GitHub remains canonical despite this ADR.
3. **Diverged histories** if Origin already has commits GitHub does not, or the reverse, and cutover is done without comparing SHAs.
4. **Lost work tracking** if new GitHub issues keep being filed and agents ignore them.
5. **Backup drift** if Origin `main` is not pushed to GitHub after each merge, or if developers dual-write instead of using the backup identity.
6. **Owner bottleneck** if independent review is misread as “human owner must click merge on every PR”, or if Implementation Agents are forbidden from arming merge-when-ready.
7. **GitHub backup blocked** if the `main` or tag ruleset has no bypass for the backup identity, or **GitHub workplace restored** if that bypass is given to developers.

## Rejected alternatives

- **Option A:** Rejected. It keeps GitHub as the real base, which contradicts the product-owner instruction.
- **Option C:** Rejected. Independent pushes create conflicting SHAs and unreviewable drift.

## Unresolved questions

1. Confirmed Origin namespace and repository URL.
2. Whether the current Origin copy is already native, a GitHub mirror, or detached.
3. Backup trigger after Origin merge (webhook, automation, or other). The job script exists; it is not verified live.
4. Origin Rules and Protections actually applied to `main`.
5. Where security reports should go once a dedicated Origin contact exists.

## Validation plan

1. Independent review of this ADR, the charter revision, and the autonomous operating model (separate context from the authoring agent). This is Level C governance: owner decision is this instruction; the author must not merge it.
2. After that merge, complete the numbered cutover checklist in `docs/processes/origin-github-hosting.md`, including Detach, a test Origin Cloud Agent, independent review, auto-merge, and backup SHA match.
3. Confirm Origin Settings → General no longer lists GitHub as source.
4. Confirm only the backup identity can write GitHub `main` and mutate release/protected tags, via explicit bypass on **both** GitHub rulesets.
5. Disable GitHub as a workplace (no GitHub PR merges, no new GitHub issues as the queue).

## Conditions for revisiting the decision

Revisit this ADR if Origin hosting is withdrawn, cannot meet backup/export needs, or product ownership returns canonical hosting to GitHub. Until superseded, agents must not treat GitHub as the writable source of truth.
