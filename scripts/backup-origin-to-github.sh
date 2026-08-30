#!/usr/bin/env bash
# GitHub backup job for MillQ.
#
# Intended identity: backup automation / service account only.
# This identity must be the sole GitHub ruleset bypass/allowlisted actor
# for fast-forwarding main and tags. Developers, Implementation Agents,
# and Review Agents must not have that bypass and must not run this as
# development dual-write.
#
# Never force-push GitHub main. Never use this path to land feature work.
#
# This script is not wired to Origin webhooks or a scheduler in this
# repository. Do not treat it as a verified live backup until cutover
# testing has run it against detached Origin and matching SHAs.
set -euo pipefail

ORIGIN_URL="${ORIGIN_URL:-}"
GITHUB_URL="${GITHUB_URL:-https://github.com/millQ-dev/MillQ.git}"
WORKDIR="${WORKDIR:-$(mktemp -d)}"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

if [[ -z "$ORIGIN_URL" ]]; then
  echo "ORIGIN_URL is required (https://origin.cursor.com/{owner}/MillQ.git)" >&2
  exit 1
fi

git clone --bare "$ORIGIN_URL" "$WORKDIR/millq.git"
git -C "$WORKDIR/millq.git" remote add github "$GITHUB_URL"
# Fast-forward only. Never force-push GitHub main.
git -C "$WORKDIR/millq.git" push github refs/heads/main:refs/heads/main
git -C "$WORKDIR/millq.git" push github --tags

origin_sha="$(git -C "$WORKDIR/millq.git" rev-parse refs/heads/main)"
github_sha="$(git ls-remote "$GITHUB_URL" refs/heads/main | awk '{print $1}')"

if [[ "$origin_sha" != "$github_sha" ]]; then
  echo "backup SHA mismatch: origin=$origin_sha github=$github_sha" >&2
  exit 1
fi

echo "backup ok: main=$origin_sha"
