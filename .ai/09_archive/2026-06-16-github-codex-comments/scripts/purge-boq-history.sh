#!/usr/bin/env bash
set -euo pipefail

if [[ "${ARCHESTIMATOR_CONFIRM_HISTORY_REWRITE:-}" != "PURGE_BOQ_HISTORY" ]]; then
  cat >&2 <<'MSG'
Refusing to rewrite history.

Set ARCHESTIMATOR_CONFIRM_HISTORY_REWRITE=PURGE_BOQ_HISTORY only after explicit
owner approval. This operation rewrites repository history.
MSG
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing to rewrite history with a dirty worktree." >&2
  exit 2
fi

before_divergence="$(git rev-list --left-right --count main...origin/main)"
if [[ "$before_divergence" != $'0\t0' ]]; then
  echo "Refusing to rewrite history while main/origin divergence is: $before_divergence" >&2
  exit 2
fi

declare -a purge_paths=(
  ".ai/09_archive/store/2026-06-13-Spreadsheet-Export-Plan/_research/02a-boq-raw-dump.txt"
  ".ai/09_archive/store/2026-06-13-Spreadsheet-Export-Plan/_research/02a-boq-reference-extraction.md"
  ".ai/09_archive/store/2026-06-13-Spreadsheet-Export-Plan/02_boq-format-benchmark.md"
  ".ai/09_archive/store/2026-06-13-Spreadsheet-Export-Plan/_research/02b-boq-format-gap.md"
)

backup_dir="$(mktemp -d "${TMPDIR:-/tmp}/ae-boq-sanitized.XXXXXX")"
for path in "${purge_paths[@]}"; do
  if [[ -f "$path" ]]; then
    mkdir -p "$backup_dir/$(dirname "$path")"
    cp "$path" "$backup_dir/$path"
  fi
done

index_filter='git rm -r --cached --ignore-unmatch'
for path in "${purge_paths[@]}"; do
  index_filter+=" $(printf '%q' "$path")"
done
index_filter+=' >/dev/null'

export FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch \
  --force \
  --index-filter "$index_filter" \
  --prune-empty \
  --tag-name-filter cat \
  -- --all

for path in "${purge_paths[@]}"; do
  if [[ -f "$backup_dir/$path" ]]; then
    mkdir -p "$(dirname "$path")"
    cp "$backup_dir/$path" "$path"
  fi
done

git add "${purge_paths[@]}"
git commit -m "Re-add sanitized BOQ archive artifacts after history purge" \
  -m "Restore only reviewed synthetic/redacted BOQ artifacts after removing historical sensitive blobs from rewritten refs." \
  -m "Constraint: PR #50 Codex thread requires source-control history hygiene, not a normal deletion commit." \
  -m "Confidence: high" \
  -m "Scope-risk: broad" \
  -m "Directive: Do not reintroduce raw BOQ, tender, customer, address, contact, or real bid/cost artifacts into Git." \
  -m "Tested: run post-rewrite object scan and current HEAD artifact checks before resolving PRRT_kwDOSfSDcs6JokL3." \
  -m "Not-tested: GitHub cache/support-side object retention."

for ref in $(git for-each-ref --format='%(refname)' refs/original/); do
  git update-ref -d "$ref"
done
git reflog expire --expire=now --all
git gc --prune=now --aggressive

old_blob_pattern='9834285c51554bb6feffe6de7e026f6cf51f8374|bf3aa463594adaa4324cea67f954f92d56d30318|4e34f4c6988919ba97e98ad65c424434812bd2f0|de5f3b9b990f17edc9137b0443be644e41d1952d'
if git rev-list --objects --all | rg -q "$old_blob_pattern"; then
  echo "Sensitive historical blob IDs are still reachable. Do not push." >&2
  git rev-list --objects --all | rg "$old_blob_pattern" >&2
  exit 1
fi

for path in "${purge_paths[@]}"; do
  git cat-file -e "HEAD:$path"
done

echo "History rewrite completed locally and sensitive blob IDs are absent from local refs."

if [[ "${ARCHESTIMATOR_CONFIRM_FORCE_PUSH:-}" == "FORCE_WITH_LEASE_MAIN" ]]; then
  git push --force-with-lease origin main
else
  cat <<'MSG'
Force push skipped.

After reviewing the rewritten local history, run with:

  ARCHESTIMATOR_CONFIRM_HISTORY_REWRITE=PURGE_BOQ_HISTORY \
  ARCHESTIMATOR_CONFIRM_FORCE_PUSH=FORCE_WITH_LEASE_MAIN \
  bash .ai/03_plans/2026-06-16-github-codex-comments/scripts/purge-boq-history.sh
MSG
fi
