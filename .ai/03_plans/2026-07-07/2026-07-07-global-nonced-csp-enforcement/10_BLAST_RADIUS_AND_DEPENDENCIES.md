# 10 — Blast Radius and Dependencies

## 10.1 Direct impact

| Area | Impact | Classification | Evidence |
|---|---|---|---|
| `next.config.ts` CSP strings (`:20-47, 154-288`) | Removed for nonced routes; hardening headers kept | Required change | `03` §3.1, §3.8 |
| `src/proxy.ts`, `src/lib/auth/request-proxy.ts` | Nonce gen + CSP response header + x-nonce request header | Required change (serial critical path) | `03` §3.7 |
| `src/app/layout.tsx` | Become `async`, read `x-nonce`, propagate | Required change | `03` §3.9 |
| 8 inline-script components (`03` §3.3) | Accept + attach `nonce` prop | Required change | `03` §3.3 |
| New `src/lib/csp/{nonce,policy,route-class}.ts` | Policy builders | Required new files | `06` §6.2 |
| New `src/app/api/csp-report/route.ts` | Reporting endpoint | Required new file | `06` §6.6 |
| 4 existing CSP tests (`03` §3.11) | Rewritten for proxy-owned CSP | Required change | `03` §3.11 |
| New proxy/nonce tests | Added | Required new files | `12` |
| Browser proofs (Playwright) per phase | Added | Required | `12` TEST-03 |
| Marketing page rendering | Dynamic (if DEC-11 A) | Probable change (perf-gated) | `06` §6.4 |

## 10.2 Transitive impact

| Area | Impact | Classification | Evidence |
|---|---|---|---|
| All HTML routes (`/`, `/share`, `/workshop`, `/invite`, `/login`, ...) | Stronger CSP header | Verification only (no code change) | `03` |
| `/api/*` JSON routes | No CSP added; hardening headers unchanged | Explicitly unaffected | `07` §7.2 |
| D1 / R2 / DO / Queue / Email | No change | Explicitly unaffected | `07` §7.1 |
| Better Auth / sessions / OAuth | No change | Explicitly unaffected | `08` §8.6 |
| Collaboration WebSocket | Allowed via `connect-src wss:` (no code change to client) | Verification only | `03` §3.5 |
| Google Maps (workshop) | Allowed via allowlist (no code change) | Verification only | `03` §3.5 |
| GA4/Clarity/Cloudflare Insights (landing) | Allowed via allowlist + nonce on loader | Verification only | `03` §3.3 |
| User avatars | Allowed via img-src hosts added to landing | Verification only | `03` §3.5 |
| Storybook / stories | Not production; out of scope | Explicitly unaffected | `03` §3.5 (story-only img hosts ignored) |
| Demo seed `imageUrl` hosts | Decision needed (DEC-12) | Probable change (migration) or allowlist | `03` §3.5 |
| `wrangler.jsonc`, `open-next.config.ts`, `worker.ts` | No change required (worker.ts fallback only) | Explicitly unaffected | `03` §3.8 |
| Backward compatibility (API consumers) | No contract change | Explicitly unaffected | `07` §7.6 |

## 10.3 Affected users / roles

| User / role | Impact |
|---|---|
| Anonymous visitor (marketing) | If DEC-11 A: page still renders (slightly higher TTFB); analytics still load. If B: unchanged. |
| Authenticated estimator | Workshop unchanged (already dynamic); collaboration unaffected. |
| Invitee | Invite flow unchanged (nonce plumbed on redirect script). |
| Share recipient | Proposal renders identically; nonce fresh per request. |
| API consumer | Unchanged. |

## 10.4 Affected tests / CI

- `tests/vitest/landing-security-headers.test.ts` — rewritten.
- `tests/vitest/project-location-map-csp.test.ts` — rewritten.
- `tests/vitest/project-publication-security-headers.test.ts` — rewritten.
- `tests/vitest/project-publication-security.test.ts` — P11 placeholders made real.
- `tests/vitest/next-config-workshop-headers.test.ts` — updated.
- `tests/vitest/cloudflare-web-analytics-integration.test.ts` — likely still valid
  (asserts source presence; verify after rollout).
- `tests/vitest/project-location-privacy-source.test.ts` — likely still valid.
- `tests/vitest/shared-link-header-smoke-script.test.ts` — verify the smoke helper
  still passes against enforced `/share`.
- New: `tests/vitest/csp-nonce-proxy.test.ts`, `tests/vitest/csp-policy-builder.test.ts`,
  `tests/vitest/csp-report-endpoint.test.ts`, Playwright proofs.
- `bun run validate` — must stay green.

## 10.5 Concurrent-agent safety

This is a **shared live worktree** (`AGENTS.md`). The implementation touches
`next.config.ts`, `src/proxy.ts`, `src/lib/auth/request-proxy.ts`, and
`src/app/layout.tsx` — all shared critical-path files. Per `AGENTS.md` high-concurrency
discipline:

- The proxy + layout work is **serial** (one agent; do not split `request-proxy.ts`
  across agents — it already owns auth gating).
- `next.config.ts` edits must re-read the file immediately before edit (concurrent
  sidebar/estimates work is uncommitted in the working tree today).
- New files under `src/lib/csp/` and `src/app/api/csp-report/` are disjoint scopes —
  parallel-safe.
- Test rewrites are disjoint per file — parallel-safe.
- No branch/worktree creation.

## 10.6 Dependencies (sequencing)

- SEC-01 (nonce gen) → SEC-02 (propagation) → SEC-03 (drop unsafe-inline) → enforcement
  phases.
- SEC-08 (report endpoint) must exist before the observation window (OPS-02) starts.
- TEST-01 (rewrite tests) must land with the proxy change (else CI red).
- DEC-11 (marketing perf) gates P5.
- DEC-12 (seed hosts) gates workshop avatar/img allowlist correctness.

## 10.7 Documentation impact

- `.ai/10_state/compliance/csp-decision-brief.md` — update (close OPEN-DEC-007/008).
- `.ai/10_state/decisions.md` — add DEC-01..DEC-12.
- `.ai/10_state/current-state.md` — update P0.2 row per phase.
- `.ai/01_roadmap/02-security-tenancy-data-protection.md`,
  `00-production-readiness-dashboard.md` row 1.21,
  `01-launch-gates-master-checklist.md` — update per phase; clarify SEC-05 is token
  boundary, not CSP.
- `next.config.ts` in-code comments — remove deferral notes once enforced.
