# Git GC Unreachable Loose Objects Warning

**Classification:** TOOLING_OR_ENVIRONMENT_BLOCKER
**Date discovered:** 2026-06-04
**Status:** OPEN_NON_BLOCKING
**Blocks current work:** No
**Related plan:** `.ai/03_plans/2026-06-03-agentic-development-framework-rollout/`

## Discovery Context

`git fetch --prune origin` completed, but Git reported that a previous automatic
garbage collection run left `.git/gc.log`, and automatic cleanup will not run
until the root cause is corrected.

## Evidence

Command output included:

```txt
warning: The last gc run reported the following. Please correct the root cause
and remove .git/gc.log
warning: There are too many unreachable loose objects; run 'git prune' to remove them.
```

## Expected Behavior

`git fetch --prune origin` should complete without repository housekeeping
warnings.

## Actual Behavior

Fetch completed successfully with a non-blocking housekeeping warning.

## Suspected Root Cause

Many old unreachable loose objects exist in the local `.git` object database.

## Affected Files/Modules

Local Git metadata only.

## Impact

Low for the current docs implementation. Future commands may continue printing
the warning until Git housekeeping is done.

## Severity

Low.

## Proposed Fix

Handle local Git housekeeping in a separate maintenance pass. Do not run
destructive cleanup during this implementation run.

## Verification Plan

After an approved maintenance pass, rerun `git fetch --prune origin` and confirm
the warning is gone.
