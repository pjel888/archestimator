# Dry Run and Adoption Validation Plan

**Date:** 2026-06-03

## Required dry runs

### Low-risk future feature

Recommended candidate: a docs-only or UI-copy-only improvement with no provider changes, selected by Philip after Phase 1. It should still require DEFINE/DISCOVER/DESIGN/SETUP/BUILD/VALIDATE records, a run log, validation, and PR review.

### Known bug/blocker

Recommended candidate: `.ai/15_Bugs/2026-06-03-stack-version-source-of-truth-drift.md` or another low-risk docs-sync bug selected by Philip. It should exercise evidence-first reproduction, root cause, fix plan, validation, and closure.

## Measurement checklist

| Question | Pass signal |
|---|---|
| Did the agent read correct docs? | Run log lists source-of-truth chain |
| Did the agent avoid stale assumptions? | Current repo facts verified before edit |
| Did the agent update run logs? | `.ai/05_logs` entry exists |
| Did the agent produce useful tests? | Test exists or docs-only rationale is explicit |
| Did CI/local validation pass? | Command output captured |
| Did Notion mirror correctly? | Payload/page links to `.ai`; no contradiction |
| Did process slow work too much? | Dry-run duration and friction logged |
| Did process prevent mistakes? | At least one stale assumption/risk caught or explicit no-risk result |

## Improvement loop

After each dry run: record misses, patch templates/protocols, rescore, and repeat if any required phase was confusing or skipped.

## Enforcement threshold

Global enforcement begins only when both dry runs pass with validation evidence, no source-of-truth drift, and Philip agrees the overhead is acceptable.

## What must be fixed before global enforcement

- Branch/protection decision approved.
- PR template finalized.
- CI checks stable.
- Notion mirror setup or explicit decision to defer Notion.
- Hotfix emergency path documented.
