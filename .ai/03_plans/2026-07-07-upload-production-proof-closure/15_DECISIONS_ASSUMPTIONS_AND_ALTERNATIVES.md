# 15 — Decisions, Assumptions, and Alternatives

## Decisions (load-bearing)

### DEC-001 — Keep the `proofBoundary`-based 8-gate bundle as the single source of truth
- **Problem:** two proof conventions coexist (older `proofBoundary`+`mode` upload
  scripts; newer `readiness`+`blockers` Cloudflare scripts). Which is the closure
  authority?
- **Constraints:** the bundle gate (`check-upload-production-proof-evidence.ts`)
  already validates `proofBoundary` strings and is the documented closure surface.
- **Options:**
  - A) Keep the 8-gate bundle; document the convention split; do not re-wire the
    newer scripts into it.
  - B) Re-wire the newer Cloudflare scripts into the bundle (add 4 more gates).
  - C) Replace the bundle with a unified `readiness`-style gate.
- **Advantages/disadvantages:**
  - A: minimal, honest, ships now. Disadvantage: leaves tech debt (RISK-014).
  - B: more coverage. Disadvantage: out of scope for proof *closure*; mixes
    conventions; risks overclaiming.
  - C: cleanest long-term. Disadvantage: high-blast-radius rewrite, not
    planning-only.
- **Security/perf/ops implications:** A is lowest-risk; B/C add review surface.
- **Recommended:** A.
- **Reason:** closure is the goal; convention unification is a separate
  architecture task. A is internally resolvable and keeps the pack planning-only.
- **Consequences:** the bundle stays at 8 gates; the newer scripts remain adjacent.
- **Conditions to change:** owner explicitly asks for the unified gate.

### DEC-002 — Forward code-fix: repoint producer script evidence-dir defaults
- **Problem:** H1 — script defaults point at a non-existent path.
- **Options:**
  - A) Operator override (this pack's Phase 0) + forward code-fix to repoint
    defaults to the real `000-Follow Ups/…` path (or make the dir an explicit
    required arg).
  - B) Move the real artifacts back to the short path (rename the folder).
  - C) Symlink the short path to the real path.
- **Recommended:** A.
- **Reason:** B/C change repo layout and may break the parent pack's references;
  A is the smallest safe change. The code-fix is explicitly *future implementation
  work* (out of scope for this planning-only pack).
- **Owner:** owner approval required for the code-fix; the operator override needs
  no approval.

### DEC-003 — Forward code-fix: add the two missing `package.json` aliases
- **Problem:** H2 — `check-upload-production-proof-evidence.ts` and
  `verify-upload-production-observations.ts` are not in `package.json`.
- **Options:**
  - A) Direct invocation (this pack's Phase 0) + forward code-fix adding aliases
    (e.g. `cf:upload-proof-bundle`, `cf:upload-production-observations`).
  - B) Leave as direct invocation only.
- **Recommended:** A.
- **Reason:** discoverability and consistency with the other `cf:verify-hosted-upload-*`
  aliases. The code-fix is future implementation work.
- **Owner:** owner approval for the code-fix.

### DEC-004 — Keep the `candidates` filename fallback in the bundle gate
- **Problem:** H3 — passing artifacts carry `-fail-closed-proof.json` names.
- **Options:**
  - A) Keep the fallback (content-validated); document it; produce the
    non-fail-closed name as the target in Phase 1.
  - B) Remove the fallback (strict filename match).
- **Recommended:** A.
- **Reason:** the fallback is intentional and safe (the gate validates contents,
  not names). Removing it would break the currently-green state without improving
  correctness. Phase 1 produces the clean name anyway.

### DEC-005 — Treat closure as separate from enabling uploads
- **Problem:** a green bundle might be misread as "uploads are on."
- **Recommended:** keep the README's explicit "closure ≠ enablement" framing and
  require owner sign-off (RISK-013).
- **Reason:** the bundle proves the *operations surface* is observable and safe;
  turning uploads on is a separate product decision.

## Assumptions

| ID | Assumption | Validated? | Source/evidence |
|---|---|---|---|
| ASSUMP-001 | Bundle gate's 8 requirement keys + candidates filenames are stable | Yes | direct read of `check-upload-production-proof-evidence.ts` |
| ASSUMP-002 | Hosted upload proof routes are deployed + aliased | Yes | committed `upload-hosted-deployment-readback.json` |
| ASSUMP-003 | The two untwired scripts run via `bun run scripts/<name>.ts` | Yes (structural) | `if (import.meta.main)` entrypoints; not re-executed in this stage |
| ASSUMP-004 | A ClamD-compatible service with prod-equivalent signatures is reachable | **No (external)** | flagged as Phase 2 prerequisite; if absent, gate stays fail-closed |
| ASSUMP-005 | An HTTPS alert webhook + bearer token is configured | **No (external)** | flagged as Phase 2 prerequisite; if absent, gate stays fail-closed |
| ASSUMP-006 | The operator has platform-admin dashboard + test-workspace route access | **No (external)** | flagged as Phase 2 prerequisite |
| ASSUMP-007 | The `www.archestimator.com` alias is the production origin the bundle expects | Yes | `validateHostedUploadOperations`/`validateHostedUploadRuntime` check `baseUrl === "https://www.archestimator.com"` |

## Alternatives rejected

- **Collect hosted proof in this planning session.** Rejected: planning-only
  stage; no secrets/provider action authorized for this pack.
- **Re-plan upload architecture here.** Rejected: belongs to the sibling
  `2026-07-07-r2-upload-memory-multipart-and-image-readiness` and the parent
  `000-Follow Ups/2026-06-26-…` pack. This pack separates proof closure from
  architecture change per `PROMPT.md`.
- **Add the newer Cloudflare scripts as bundle gates.** Rejected (DEC-001 option
  B): out of scope, mixes conventions.
- **Enable a paid Cloudflare add-on for better observability.** Rejected:
  free-tier posture per `AGENTS.md`; current head-sampling observability is
  sufficient for proof.

## Open decisions

| ID | Decision | Owner | Blocking? | Options |
|---|---|---|---|---|
| OPEN-001 | When to schedule the hosted collection window (Phase 1/2) | owner | no (pack is CONDITIONALLY READY regardless) | now / next deploy window / post-launch |
| OPEN-002 | Whether to perform DEC-002/DEC-003 code-fixes now or after closure | owner | no | after closure recommended (keeps this pack planning-only) |
| OPEN-003 | Which route to use for the backpressure exercise (P2-4) | executor | no | `/api/component-library/attachments` (authenticated, test workspace) recommended |
