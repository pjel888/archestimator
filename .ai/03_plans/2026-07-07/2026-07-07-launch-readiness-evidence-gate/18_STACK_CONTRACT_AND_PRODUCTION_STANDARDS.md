# 18 — Stack Contract & Production Standards

The launch gate lives at the **build/CI/tooling layer**, not the application layer. This document consolidates the cross-cutting production decisions.

## §1. Runtime & language
- **Bun 1.3.14 + TypeScript** — matches existing `scripts/*.ts` convention. No new runtime introduced.
- **No application imports** — the gate never imports `src/*`; it reads files and spawns anchors.
- **Type safety** — typed domain registry, verdict, status, report schema. No `any`.

## §2. Execution safety
- **Read-only default** (Stages 0–1): no network, no Cloudflare, no mutation.
- **Opt-in provider/hosted** (Stages 2–3): read-only Cloudflare API + read-only HTTP.
- **No mutating script** ever invoked by the gate (static test OPS-LG-01).
- **Catch-all** → exit 1 with `gate-error`.

## §3. Cloudflare boundary
- Bound resources only (Worker `archestimator-proof`, D1 `ARCH_DB`, R2 `ARCH_UPLOADS_R2`, DO `COLLAB_ROOMS`, Queue `UPLOAD_JOBS_QUEUE`, Email `EMAIL`, Images `IMAGES`).
- No mutation of historical Supabase `ebxxqidacheyapmmzavr` or other accounts.
- No paid features (D1 paid, R2 paid, Smart Placement, etc.) without owner approval.

## §4. Evidence rule
- **No provider/hosted/production claim from local-only checks** (FR-LG-05).
- Evidence classes labeled per domain.
- Freshness TTL enforced.

## §5. CI discipline
- CI currently disabled; gate is local-first.
- CI integration opt-in (advisory → required).
- No auto-branch/worktree (shared live worktree).

## §6. TypeScript, validation, domain modeling
- Typed report schema (versioned `schemaVersion`).
- Exhaustive verdict/status unions.
- No stringly-typed states.

## §7. Testing standard
- Unit tests for all pure logic (classifier, freshness, extractors).
- Adversarial matrix (12 §3).
- Snapshot tests for emitters.
- No manual QA except owner report readability.

## §8. Observability standard
- stdout JSON summary (CI-scrapable).
- Markdown report (owner dashboard).
- Per-anchor duration in report.

## §9. Rollout/rollback standard
- Ring progression (13 §2).
- Additive only; rollback = revert gate commit.
- Owner-gated for CI + launch.

## §10. Documentation standard
- Owner runbook.
- Anchor matrix.
- This pack's README points to the implemented gate.

## §11. Next.js / React / Tailwind
- **Not applicable** — the gate has no application runtime surface. No Server/Client component, cache, RSC, bundle, or design-system impact.

## §12. Better Auth
- **Not applicable** — the gate does not touch auth. It *reports* the verdict of `cf:better-auth-provider-proof` (DOM-36) but does not implement auth.

## §13. D1 / R2 / DO / Queue / Email
- **Read-only at Stage 2+** via anchor scripts. No direct gate calls. See `07`.

## §14. Design system
- **Not applicable** — no UI primitives. Markdown report follows existing evidence-report style.

## §15. Performance/reliability standard
- ≤120s local budget; per-anchor timeout; idempotent; graceful degradation. See `09`.

## §16. Security/privacy standard
- No secrets in reports; sanitized labels; not bypassable; producer pinning. See `08`.
