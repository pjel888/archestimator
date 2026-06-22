# Evidence & Verification — API Routes & Server Actions (Domain 4)

Date: 2026-06-19 · Adversarial-verification pass. Every finding was re-opened at its cited file/lines
and an attempt was made to refute it. READ-ONLY on source; this pack is the only write surface.

## Per-finding verdicts

### API-01 — package-builder no rate limit → CONFIRMED (medium, blocker=false conditional)
- **Refutation attempt:** searched the entire package-builder surface for any quota/throttle.
- **Evidence FOR:** `src/app/api/ai/package-builder/handler.ts` `PackageBuilderDependencies`
  (lines 33–53) has no `checkQuota`; `handlePackageBuilderRequest` (176–539) never throttles —
  auth gate at 200–201 goes straight to mode branching. Contrast `src/app/api/ai/ask/handler.ts`
  which has `checkQuota` in the deps type (line 31), default (line 40), and an enforced call at
  131–135 (429 + `Retry-After`). `package-builder/route.ts` only adds the disabled-flag guard.
- **Mitigation confirmed real:** gated behind `isAiRoutesEnabled()` default **false**
  (`feature-flags.ts:13`), requires a real Supabase session + workspace (handler.ts:200–201),
  feature flags, and Apply needs a signed draft-token + draft-hash + explicit confirm
  (handler.ts:283–288). So not anonymous; Apply not trivially forgeable. Severity held at medium;
  blocker stays conditional on the AI flip.

### API-02 — "AI no rate limit" stale for /api/ai/ask → CONFIRMED (info)
- **Evidence:** `ask/handler.ts:131` calls `checkQuota` → `checkAiAskQuota`
  (`src/lib/ai/rate-limit.ts:33–80`): cleans expired rows, inserts a `security_rate_limit_events`
  row, counts per window (`{60s:10, 1h:60}`), returns 429 on excess. Durable/serverless-correct.
- **Cross-check of overlap claim:** the OWASP F-RL-04
  (`.ai/03_plans/2026-06-01-security-owasp-compliance-audit/09-...md:35–41`) names BOTH
  `/api/ai/ask` AND `/api/ai/package-builder`. It is therefore exactly half-closed: ask done,
  package-builder open (API-01). Overlap labels (stale for ask, partial for package-builder) are
  accurate.

### API-03 — share events unbounded metadata → CONFIRMED (low)
- **Evidence:** `src/app/api/share/[token]/events/route.ts:24` reads
  `body.metadata?: Record<string,unknown>`; line 45 passes `body.metadata ?? {}` to
  `recordProjectPublicationEvent`, which inserts `metadata_json: eventMetadata as Json`
  (`public-repository.ts:702`) with no size/key/depth bound. `eventType` IS allow-listed
  (route.ts:10–15,26); `metadata` is not.
- **Refutation attempt (is it actually reachable / dangerous?):** route is same-origin + CSRF
  gated (`assertSameOriginPublicPost`, route.ts:18) and rate-limited
  (`checkProjectPublicationEventRateLimit`, route.ts:30). Parameterized JSONB → not injection;
  publication-scoped (writes only for an active publication, public-repository.ts guard) → not
  cross-tenant. Real residual = storage growth / analytics pollution. Low is correct.

### API-04 — upload content-length bypassable but backstopped → CONFIRMED (info, not exploitable)
- **Evidence:** all three routes early-reject on
  `Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 1MB`
  (attachments:126–127, projects/images:210–211, images:142–143) — a missing/`NaN` header skips it
  — but each then enforces the authoritative `file.size > MAX_UPLOAD_BYTES` after reading the File
  (attachments:136, projects/images:223, images:153). Not exploitable. Covered-by OWASP F-UPLOAD-*.

### API-05 — use-server async-only-export clean → ADJUSTED (info)
- **Evidence:** grep across every `"use server"` module for
  `^export (const|function|class|let|var|enum) ` minus `async` → **zero hits**. All value exports
  are `async function`; non-async exports are type-only (erased). `next build` won't trip.
- **Adjustment:** the audit said **24** modules; the live count is **21**
  (`rg -l '^"use server"' src --type ts | wc -l`). The discrepancy is a counting artifact (the 24
  likely folded in helper/type files); the substantive verdict (clean) is unchanged. Marked
  adjusted, not refuted.

### API-06 — authz/validation/error posture sound → CONFIRMED (info, strengths)
- **Evidence verified at each cited line:**
  - Workspace-scoped writes: `projects/actions.ts:257–271` SELECT and UPDATE both carry
    `.eq("workspace_id", workspace.id)`.
  - Server-validated identity: `session.ts:40` uses `supabase.auth.getUser()` (not `getSession`).
  - Role gates: `beta-allowlist-admin-actions.ts:35` (`canManageClosedBetaAllowlist` → redirect
    forbidden), `beta-feedback-review-actions.ts:15` (`canReviewBetaFeedback`).
  - Server-derived export audience: `proposal.xlsx/route.ts:78–89` derives audience from
    `workspace_members.role`, ignores caller-requested `internal` for non-members.
  - AI fail-closed: `ask/handler.ts:124–126`, `package-builder/handler.ts:200–201`
    (`authMode !== "supabase"` / missing workspace → 401/403).

## Reconciliation re-check (prior packs)

- `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/` EXISTS with a rate-limiting section
  (09). F-RL-04 confirmed to name both AI routes (line 35) → API-01/API-02 overlap labels stand.
- `security_rate_limit_events` table migration EXISTS
  (`supabase/migrations/20260601003000_security_rate_limit_events.sql`) and is in production use by
  `ask` → API-01 needs **no new migration**.
- `current-state.md` records AI as deferred/default-off (lines 2087+), consistent with the
  conditional-blocker framing.

## Proof gates per remediation item (honest about limits)

| Item | Proof gate | What it proves | What it CANNOT prove locally |
|------|-----------|----------------|------------------------------|
| API-01 | New vitest in `tests/vitest/ai-package-builder-route.test.ts` injecting a stub `checkQuota` → assert 429 + `Retry-After`; plus `bun run build`. | Wiring + envelope are correct; build still green. | Real Supabase counting/expiry behavior under concurrency and real DeepSeek cost ceilings — only observable with `ARCHESTIMATOR_AI_ENABLED=1` + live session + provider. The `ask` path already proves the durable-table mechanism works in prod. |
| API-03 | Vitest: >2 KB metadata body → 400, not written; in-bound body → 204. | The cap rejects oversized payloads and accepts legitimate ones at the route boundary. | Real-world legitimate-payload sizing (must choose a generous cap so live emitters aren't broken) — verify against actual client event emitters before merge. |
| API-02 / bookkeeping | Doc diff in OWASP pack + `decisions.md`. | Audit ledger reflects reality. | N/A. |
| API-04 / API-05 / API-06 | No change. Re-run the API-05 grep + `bun run build` after any concurrent agent edits action modules. | Confirmed-safe state persists. | Concurrent edits by other agents could regress API-05; the grep is the cheap re-gate. |

## Honest scope caveats

- `bun run validate` is known-red on main (charts set-state-in-effect; ProposalExportPreviewDialog
  design-lint) and `test:dom` all-phase can hang — use **targeted** vitest + `bun run build`, not
  full validate, as the local gate for this domain.
- RLS/RPC correctness for `security_rate_limit_events`, the bulk-delete/comment/decision RPCs, and
  export IDOR via repository workspace-scoping are Domain-2 gates; this pass confirmed only that
  each route *reaches* the user-scoped client + durable table, not policy correctness.
