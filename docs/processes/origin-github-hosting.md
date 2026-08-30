# Origin hosting and GitHub backup

This process implements [ADR-0004](../decisions/ADR-0004-origin-source-of-truth.md). Cursor Origin is the **only** source of truth. GitHub `millQ-dev/MillQ` is a backup mirror of Origin, not a workplace.

Agent autonomy, review, and auto-merge live in [`autonomous-development.md`](autonomous-development.md).

## Rule of thumb

| Action | Where |
| --- | --- |
| Clone, branch, commit, push | Origin |
| Open, review, merge pull requests | Origin |
| Start Cloud Agents | Origin repository |
| Track new work | Cloud Agent run and/or Origin pull request |
| Write GitHub `main` / tags after cutover | Backup automation / service account **only** |
| File new GitHub issues or merge GitHub PRs | Do not |

Built-in Origin **Sync from GitHub** is the wrong direction. That mode makes GitHub the source and Origin the mirror. MillQ’s rule is the reverse.

**Dual-write is forbidden.** Developers and agents must not push the same commit to Origin and GitHub. Do not configure two push URLs on one remote.

## Remotes

Canonical (name this remote `origin` after cutover):

```text
https://origin.cursor.com/{owner}/MillQ.git
```

Browse: `https://cursor.com/codebase/{owner}/MillQ`

Backup only (name this remote `github`):

```text
https://github.com/millQ-dev/MillQ.git
```

Replace `{owner}` with the claimed Origin codebase name. Confirm it in the Code dropdown at `cursor.com/codebase`.

Local setup after cutover:

```bash
git remote rename origin github   # only if origin still points at GitHub
git remote add origin https://origin.cursor.com/{owner}/MillQ.git
git fetch origin
git branch -u origin/main main
git remote set-url --push github no_push
```

`git remote set-url --push github no_push` is a local guard so a developer checkout cannot accidentally update the backup. The backup identity uses its own credentials and is the only writer to GitHub.

## GitHub backup model

Target path after every Origin merge:

`Origin main → backup automation / service account → GitHub main`

Also push tags so GitHub reflects Origin tags.

### Who may write GitHub `main`

After cutover:

- The **backup automation/service identity is the only identity authorized** to perform the direct backup write to GitHub `main` and tags.
- Implementation agents, Review Agents, and normal human development identities **must not** receive this right and **must not** push to GitHub.
- Dual-write from a working clone is forbidden.

### Coexistence with GitHub write restrictions

GitHub `main` should reject routine developer/agent writes (no GitHub PRs as the workplace, no direct pushes from people or implementation agents). That protection would also reject the backup job unless the backup identity is an **explicit exception**.

Required GitHub configuration (owner/platform; not Origin `main`):

1. Apply a GitHub ruleset or branch protection on `main` that blocks routine pushes and merges.
2. Add the backup automation/service identity as the **only** permitted/bypass actor for that GitHub ruleset, solely so it can fast-forward `main` and tags from Origin.
3. Do **not** grant that bypass to implementation agents, review agents, or human developers.
4. This exception exists **only** for deterministic Origin→GitHub backup replication. It must never be used for development, hotfixes, or GitHub PRs.
5. **Do not weaken Origin `main` protections.** Origin remains PR-only with independent review and no implementer bypass.

A local `git remote set-url --push github no_push` on developer clones is an extra guard. It does not replace the GitHub ruleset.

Intended job body (not wired, not verified in this environment): [`scripts/backup-origin-to-github.sh`](../../scripts/backup-origin-to-github.sh). Fast-forward only; no force-push of GitHub `main`.

How to trigger it is an owner/platform choice once Origin is detached, for example:

- Origin webhook `pull_request.merged` (documented on the Origin API) calling the backup job
- a Cursor Automation on Origin PR merge, if available for this repo after cutover
- a scheduled job only as a drift-repair safety net, not as the primary path

Do not claim any of those triggers work until they have been tested after Detach.

Until that automation exists, Origin `main` and GitHub `main` can drift. That is an operational gap, not permission to dual-write from an agent.

## Cutover checklist

This is an **owner/platform operation**. A Cloud Agent cloned from `github.com/millQ-dev/MillQ` cannot Detach Origin, attach Cloud Agents to Origin, or prove backup automation.

Do not mark cutover complete until every step below has actually been done.

1. Finish the last governance PR of the old GitHub workflow (currently GitHub PR #13 on this hosting decision). Independent review still applies. Do not skip review by calling this “just docs”.
2. Confirm GitHub `main` contains that final agreed SHA.
3. Sync Origin to that same SHA (Origin copy of `main` matches GitHub `main` **before** Detach).
4. Compare SHAs. They must be identical before Detach.
5. In Cursor Origin **Settings → General → Danger Zone**, run **Detach from GitHub** if Origin is still a GitHub-sourced mirror. After Detach, Origin is the only canonical repository. Cursor will no longer pass pushes through to GitHub.
6. From this point, treat Origin as the only writable host.
7. Start a **test Cloud Agent against the Origin MillQ repo** (not GitHub).
8. Have that agent create a test branch and an Origin pull request (Level A, trivial, disposable) and **arm merge-when-ready** (`origin pr merge --auto`).
9. Run an **independent** Review Agent on that PR (`APPROVE` or `REQUEST CHANGES` from a separate context). The Review Agent must not be asked to merge.
10. Confirm CI/checks behaviour: either required checks run, or record that CI is not attached yet and is therefore not a merge gate.
11. Confirm unattended merge: after independent `APPROVE` and required checks, Origin merges without a human click. Direct push to Origin `main` must still be rejected. Immediate/unconditional merge by the Implementation Agent must still be rejected.
12. Confirm the test change is on Origin `main`.
13. Run backup: Origin `main` → GitHub `main` (and tags) via the **backup identity only**, using its GitHub ruleset bypass. Confirm a routine identity cannot push GitHub `main`.
14. Confirm GitHub `main` SHA equals Origin `main` SHA.
15. Declare cutover complete only after steps 1–14. After that, do not start implementation Cloud Agents on GitHub.

If step 5 is skipped while Origin remains a GitHub-sourced mirror, GitHub is still the real source despite this document. That is a failed cutover.

## Agents after cutover

- Start Cloud Agents from cursor.com/agents (or Cursor iOS / PWA) and **select the Origin MillQ repo**.
- Open PRs on Origin only.
- Follow [`autonomous-development.md`](autonomous-development.md) for levels, review, and auto-merge.
- Historical GitHub issue URLs in older ADRs stay as archive citations. Do not open new GitHub issues as the work queue.

## CI

When CI exists, attach it to Origin. Depot and Buildkite work on **Origin-hosted** repositories, not on GitHub-mirrored repos. Attach CI **after** Detach. Checks on GitHub are not the merge gate.

## What this process does not do

- It does not rename the Origin namespace (not allowed during Origin beta).
- It does not migrate GitHub Issues, Actions, or secrets into Origin.
- It does not enable Cursor’s GitHub→Origin mirror.
- It does not by itself create Origin rulesets, CI apps, webhooks, or the backup service account.
- Detach, rulesets, CI apps, Cloud Agent repo picker, and backup credentials are dashboard/platform actions.

## Remaining owner / platform actions

Not performed from the GitHub-cloned Cloud Agent that authored these docs:

1. Merge GitHub PR #13 after independent review (last GitHub-workflow governance PR).
2. Confirm Origin namespace `{owner}` and repo URL.
3. Equalize Origin `main` and GitHub `main` SHAs, then **Detach from GitHub**.
4. Protect Origin `main` (PR required, no direct push, independent review required, CI required when CI exists, merge-when-ready allowed). Do **not** give implementation agents a bypass on Origin `main`.
5. Attach Depot or Buildkite if CI should be a merge gate.
6. Protect GitHub `main` against routine writes. Create a GitHub backup identity and set it as the **only** ruleset bypass/allowlisted actor for the Origin→GitHub backup path. Do not give that bypass to developers or agents.
7. Wire backup on each Origin merge; test SHA match; confirm a non-backup identity cannot push GitHub `main`.
8. Start the first Origin Cloud Agent and run the test PR: implementer arms merge-when-ready → independent review → automatic merge → backup (cutover steps 7–14).
9. Stop launching new implementation agents against GitHub.
