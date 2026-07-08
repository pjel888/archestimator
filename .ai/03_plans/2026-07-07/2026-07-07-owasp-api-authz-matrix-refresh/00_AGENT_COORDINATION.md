# 00 — Agent Coordination

Plan folder: `.ai/03_plans/2026-07-07-owasp-api-authz-matrix-refresh/`
Date: 2026-07-07 (Asia/Manila)
Plan profile: `exhaustive`
Verification mode: `emulated` (see §Verification below)
Authoritative source of truth: **current `main` source** (cloudflare-d1/better-auth baseline), NOT the stale June audit.

## Master `/goal`

Produce an evidence-based, codebase-specific OWASP/API authorization plan pack that
audits every current API route, Server Action, public share/publication route, and
mutation path against first-user (pre-launch closed-beta) production expectations, and
that can drive a single implementation pass + test suite to close authorization
readiness gaps before external users are exposed.

### Outcome
A reviewer-approved, implementation-ready authorization matrix + remediation roadmap
that, when executed, leaves no current unauthenticated/authenticated mutation path
without a proven auth + authz + rate-limit + negative-test gate.

### Problem being solved
- The prior audit `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/` was
  written against git `dc044465` (Supabase/RLS/SECURITY DEFINER/Resend baseline) and
  is now stale: the codebase is Cloudflare D1 + Better Auth, route handlers and Server
  Actions have continued to evolve, and the closed-beta surface (invites, publication
  password lockout, privacy-request intake, collaboration room) has materially changed.
- There is no single current artifact mapping every endpoint → auth → authz →
  validation → rate-limit → test. This pack is that artifact.

### Planning scope (in)
- Every `src/app/api/**` route handler (33 files inventoried).
- Every `src/app/**/route.ts` non-API route handler (auth callback, invite, pending-invite).
- Every `"use server"` Server Action mutation path.
- The public share / publication surface (`src/app/share/**` + `src/app/api/share/**`).
- The auth boundary: Better Auth (`/api/auth/[...all]`), proxy (`src/proxy.ts`), session helpers.
- The D1 app-authorization layer (`src/lib/authz/d1-access.ts` + repository scoping).
- Cross-cutting controls: rate limiting (durable D1 + in-memory), CSRF/origin,
  body-size, CSP/headers, secrets, R2 object-key authz.

### Non-goals (out)
- Implementing any code/test/migration change (planning-only).
- Re-auditing non-API, non-auth concerns already covered by the June audit where the
  concern is unchanged (e.g., general XSS theory) unless a current route touches it.
- Hosted GitHub control evidence (branch protection, CodeQL, Dependabot, secret
  scanning) — recorded as an external evidence gap, not locally provable.
- Provider migration archaeology (Supabase exit) except where a current route still
  references a legacy surface.
- UI/UX/a11y design beyond the auth-flow UX states necessary for security review.

### Required codebase analysis
Endpoint inventory; auth/authz decision table; tenant isolation checks; mutation/
idempotency checks; CSRF/origin policy; rate-limit coverage; negative-test coverage
gaps; prioritized remediation.

### Required specialist workstreams (coverage map)
1. Product strategy/scope — lead.
2. Codebase architecture — Agent A (route inventory) + Agent F (authz layer).
3. UX/UI/a11y — minimal; auth-flow UX states only (Doc 05).
4. Frontend/components — minimal; client mutation wiring (Doc 06).
5. Backend/API/network — Agent A + Agent D (Server Actions).
6. Data/database — Agent F (D1 authz + tables).
7. Security/privacy/threat model — Agent B (share) + Agent C (auth) + Agent E
   (compliance/upload/invite/collab + cross-cutting) + Agent F.
8. Performance/reliability — Doc 09 (rate-limit DoS, in-memory limiter weakness).
9. Testing/QA — Agent F (test coverage gaps) + Doc 12.
10. Deployment/ops/rollout — Doc 13.
11. Blast radius/dependencies — Doc 10.
12. Adversarial gap analysis — emulated adversarial pass (Doc 19) + final verifier (Doc 17).

### Implementation-readiness criteria
- Every inventoried route/action maps to an explicit auth, authz, validation,
  rate-limit, and test verdict.
- Every gap has a stable ID, severity, owner role, and recommended remediation task.
- Shadow-path matrices cover every public mutation.
- No internally-resolvable critical contradiction remains.

### Validation criteria
- Cross-document consistency check passes.
- At least two critique-and-revision cycles (exhaustive profile).
- Final verifier records verification mode and applies the readiness cap.

### Final deliverables
This folder: `00`–`19` + `README.md` + `PROMPT.md` (pre-existing).

## Skills discovered and used

| Skill | Used? | Why |
|---|---|---|
| `archestimator-plan-pack` | Yes | Binds the dated `.ai/03_plans/<YYYY-MM-DD>-<slug>/` convention and the DISCOVER→PLAN→EXECUTE→VERIFY→RECORD→DECIDE loop; confirms this high-blast-radius (auth/security) work warrants a plan pack. |
| `Explore` (read-only subagent) | Yes | Dispatched 6 parallel read-only exploration lanes to inventory routes, share surface, auth, Server Actions, cross-cutting controls, and the D1 authz layer + tests. |
| `writing-plans` / `ce-plan` | Referenced | Cross-checked the exhaustive document set against the canonical planning structure. |
| `verification-before-completion` | Yes | Drove the requirement-by-requirement completion audit and the explicit maker/checker verification of exploration claims (several P0 flags from exploration were **downgraded after direct source read**). |
| `ultraqa` | Conceptual (for implementation phase) | Doc 19 specifies the adversarial scenario matrix the *future implementation* must satisfy; not run during planning. |
| `gitnexus` | Not used | Index available but the task is a focused auth/route inventory; targeted `rg`/Read by Explore subagents was cheaper and sufficient (per AGENTS.md proportional graph policy). |

Unavailable capabilities honestly recorded:
- No hosted/production proof environment (local source only).
- No live GitHub security-control readback for this planning pass (recorded as external gap).
- No browser automation (Doc 12 specifies where future Playwright proof is needed).

## Agents and workstreams

| Agent | /goal | Scope | Evidence | Dependencies | Findings | Conflicts | Status |
|---|---|---|---|---|---|---|---|
| Lead (this agent) | Synthesize the pack; final claim | Whole matrix; cross-doc consistency; verification | All docs below | All lanes | Synthesis; 2 P0/P1 downgrades after verification | Resolved invite-origin ambiguity | COMPLETE |
| Agent A (Explore) | Inventory all API + non-API route handlers | `src/app/api/**`, `src/app/**/route.ts` | 33 route files; helper index | none | Route decision table | none | COMPLETE |
| Agent B (Explore) | Inventory public share/publication surface | `src/app/share/**`, `src/app/api/share/**`, `src/lib/publication/**` | 8 share routes + page; credential taxonomy | none | Credential material table; rate-limit table | none | COMPLETE |
| Agent C (Explore) | Map Better Auth + session + proxy + OAuth/magic-link | `src/lib/auth/**`, `src/proxy.ts`, `src/lib/auth/request-proxy.ts`, `worker.ts` | Auth config; session helpers; cookie attrs | none | AuthN boundary map | none | COMPLETE |
| Agent D (Explore) | Inventory Server Actions | all `"use server"` modules | ~90 actions across 12 domains | none | Action matrix; P0 flags (some later downgraded) | P0 severity overstatement | COMPLETE & CORRECTED |
| Agent E (Explore) | Upload/invite/collab/proposal/feedback/compliance + cross-cutting | `src/app/api/{compliance,component-library,internal}/**`, `src/lib/{uploads,publication,collaboration}/**`, `next.config.ts`, `.env.example` | Domain matrices; rate-limit/CSRF/body-size inventory | none | 8 flagged gaps | none | COMPLETE |
| Agent F (Explore) | D1 app-authz layer + existing security tests | `src/lib/authz/d1-access.ts`, repository layer, `tests/vitest/**` | Authz predicate map; test coverage map + gaps | none | Authz model summary; 8 coverage gaps | none | COMPLETE |
| Adversarial reviewer (emulated) | Disprove readiness; find omissions | Whole draft pack | Doc 19 scenario matrix | All lanes | Residual findings list | none | COMPLETE |
| Final verifier (emulated) | Requirement-by-requirement audit | Whole pack vs PROMPT.md success criteria | Doc 17 | All lanes | Readiness scores; verification mode | none | COMPLETE |

### Verification note (maker/checker)
The six Explore lanes were read-only investigators. The lead then **independently
re-read the highest-severity source claims** before enshrining them (invite-origin.ts
line 39; beta-allowlist-admin-actions.ts lines 24/46; beta-feedback-review-actions.ts
line 15; group-actions.ts workspace+user scoping; publication/actions.ts
`assertProjectPublicationManager`; template-editor-actions.ts
`requireWorkspaceTemplate`; recipient-proposals actions→repository auth delegation).
**Result:** three P0 flags from exploration were **downgraded** because direct source
read proved the control exists at a layer the exploration did not fully trace. This
correction is recorded in Doc 08 (threat model), Doc 14 (risks), and Doc 17 (verifier).
True independent verification was unavailable; the pass is `verification_mode:
emulated`, which caps overall readiness at 97.

## Authority decisions recorded

- **Source authority:** current `main` source > June audit > model memory. The June
  audit's Supabase/RLS framing is treated as historical and not cited as live evidence.
- **Severity calibration:** a control "missing at one layer but present at another" is
  a defense-in-depth weakness (LOW/MED), not an authorization hole (HIGH/CRITICAL),
  unless the remaining layer is also bypassable.
- **Verification cap:** `emulated` ⇒ overall readiness cap 97, and (high-blast-radius)
  package status cap `CONDITIONALLY READY` unless an independent/owner review approves.
