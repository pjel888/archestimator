# 05 — UX, UI, and Accessibility Plan

## Applicability: operator-facing, not end-user-facing

This plan pack defines **backup/restore operational tooling and runbooks**.
There is **no end-user UI** in scope: no Next.js route, no React component, no
client bundle change, no design-system primitive, no public surface. The
"users" are operators (Philip and agents) interacting with CLI scripts, JSON/MD
evidence reports, and this runbook.

Per the suite prompt: *"For docs-only planning work, record why dynamic
adversarial QA is not applicable to the planning task itself, while still
specifying the adversarial QA required for future implementation."* That applies
here — the planning task is docs-only; the future implementation produces CLI
tools and reports, not UI.

## Operator-facing surfaces (the "UX" of this pack)

| Surface | Owner | State considered | Notes |
|---|---|---|---|
| `bun run cf:d1-restore-rehearsal` (existing) | CLI stdout + JSON/MD artifact | loading / success / fail | Already produces a clear summary table + checks table + blockers list. Reuse this shape. |
| (new) `cf:r2-inventory` report | CLI stdout + JSON/MD | empty-bucket / partial / complete / quota-warning | Must show: object count, total bytes, orphan count, dangling count, sampled keys (redacted), headroom vs free-tier. |
| (new) `cf:r2-restore-rehearsal` report | CLI stdout + JSON/MD | object-not-found / mismatch / success | Must show: sampled key (redacted), source sha256/etag, restored sha256/etag, match boolean. |
| (new) target-isolation pre-flight | CLI stdout | wrong-id / ok / blocked | Must print: parsed prod id, parsed target id, assertion result, and a hard abort if they match. |
| Operator runbook (`13_…`) | Markdown | pre-flight / drilling / verifying / rollback | Numbered steps; each drill has an explicit rollback. |
| Evidence folder | files under `evidence/` | missing / stale / current | Naming convention mirrors the existing rehearsal outputs (`YYYY-MM-DDTHHMMSSZ-*.json/md`). |

## Operator-experience states (the equivalent of UI states)

These are the states an operator moves through; the future tools must make
each legible:

- **Loading/pending**: drill is running (export/import/list/get/put). Show
  progress (object count for R2 list; bytes for get/put).
- **Empty result**: empty D1 dump (schema only) or empty R2 bucket. Must be
  reported explicitly, not as an error.
- **Success**: all gates green. Print a one-line PASS + artifact path.
- **Validation error**: malformed input, unsafe key, wrong target id. Hard
  abort with the failing check + evidence (mirrors the existing `checks[]`
  array shape).
- **Auth denied**: wrangler/provider 401/403. Report and abort; do not retry
  destructively.
- **Quota warning**: free-tier headroom below threshold (e.g., rows-read > 4M
  of 5M/day). Warn but do not abort unless over budget.
- **Network/partial failure**: partial import/upload. Report the partial state
  and the rollback step (drop the isolated target; re-run into a fresh one).
- **Rollback**: the drill itself is rolled back (drop staging DB; delete the
  re-put R2 object if it overwrote a real one). Print confirmation.

## Accessibility (rationale for proportionate treatment)

- These are **developer/operator CLI tools and Markdown reports**, not
  user-facing UI. The accessibility bar is proportional: clear stdout, plain
  tables, machine-readable JSON alongside human-readable MD, no
  color-as-the-only-cue in pass/fail (use PASS/FAIL text).
- **No keyboard/focus/screen-reader semantics apply** (no DOM).
- **No responsive/contrast considerations apply** (no rendered UI).
- If a future phase adds a dashboard route (out of scope here), that phase
  must add a real a11y plan: keyboard path, focus order, semantic tables,
  non-color cues, reduced-motion. That is recorded as a forward note, not a
  current requirement.

## Design-system impact

None. No `src/components/ui/` primitive is touched. `DESIGN.md` is not
consulted because there is no visual surface. (Consistent with the repo's
proportional verification policy: minor cosmetic/CLI changes do not need
visual proof.)

## User-facing documentation implications

- The operator runbook (`13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md`) is the primary
  human-facing artifact. It must be copy-pasteable: exact commands, exact
  expected output snippets, exact rollback.
- The evidence reports should be self-describing (the existing rehearsal MD
  already is — it prints the `note` clarifying local-only proof).

## Adversarial QA (for the *future implementation*, not this planning task)

Dynamic adversarial QA (browser/Playwright) is **not applicable** to this
planning task (docs-only) and **not applicable** to the future CLI tools
(no browser surface). The applicable adversarial QA for the future tools is the
**failure drill matrix** in `12_…` (input-malformed, target-wrong-id,
object-missing, checksum-mismatch, quota-exceeded, partial-failure-rollback),
executed as CLI tests, not browser tests.

## Forward note (out of scope)

If a later phase adds an in-app "data health / backup status" admin route
(owner-only), that phase must: scope `"use client"` minimally, use a Server
Component for the read, authorize at the server boundary, define loading/empty/
error/denied states, and add keyboard/a11y proof. That is **not** this pack.
