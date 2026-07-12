# Plan-Pack Execution Policy

## Purpose

A plan pack exists to execute a genuinely high-risk or explicitly requested
outcome. It is not the default workflow and must not become a document quota,
approval queue, or blocker registry.

## Entry Gate

Use a plan pack only for explicit exhaustive planning or work genuinely expensive
to reverse: destructive data migration, live auth/token compatibility, material
security boundaries, broad architecture replacement, or coordinated multi-owner
execution. Ordinary features, multi-file edits, debugging, UI work, and focused
performance work use Direct or Brief lanes.

## Minimal Shape

A pack needs only:

- outcome, scope, non-goals, and current evidence;
- requirements and decisions;
- dependency-ordered implementation units;
- applicable authorization/test/evidence boundaries;
- recovery/resume state;
- final requirement-to-evidence audit.

Combine artifacts by default. Split only when independent ownership, retrieval,
or evidence freshness requires it. File count is never quality evidence.

## Execution

Internally resolvable dependencies are owned continuation work. Repair, reorder,
absorb, or substitute them. Optional tools, reviewers, memory, unapproved tests,
hosted proof, and release evidence cannot block safe local implementation.

Archestimator is alpha/pre-beta. Prefer the direct target design and fix forward.
Do not add compatibility, dual paths, flags, rollout, rollback, hosted proof, or
approval machinery without a proven current obligation.

Use formal leases only for actual concurrent contention. Use independent review
only for a named risk. Run tests/browser/builds only under explicit current-task
user authorization.

## Terminal States

- `ACHIEVED`: every core repository requirement is complete and evidenced.
- `AUTH_BLOCKED`: only an exact prohibited external action remains after all safe
  local work is complete.
- `TECH_BLOCKED`: a core deliverable is impossible after materially different
  local fallbacks fail and no runnable next unit remains.
- `CANCELLED`: the user cancelled the work.

Archive only after a requirement-by-requirement completion audit. Do not archive
partial work or retain a stale duplicate active pack.
