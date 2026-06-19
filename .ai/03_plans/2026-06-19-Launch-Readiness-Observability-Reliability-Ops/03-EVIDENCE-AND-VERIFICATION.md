# Observability, Reliability & Ops — Evidence & Verification (2026-06-19)

Adversarial verification of `01-AUDIT-FINDINGS.md`. Each finding was re-opened at the cited
files/lines and tested for refutation. Default posture: skepticism. Prior `existing_plan_overlap`
claims re-checked against the real OWASP pack and decisions.md.

## Verification verdicts

### OPS-01 — root error boundaries absent — **CONFIRMED (high, blocker)**
- `find src/app -name global-error.tsx -o -name error.tsx -o -name not-found.tsx` → **7 hits,
  all under `src/app/workshop/`** (library×4, projects×3). No `global-error.tsx`, no root
  `error.tsx`, no `not-found.tsx`. Matches the audit's "7 hits all workshop" claim exactly.
- `rg "getDerivedStateFromError|componentDidCatch" src/` → **0 hits**. No React ErrorBoundary
  class anywhere. `rg "ErrorBoundary|catch|onError" src/app/providers.tsx` → **0 hits**;
  providers do not catch. A root-layout/provider throw → unstyled Next crash screen.
- Verdict holds. Externally-reachable tokenized paths (`/invite`, `/share`) are the high-throw
  surface and have no segment boundary outside `/workshop`.

### OPS-02 — package-builder no rate limit — **CONFIRMED as a code gap, ADJUSTED to medium / NOT a blocker**
- `handlePackageBuilderRequest` (`handler.ts:176-209`) authenticates (`getUserContext`,
  `authMode==="supabase"` + `workspaceId`) then proceeds; `rg "quota|rate.?limit|checkAi"`
  in the package-builder dir → **none**. The rate-limit gap is real.
- **Refutation of the blocker framing:** `src/app/api/ai/package-builder/route.ts` gates on
  `isAiRoutesEnabled()` and returns `createAiDisabledResponse()` (HTTP 404 "AI is disabled for
  closed beta") **before importing the handler**. `isAiRoutesEnabled()` →
  `readBooleanFeatureFlag(AI_ROUTES_ENABLED_ENV, false)` — **defaults false**. `/api/ai/ask`
  has the identical gate. current-state.md:1935 records a hosted smoke: signed-out
  `POST /api/ai/ask` returned **404 "AI is disabled for closed beta."**
- So in the shipped closed-beta config the handler is unreachable; the DeepSeek-spend exposure
  is **latent**, triggered only when AI is flipped on. Severity → medium; blocker → false; it
  becomes a **pre-AI-enable gate** (R-5). The audit's `existing_plan_overlap` (stale OWASP
  F-RL-04, `ai/ask` half done, package-builder half open — referenced internally as `ai/n`) is
  accurate; OWASP 09 lists `/api/ai/ask` + `/api/ai/n` together and only ask was fixed.

### OPS-03 — no durable error/log sink — **CONFIRMED (high, blocker — interim posture is the gate)**
- `rg -i "sentry|pino|@vercel/otel|datadog|logtail|opentelemetry" package.json` → **NONE**.
- `logStructured(...)` in `share/[token]/decision/route.ts:34` resolves to `console.error({...})`.
- `src/lib/collaboration/realtime-telemetry.ts:7` and
  `src/lib/estimates/express-components-telemetry.ts:28` both literally say a real sink
  (Clarity/Sentry) "can be swapped in" — i.e. not yet wired. Confirmed.
- The structured shape + IP-hash is genuinely good; the gap is that every sink is ephemeral
  `console.*`. Blocker framing is the *interim posture must be agreed* (Option A or B), not that
  Sentry must exist. Holds.

### OPS-04 — monitoring readiness unproven — **CONFIRMED as fact, ADJUSTED high→medium (NOT a code blocker)**
- `check-support-monitoring-readiness.ts:52-86` confirmed: parses 5 env proof-flags + 4 owner
  labels; `supportMonitoringReady = missing.length === 0`; its own `note` (line 84) admits it
  verifies nothing live. current-state.md:2085 records latest artifact
  `supportMonitoringReady: false`, all flags false, 9 missing. (Audit cited line 2079; actual
  is ~2085 — immaterial, evidence identical.)
- **Adjustment:** this is an operator checklist + decision, not a defect in code. It is fully
  gated on R-2 (sink) and R-4 (probe) existing first, plus a human action. It is a genuine
  **launch checklist item** but not a *code* launch-blocker; downgraded to medium and moved to
  Phase 1. The proof harness already exists, so the residual is purely standing up the real
  monitors + truthfully setting the flags.

### OPS-05 — health is a static stub — **CONFIRMED (medium, not blocker)**
- `src/app/api/health/route.ts` (read in full): returns hard-coded
  `{ ok: true, service: "archestimator", timestamp }` with `force-dynamic` + `no-store`. No
  Supabase ping, no env assertion. A monitor on it gives false confidence. Holds.

### OPS-06 — PITR/RPO decision under-specified — **ADJUSTED medium→info (mostly already recorded)**
- `check-supabase-backup-readiness.ts`: confirmed `daily-backup` mode forces `pitrReady=true`
  (line 151) and treats a `blocked` restore-drill as accepted-risk (line 149); the note (line
  178) confirms it "never performs a restore."
- **Refinement of overlap:** the audit marked overlap "covered-by AGENTS.md/current-state" but
  decisions.md:**748** (2026-06-03) already records the explicit closed-beta PITR-off cost
  decision ("practical MVP compromise, not enterprise DR readiness"). The only genuine residual
  is an explicit **RPO ≤ 24h** number and a stated **restore-untested** acceptance. Downgraded
  to info; residual captured in R-8.

### OPS-07 — no scheduled rate-limit GC — **CONFIRMED (low, not blocker)**
- `rg "pg_cron|cron.schedule" supabase/migrations/` → **NONE**. `rate-limit.ts:53-54` deletes
  `expires_at < now` inline before insert (traffic-driven, per-key). `_expiry_idx` exists so a
  sweeper is cheap. Holds; hygiene only at beta volume.

### OPS-08 — email/error PII in ephemeral logs — **CONFIRMED (low, not blocker)**
- `collaboration/actions.ts:582,724` → `console.warn("[collaboration] invite email delivery
  failed", {...})`; `publication/actions.ts:1127` → `console.warn(..., { email: r.email, error:
  sendResult.error })`. Recipient emails + raw provider errors land in function logs. The
  share-route path *is* IP-hashed (good), and analytics *is* redacted — so this is narrowly the
  server-log surface. Holds; becomes material when R-2 makes logs durable (hence R-7 pairs with R-2).

## Refutations / downgrades summary
- **OPS-02:** refuted as a *closed-beta launch* blocker — AI routes are 404-gated off by
  default (`isAiRoutesEnabled()` → false). Real gap, but pre-AI-enable, not pre-launch.
- **OPS-04:** downgraded high→medium — operator checklist, not a code defect; gated on R-2/R-4.
- **OPS-06:** downgraded medium→info — core decision already in decisions.md:748.
- No finding fully refuted as nonexistent; all eight describe real conditions.

---

## Proof gates per remediation item

Honest about what local checks can and cannot prove. This stage is hosted-on-Vercel; several
gates are inherently external/manual.

| Item | Proof gate | Local-provable? |
|---|---|---|
| **R-1** (boundaries) | Vitest render test for `error.tsx`/`global-error.tsx` (renders, `reset()` callable); `bun run build` (Next validates `global-error.tsx` shape); **manual**: force a throw in a root RSC and confirm branded screen + reload, not the raw Next page. | Build + unit: yes. The actual root-layout-throw render: **manual/hosted only** — unit tests can't fully exercise `global-error.tsx` replacing the root layout. |
| **R-2** (sink) | If Option A: `bun run build` with `@sentry/nextjs` + a unit test that `beforeSend` strips emails/IPs from a synthetic event. If Option B: a recorded decisions.md entry + a screenshot/log of one event reaching the drain. | PII-scrub unit: yes. **Event actually reaching the hosted tracker/drain: provider-side only.** |
| **R-3** (monitoring) | `bun run launch:check-support-monitoring` → `supportMonitoringReady: true` **with real flags**; plus a **manual** screenshot of one alert firing end-to-end. | Parser pass: yes (but trivially gameable — the parser proves nothing live, by its own note). Real alert delivery: **manual/provider only.** |
| **R-4** (readiness probe) | Vitest for the probe (mock Supabase ok→`{ok:true}`, error→`{ok:false}`+503, never leaks detail); `bun run build`; **manual** hosted `GET /api/health/ready` against live Supabase + against a forced-fail. | Unit + leak-shape: yes. Live-outage behavior: **manual/hosted.** |
| **R-5** (pb rate limit) | Vitest mirroring the `ai/ask` quota suite: allowed→200, denied→429+Retry-After, storage-error→503 (fail-closed); reuse the existing rate-limit test patterns. Codex review (high-blast: touches durable rate-limit + provider spend). | Yes — fully unit-provable with mocked Supabase, like ask. |
| **R-6** (GC cron) | If pg_cron migration: apply to project `ebxxqidacheyapmmzavr`, then `select * from cron.job` shows the schedule; run the delete once and assert expired rows gone. | Migration apply + query: yes (DB-autonomy in-project). |
| **R-7** (log redaction) | Vitest: the `log.ts` helper hashes/elides emails and maps provider errors to codes (assert no raw email/error body in output). | Yes — pure unit. |
| **R-8** (RPO record) | A new dated line in `.ai/10_state/decisions.md`; optional `daily-backup` restore drill converting `blocked`→`passed` in `check-supabase-backup-readiness`. | Decision record: yes. Restore drill: **manual/provider.** |

## What local checks CANNOT prove (be honest at launch)
- That an alert actually pages a human (R-3) — only a live fire drill shows this.
- That the durable sink retains/redacts correctly in production (R-2) — provider-side.
- That `global-error.tsx` catches a *real* root-layout crash (R-1) — needs a forced hosted throw.
- That the readiness probe flips red on a real Supabase outage (R-4) — needs an induced outage.
- `bun run validate` is known-red on main (charts set-state-in-effect; ProposalExportPreviewDialog
  design-lint) and test:dom all-phase can hang — any fix must not add NEW reds; scope Vitest to
  the touched files rather than relying on the full red suite.
