# Origin hosting and GitHub backup

This process implements [ADR-0004](../decisions/ADR-0004-origin-source-of-truth.md). Cursor Origin is the canonical git host. GitHub `millQ-dev/MillQ` is a backup mirror of Origin, not a second place to develop.

## Rule of thumb

| Action | Where |
| --- | --- |
| Clone, branch, commit, push | Origin |
| Open, review, merge pull requests | Origin |
| Start Cloud Agents | Origin repository |
| Track new work | Cloud Agent run and/or Origin pull request |
| Copy `main` after a merge | Push Origin `main` (and tags) to GitHub |
| File new GitHub issues or merge GitHub PRs | Do not |

Built-in Origin **Sync from GitHub** is the wrong direction. That mode makes GitHub the source and Origin the mirror. MillQ’s rule is the reverse.

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
git remote rename origin github   # if origin still points at GitHub
git remote add origin https://origin.cursor.com/{owner}/MillQ.git
git fetch origin
git branch -u origin/main main
```

Do not configure two push URLs on one remote for routine work. Dual-push hides which host accepted a write.

## Cutover checklist

Complete these in order. Freeze GitHub writes (no merges) before step 3.

1. Open [cursor.com/codebase](https://cursor.com/codebase) and confirm the MillQ repository exists.
2. Open the repo **Settings → General** and read **Sync status**.
   - If Origin is listed as the **mirror** and GitHub as the **source**: use **Detach from GitHub**. Origin becomes standalone. GitHub is left as-is and is no longer updated by Cursor.
   - If the repo was **created on Origin** (no GitHub sync): it is already canonical. Skip detach.
3. Compare `main` SHAs on Origin and GitHub. If they differ, Origin wins. Do not merge the two histories by hand unless product ownership explicitly directs a rebase.
4. Protect Origin `main` (no direct pushes; PRs required).
5. Point local and Cloud Agent environments at the Origin remote, not GitHub.
6. After each merge to Origin `main`, refresh the GitHub backup:

   ```bash
   git fetch origin
   git push github origin/main:main
   git push github --tags
   ```

7. On GitHub, treat the repo as read-only backup: do not merge PRs there. The issue templates in `.github/` tell people not to file new issues.

Until step 2 is done, Cloud Agents that clone `github.com/millQ-dev/MillQ` are still writing the backup.

## Agents

- Start new Cloud Agents from [cursor.com/agents](https://cursor.com/agents) (or the Cursor iOS / PWA app) and **select the Origin MillQ repo**.
- Continue an existing agent with follow-ups only while that run is alive. A GitHub-cloned run cannot finish Origin cutover by itself.
- Link work in the PR to the Cloud Agent URL and/or the Origin PR. Do not open a new GitHub issue for the same work.
- Historical GitHub issue URLs in older ADRs stay as archive citations.

## Pull requests

Open PRs on Origin (`origin pr create` after `origin auth login`, or the Origin web UI). Use the repository pull-request template. Independent review is still required. Do not merge your own unreviewed work.

## CI

When CI exists, attach it to Origin (Depot, Buildkite, or another Origin-connected checker). Checks on GitHub are backup-only and must not be the merge gate.

## What this process does not do

- It does not rename the Origin namespace (not allowed during Origin beta).
- It does not migrate GitHub Issues, Actions, or secrets into Origin.
- It does not enable Cursor’s GitHub→Origin mirror.
- Detach / namespace / Cloud Agent repo picker are dashboard actions. An agent checked out from GitHub cannot flip those switches.
