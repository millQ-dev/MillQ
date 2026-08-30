# ADR-0004: Cursor Origin is the source of truth; GitHub is a backup mirror

- **Status:** Accepted (product-owner instruction, 2026-08-30). Independent review of this PR is still required before merge.
- **Date:** 2026-08-30
- **Decision owners:** Product ownership
- **Related work:** [Cloud Agent run — mobile development access](https://cursor.com/agents/bc-d33dc84f-fbfa-4bb4-96a0-0b3f98ca1549)
- **Related process:** [`docs/processes/origin-github-hosting.md`](../processes/origin-github-hosting.md)

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
| Backup git host | GitHub `https://github.com/millQ-dev/MillQ` — mirror of Origin `main` (and tags) only |
| Pull requests | Open, review, and merge on Origin |
| Cloud Agents | Start against the Origin repository, not against GitHub |
| Work tracking | Cloud Agent run URL and/or Origin pull request. Historical GitHub issues remain citations only |
| CI | When CI is introduced, attach it to Origin (Depot, Buildkite, or equivalent). GitHub Actions on the backup is optional and not canonical |
| Security reports | Private report to Origin/Cursor repository maintainers. Do not file public GitHub issues |

### Classification

- **Accepted:** Origin is the source of truth; GitHub is backup only.
- **Operational gate:** Cutover steps in `docs/processes/origin-github-hosting.md` must be completed so Origin is a **native / detached** repository, not a GitHub-sourced mirror.
- **Deferred:** Exact Origin namespace `{owner}` once confirmed in the codebase UI; automated Origin→GitHub backup if Cursor later ships a stable outbound GitHub mirror.

This ADR amends ADR-0001’s “GitHub Actions compatibility” requirement: CI must be runnable against the Origin-hosted repo. Compatibility with GitHub Actions on the backup is no longer a hosting constraint.

## Consequences

### Positive

- Agents started from a phone or laptop share one history.
- Review and merge happen on the same surface as Cloud Agents.
- GitHub remains a recoverable copy if Origin is unavailable.

### Negative / accepted costs

- Origin is early beta. Namespace cannot be renamed during beta. Feature gaps vs GitHub (issues, Actions, public repos) are accepted.
- After **Detach from GitHub**, Cursor stops syncing. Backup to GitHub is a deliberate one-way push, not the built-in GitHub→Origin mirror.
- Historical GitHub issue links stay valid as archive; they are not the live backlog.
- This Cloud Agent run still clones GitHub. The hosting cutover is a dashboard action and cannot be finished from a GitHub-only checkout.

## Risks

1. **Two sources of truth** if anyone keeps merging on GitHub after cutover.
2. **Wrong mirror direction** if Origin stays in Sync-from-GitHub mode: GitHub remains canonical despite this ADR.
3. **Diverged histories** if Origin already has commits GitHub does not, or the reverse, and cutover is done without comparing SHAs.
4. **Lost work tracking** if new GitHub issues keep being filed and agents ignore them.
5. **Backup drift** if Origin `main` is not pushed to GitHub after merges.

## Rejected alternatives

- **Option A:** Rejected. It keeps GitHub as the real base, which contradicts the product-owner instruction.
- **Option C:** Rejected. Independent pushes create conflicting SHAs and unreviewable drift.

## Unresolved questions

1. Confirmed Origin namespace and repository URL.
2. Whether the current Origin copy is already native, a GitHub mirror, or detached.
3. Whether Cursor will later offer a first-party Origin→GitHub outbound mirror; until then backup is a documented git push.
4. Where security reports should go once a dedicated Origin contact exists.

## Validation plan

1. Independent review of this ADR and the charter revision (separate context from the authoring agent).
2. After merge, complete the cutover checklist in `docs/processes/origin-github-hosting.md`.
3. Confirm Origin Settings → General no longer lists GitHub as source.
4. Start one Cloud Agent against the Origin repo and open an Origin pull request.
5. Push Origin `main` to GitHub and confirm matching SHAs for backup.
6. Disable or ignore GitHub PR merges (repository settings / CODEOWNERS / notice).

## Conditions for revisiting the decision

Revisit this ADR if Origin hosting is withdrawn, cannot meet backup/export needs, or product ownership returns canonical hosting to GitHub. Until superseded, agents must not treat GitHub as the writable source of truth.
