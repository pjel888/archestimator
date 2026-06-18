# ROADMAP_SYNC_LOOP — Reconciliation Report

**Run date:** 2026-06-18
**Driver:** `.ai/08_prompts/ROADMAP-SYNC-LOOP.md` (codebase → roadmap reconciliation)
**Scope lock:** ONLY files in `.ai/01_roadmap/` were created/edited. Code = ground truth.
**Method:** multi-agent orchestration — 12 read-only code surveyors built a shared
Capability Map, then 35 file-partitioned reconcilers edited their own docs against it,
each gated by an adversarial verifier; a second cross-document cycle resolved
contradictions the per-doc lanes could not see; a final surgical pass closed the last gap.

> This file is the run ledger. Per the loop contract, writing `_SYNC_REPORT.md` does
> **not** count as a roadmap edit for convergence purposes.

---

## 1. CONVERGED? — YES (for all code-determinable claims), after 3 cycles

- **Cycle 1 (per-document):** 226 surgical edits across 39 docs; **35/35 lanes PASS**
  adversarial verification; 0 fabrications; 0 scope violations.
- **Cycle 2 (cross-document consistency):** 29 edits; 17 cross-doc contradictions fixed;
  4/5 families converged; 1 residual identified.
- **Cycle 3 (final surgical):** 1 edit (the residual). Final idempotency grep across the
  recurring cross-doc facts (Turnstile, Redis, gate counts) found **no further
  code-driven edits required.**

The only items NOT brought to a final "done/built" status are those that, by the loop's
own non-fabrication rule, **cannot be resolved from code** — owner decisions and
external/hosted/manual proofs. These are correctly flagged `⚠️ NEEDS INPUT` / kept at
their pending status rather than guessed. See §5.

---

## 2. Bucket counts at exit (cycle 1 classification, by lane-sum)

| Bucket | Count |
|---|---:|
| **MATCH** (already correct) | 416 |
| **DRIFT fixed** | 194 |
| **GHOST flagged** (claimed, zero code — not deleted) | 25 |
| **UNTRACKED added** (real capability the roadmap omitted) | 17 |
| **AMBIGUOUS / NEEDS INPUT** | 39 enumerated → 2 editorial items resolved post-run → **~37 genuinely owner/external** |
| Total surgical edits applied (c1 + c2 + c3 + post-run factual) | **~263** |

Scope-lock attestation: `git status` shows the 40 changed files under `.ai/01_roadmap/`
are the **only** files this run touched. (Other working-tree changes seen during the run —
`current-state.md` FAST-PATH header, `CLAUDE.md`/`AGENTS.md` "read for speed", `DESIGN.md`
→ alpha guide, `src/components/workshop/dashboard/*` polish, `.ai/02_audits/...` — were
**concurrent work by the owner/other agents**, not this reconciliation.)

---

## 3. GHOSTS — claimed in the roadmap, ZERO code evidence (flagged in place, not deleted)

These are real capability gaps the roadmap implied existed. They are now marked as
not-built/ghost wherever they appear, consistently:

1. **Redis/Upstash rate-limiting** — roadmap mandates it (D-004, SEC-005B); code ships
   durable rate-limiting via the Postgres `security_rate_limit_events` table instead. No
   Redis/Upstash anywhere (only a stale comment in `src/lib/publication/actions.ts`).
2. **Cloudflare Turnstile / CAPTCHA** — decided (D-004) but ZERO code in `src/` or `package.json`.
3. **Sentry / external error tracking** — no `@sentry/*`; only console-level telemetry seams.
4. **Secrets-scanning CI** (gitleaks/trufflehog) — absent from `.github/`.
5. **Desktop / viewport guard** (<768px overlay for `/workshop`, D-027/UX-13) — no dedicated component.
6. **Self-serve DSAR / data export + delete** — none; privacy page says email support.
7. **PDF proposal export** — none; export is XLSX-only (ExcelJS).
8. **Guided onboarding / first-value wizard** — `/workshop/onboarding` is a redirect stub;
   `completeOnboarding` action is orphaned (no UI caller).
9. **Strict CSP on `/workshop`** — `/workshop` is Report-Only (D-9); only `/share` is enforced.
10. **Workspace measurement-system (Imperial/Metric) toggle** (journey 18/19) — only
    `default_currency` persists; no `measurement_system` field.
11. **Unread-activity badge/count on workshop cards** (journey 15) — no badge UI; the
    notification fan-out that would feed it is NOT STARTED.
12. **AC-MOD-04 / AC-MOD-06 DB guarantees** (shared-link response `SET NULL`; one-published-
    publication-per-project unique index) — reviewed but deliberately NOT applied
    (`supabase/migrations-pending-review/`).
13. **`tests/integration/` & `tests/performance/` staging-test approach** (doc 32) — never
    adopted; the real mechanism is the local `scripts/prove-*-postgres.mjs` harnesses.
14. **Broken plan-path references** — `46-manual-proof-matrix.md` (canonical replacement
    unknown), `route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md` (moved
    to archive). (Several other dead `.ai/03_plans/` paths were resolved to their
    `.ai/09_archive/` locations in cycle 2 — see §4.)
15. **`ALLOWED_REDIRECT_HOSTS` constant in `src/proxy.ts`** — no such file/constant; the real
    mechanism is env-driven `getAllowedAppOrigins`.

(Full per-item ghost detail with doc locations is preserved inline in each doc and in the
cycle aggregates.)

---

## 4. UNTRACKED — real, implemented capabilities the roadmap had OMITTED (now added)

1. Private `project-images` storage bucket (`20260603222628_private_project_image_storage.sql` + hardening).
2. Vercel Web Analytics with privacy-redacting `beforeSend` (`src/components/analytics/VercelWebAnalytics.tsx`).
3. Durable Postgres rate-limiting (`security_rate_limit_events`) — the real BETA-P0-SEC-005 implementation.
4. 7 per-route workshop error boundaries + shared `WorkshopRouteErrorState` (REL-001 partial).
5. Closed-beta allowlist admin + in-app beta-feedback submission/review flow (BETA-001).
6. Server-action authorization layer (`requireCurrentUserContext` + `assertCan*` helpers) (SEC-003).
7. Invite fail-closed/POST-only + shared-link recipient tracking/digest (COLLAB-002, SHARE-002/003).
8. Feature-flag system + publication snapshot foundation.
9. AI Ask + Package-Builder (DeepSeek), default-OFF.
10. Route-transition perf harness + `@next/bundle-analyzer` + the launch-readiness
    `check-*`/`verify-hosted-*` script suite (framed as **tooling that does not prove
    external facts**).
11. `RESEND_REPLY_TO` / `RESEND_WEBHOOK_SECRET` env contract.
12. Enforced CSP on `/share/:path*` (P11 upgrade).
13. The 5 local `prove-*-postgres.mjs` RLS/parity harnesses (substitute for doc 32's never-built tests).

Cross-doc path corrections applied in cycle 2: `mvp-launch-readiness-2026-06-01/` and
`share-and-collaboration-implementation/` references now point to their verified
`.ai/09_archive/` locations consistently across docs 23, 25, 28, 34, README.

---

## 5. ⚠️ NEEDS INPUT — owner decisions (code cannot resolve these)

These are the decisions only Philip can make. Grouped by theme; the raw count is 39
across cycle 1 (many are variants of the same underlying decision).

### A. Architecture decisions where shipped ≠ planned
1. **Rate-limiting store: accept Postgres or still require Redis?** Durable rate-limiting
   IS shipped (Postgres `security_rate_limit_events` + in-memory backstop, with 429 +
   Retry-After on AI Ask, all `/share` routes, and proposal export). The roadmap (D-004,
   SEC-005, SEC-005B, evidence-index, doc 06/27) mandates **Redis/Upstash**. Decide:
   does the Postgres approach satisfy the beta gate (retire SEC-005B), or is Redis still required?
2. **AI package-builder is NOT rate-limited** (only the Ask route is). Add a limit, or accept?
3. **"Consistent design-system-tokenized 429 lockout UX across ALL rate-limited surfaces"**
   (SEC-005F) — per-surface lockout UI exists, but no single shared component. Does
   per-surface handling count as done?

### B. Decided-but-not-built (build for beta, or defer?)
4. **Cloudflare Turnstile / CAPTCHA** (D-004, SEC-13). 5. **Sentry / error tracking**
   (OBS-001). 6. **Secrets-scanning CI** (SEC-004). 7. **Desktop/viewport guard** (D-027/UX-13).
   8. **Self-serve DSAR** (UX-001). 9. **Guided onboarding wizard** (UX-001). 10. **Strict
   CSP enforcement on `/workshop`** (D-9, currently Report-Only). 11. **PDF export** (enterprise).

### C. External / hosted / manual facts (not code-provable — confirm or run the proof)
12. **Google OAuth app verification** status (testing vs in-production / 100-user cap).
13. **Live Supabase apply** state of migrations recorded as "APPLIED to prod".
14. **Staging environment** (Supabase staging + Vercel preview) provisioning.
15. **RLS/storage denial proof against staging** (local `prove-*` harnesses exist; not in CI).
16. **Resend email delivery** + Supabase Auth email provider config.
17. **Counsel-reviewed Terms/Privacy** (code self-declares `pending_counsel_review`).
18. **Manual/perf evidence:** Lighthouse, non-technical-user walkthroughs, browser matrix,
    mobile editing, dynamic-import code-split verification.
19. **AI clarity/safety evidence** + live answer quality (flag-OFF; needs `DEEPSEEK_API_KEY`).

### D. Unverifiable product claims (confirm intent / location)
20. **Package-builder front-end host** — backend built+tested; no standalone UI located.
21. **Chart slice-click → filters Grid View** (journey 7) — charts are read-only; wiring not found.
22. **AI chat-history persistence on reopen** (journey 16) — no conversation store found.
23. **"Drafted proposal package" as first-value** (doc 21) — AI builder is default-OFF; clarify.
24. **Invite / shared-link visibility signifier scope** (doc 22 P1 #7/#8) — partial; confirm exact scope.

### E. Editorial / bookkeeping
25. ✅ **RESOLVED (2026-06-18 post-run):** roadmap file count corrected to **43** and the 3
    previously-unlisted files (`35-activity-history…`, `35-codex-goal-start-pack`,
    `36-first-execution-queue`) classified as non-canonical execution aids in doc 34 §1/§2.
    These were facts, not decisions.
26. ✅ **RESOLVED (2026-06-18 post-run):** goal-card count reconciled to **93** (78 original +
    10 collab/share + 5 DBIDX, + 15 EPIC headers) consistently across docs 26, 34, README.
    (Doc 99's "78/88" are its explicitly-frozen 2026-05-30 audit snapshot, left as-is by design.)
27. **Doc 22 summary arithmetic** (87 classified / 24 BETA P0 reconciled to its own table; confirm).
28. **`46-manual-proof-matrix.md`** — referenced widely but absent from the repo entirely
    (verified); kept as a flagged GHOST REFERENCE since no canonical target exists.
29. **UX scorecard numeric scores + "0% a11y coverage"** (doc 20) — provisional, require
    usability testing; left unchanged (not code-provable).
30. **Legal subprocessor list** (doc 08) — `/privacy` names Supabase/Vercel/Resend but omits
    Google + DeepSeek; no formal published list. Confirm required format.
31. **Inventory deliverable artifacts** (env-var inventory, API-route inventory, server-action
    inventory, feedback tracker) — the code exists, but the *deliverable artifact* wasn't located.
32. **Retention of the 3 superseded legacy files** (`action-plan.md`,
    `production-readiness-audit.md`, `status-tracker.md`) — kept frozen per the supersede rule;
    decide keep-as-history vs archive/remove (the loop cannot delete them).

---

## 6. Cycle ledger detail

| Cycle | Focus | Agents | Edits | Verify result |
|---|---|---:|---:|---|
| 1 | Per-doc reconcile + adversarial verify + fix | 90 | 226 | 35/35 lanes PASS |
| 2 | Cross-document consistency | 10 | 29 | 4/5 families converged |
| 3 | Final surgical (doc 01 Turnstile row #16) | (lead) | 1 | idempotency grep clean |

**Key cross-doc conflicts resolved in cycle 2:** rate-limiting Redis→Postgres framing
unified across docs 01/06/26/28 vs README/00/22; Turnstile "integrated"→"NOT BUILT"
unified across README/00/01; BETA-P0 / classification counts reconciled (doc 22 prose →
its own table; doc 01 gate count 25→26); dead `.ai/03_plans/` paths repointed to
`.ai/09_archive/`; owner-decision register state (32 decisions; 21 decided) unified across
README/14/24/34; desktop-guard + Turnstile-absent code flags propagated to all three
decision docs.

---

*Generated by the ROADMAP_SYNC_LOOP reconciliation run, 2026-06-18. Every status change in
the roadmap docs carries an inline code-evidence pointer. Re-run the loop to re-verify
idempotency after any code change.*
