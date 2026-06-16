# BOQ History Redaction Follow-Up

**Date:** 2026-06-16
**Status:** owner-gated
**Classification:** source-control disclosure response

## Evidence

PR #50 redacted the current tree copies of the BOQ research dump and extraction note, but an inline review correctly noted that normal commits do not remove sensitive blobs from existing Git history. This run further redacted companion HEAD references and preserved only sanitized formula/convention evidence.

## Impact

The current repository tree no longer needs raw customer/project BOQ identifiers for the Spreadsheet Export plan, but prior commits may still contain the original sensitive blob contents until repository history is rewritten and force-pushed.

## Proposed Fix

Run an owner-approved history purge with a reviewed tool such as `git filter-repo` or BFG against the affected BOQ research paths, rotate or invalidate any exposed customer/reference material as appropriate, then coordinate the required force-push and clone refresh with every active branch/PR owner.

## Verification Plan

- Prove current `HEAD` contains only synthetic/redacted BOQ references.
- After approved history rewrite, prove the old blob paths cannot be recovered with `git show <old-sha>:<path>`.
- Re-run `git fsck`/secret scanning and GitGuardian or equivalent repository scans.

## Boundary

This was not performed automatically because shared Git history rewrite and force-push are destructive external actions.
