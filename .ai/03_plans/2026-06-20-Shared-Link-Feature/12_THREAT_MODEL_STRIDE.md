# 12 — STRIDE Threat Model: Public Shared-Link Surface

Date: 2026-06-21 · **Status:** Authored — systematic STRIDE coverage for the public,
unauthenticated, money-bearing share surface. Demonstrates control coverage instead of the ad-hoc
8-finding list in [10](10_SECURITY_PRIVACY_API_AUDIT.md). **All finding IDs, severities, and
statuses are bound to [75](75_FINDING_ID_REGISTRY.md); if this doc disagrees with 75, 75 wins.**

Source-of-truth cross-links: canonical IDs/severities/statuses [75](75_FINDING_ID_REGISTRY.md) ·
source-verified facts + open decisions D1–D11 [`_COORDINATION.md`](_COORDINATION.md) ·
field-by-field exposure DPIA [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) (D2/D3) ·
forward execution + acceptance criteria [91](91_FORWARD_EXECUTION_PLAN.md) ·
owner decisions [71](71_OPEN_DECISIONS_REGISTER.md).

> **Anchor note.** All `file:line` anchors below were re-verified against current source on
> 2026-06-21. `actions.ts` is ~1538 lines (digest gate now at `1526`/`1532`, not the `1471/1477`
> the older [10](10_SECURITY_PRIVACY_API_AUDIT.md) cites); `ProjectPublicationHeader.tsx` is ~1172
> lines. Re-pin to a commit SHA if drift recurs.

---

## 1. Asset & trust-boundary map

The public share surface is reached by **anyone holding a bearer token URL** (`/share/[token]`)
with **no login**. Public reads/writes run through **server-side service-role Supabase clients**
(`src/lib/publication/public-repository.ts:72`), so **the Next.js route layer is the entire trust
boundary** — RLS is bypassed by service-role, so every authz check is application-code, not the DB.

```
                         TRUST BOUNDARY = route handlers under src/app/api/share/[token]/*
                         (service-role client → no RLS backstop on these paths)
  ┌─────────────────┐    ┌──────────────────────────────────────────────────────────────┐
  │ Untrusted        │   │  Public route layer (the ONLY enforcement point)              │
  │ recipient /      │   │  • token HMAC lookup   • password access cookie               │
  │ bot / scanner /  │──▶│  • recipient session cookie  • same-origin+CSRF (writes)      │
  │ link-forwardee   │   │  • durable rate limits  • snapshot DTO re-sanitize            │
  └─────────────────┘    └───────────────┬──────────────────────────────────────────────┘
                                          │ service-role
                          ┌───────────────▼───────────────┐
                          │ Postgres: publications, comments, responses, events,        │
                          │ recipients, security_rate_limit_events                       │
                          └─────────────────────────────────────────────────────────────┘
```

### Assets (what an attacker wants / what we must protect)

| # | Asset | Where it lives | Sensitivity |
|---|---|---|---|
| A1 | **Raw bearer token** | URL; encrypted-at-rest for manager recopy (`security.ts:76`) | Possession = full read access (and write, with a recipient token). Never stored raw; DB lookup via HMAC hash. |
| A2 | **HMAC token hash** | `createHmac("sha256", secret)` (`security.ts:71`), prod secret fail-closed (`security.ts:100`) | Lookup key; secret compromise = offline token-guess. |
| A3 | **Password access cookie** | signed HttpOnly SameSite=Lax, bound to token digest+publicationId+credentialVersion+expiry (`security.ts:328`,`security.ts:343`) | Bypasses the password gate if forgeable. |
| A4 | **Recipient session cookie** | signed HttpOnly, name = `shared_link_session_[token-digest]`, bound to publicationId+credentialVersion+recipientId (`security.ts:440`,`security.ts:473`) | Authorizes comment/decision writes as a specific recipient. |
| A5 | **Public snapshot DTO** | `totalCost`, `clientName`, `location`, `currencyCode`, estimate names/rows/qty/units/row-totals, allow-listed image URLs (`types.ts:107`–`115`) | **Money-bearing + PII** (client identity, site location, total project cost). |
| A6 | **Comment write RPC** `insert_client_comment` | service-role RPC, called after the route gate (gate `comment/route.ts:228`-`234`; RPC call `public-repository.ts:1034`; RPC at migration `20260620142000`) | Writes recipient comments; validates active publication + recipient hash + snapshot version. |
| A7 | **Decision write RPC** `submit_client_response` | service-role RPC, called after the route gate (gate `decision/route.ts:186`-`192`; RPC call `public-repository.ts:1114`; RPC at migration `20260620142000`) | **Money-bearing**: records approve/decline of a proposal. One-shot (`409` "Decision already submitted." `decision/route.ts:234`). |
| A8 | **Telemetry / event tables** | `project_publication_events`, `security_rate_limit_events`; HMAC-peppered IP/UA via `hashRequestValue` (`public-repository.ts:171`,`:179`) | Write-amplification + owner-visible activity surface; privacy of recipient IP. |
| A9 | **Unsubscribe link** | `GET` interstitial + `POST` mutate (`unsubscribe/route.ts:54`,`:66`) | Email-suppression toggle for a known recipient token. |
| A10 | **Activity route** `GET /activity` | public-safe filtered read (`activity/route.ts:27`) | Owner/recipient activity feed; must never leak comment **bodies** or internal comments to the public view. |

### Trust boundaries

- **TB-1 Network → route layer.** Bearer-token possession is the only "credential" for reads.
- **TB-2 Route layer → password gate (A3).** Password-protected snapshots/metadata are withheld
  until the signed access cookie verifies (`route.ts:37`-`52`, `session/route.ts:57`-`69`).
- **TB-3 Route layer → recipient session (A4).** Writes (A6/A7) require a valid session cookie.
- **TB-4 Route layer → service-role DB.** No RLS backstop on these paths → app code is authz.
- **TB-5 Browser → write routes.** Same-origin + CSRF header/cookie pair on password/comment/
  decision/events/session (`security.ts:358`-`372`).

---

## 2. Per-asset STRIDE table

Threat → existing control (with `file:line`) → residual risk → linked finding (bound to
[75](75_FINDING_ID_REGISTRY.md)). STRIDE = **S**poofing **T**ampering **R**epudiation
**I**nfo-disclosure **D**enial-of-service **E**levation-of-privilege.

### A1/A2 — Bearer token & HMAC hash

| STRIDE | Threat | Existing control | Residual | Finding (75) |
|---|---|---|---|---|
| S | Guess/forge a valid token | 32-byte CSPRNG token, base64url (`security.ts:61`); lookup by HMAC-SHA256 with prod-required secret, fail-closed (`security.ts:71`,`security.ts:100`) | Negligible (256-bit). Link-forwarding (a recipient pastes the URL) is **out of scope by design** — bearer model. | — |
| I | Token leaks via logs/referrer | Raw token never stored; encrypted-at-rest only for recopy (`security.ts:76`); responses `Cache-Control: no-store` | Referrer/clipboard leakage is inherent to bearer links; accepted for beta. | — |
| T | Tamper HMAC secret to mint hashes | Secret server-only, prod fail-closed (`security.ts:100`) | Depends on env-secret hygiene (ops). | — |

### A3 — Password access cookie

| STRIDE | Threat | Existing control | Residual | Finding (75) |
|---|---|---|---|---|
| S | Forge access cookie to skip gate | HMAC-signed, bound to token digest+publicationId+credentialVersion+expiry (`security.ts:328`,`security.ts:343`); verified on every gated read (`route.ts:37`-`44`) | Negligible without the signing secret. | — |
| E | Brute-force the password | scrypt hash (`security.ts:146`,`security.ts:157`); durable attempt limiter in `security_rate_limit_events` (`public-repository.ts:460`) + process-local progressive lockout (`security.ts:558`) | Process-local lockout is per-node (D4); durable layer covers multi-node. | SHF-03 / **D4** |
| T | Replay an old cookie after password change | `credentialVersion` binding invalidates on rotation (`security.ts:343`) | None material. | — |

### A4 — Recipient session cookie

| STRIDE | Threat | Existing control | Residual | Finding (75) |
|---|---|---|---|---|
| S | Forge a session to post as a recipient | HMAC-signed, bound to publicationId+credentialVersion+recipientId; verified on writes & activity (`security.ts:473`,`activity/route.ts:145`-`152`) | Negligible without secret. | — |
| E | Create a session without proving recipient identity | Session POST verifies publication, password access if required, and hashed recipient token scoped to publication (`session/route.ts:52`-`74`) | None material. | SEC-SHARE-02 (**Fixed**) |
| D / E | Cross-origin / CSRF session creation | `assertSameOriginPublicPost` (Origin required + CSRF pair) at `session/route.ts:29`; `checkSharedLinkSessionStartRateLimit` at `session/route.ts:41` | Closed. (10's "weaker same-origin, no CSRF, no rate limit" is now Fixed.) | SEC-SHARE-02 (**Fixed**) |
| S / E | **Session DELETE forged cross-origin (logout CSRF)** | **None** — `DELETE` (`session/route.ts:109`) has **no** `assertSameOrigin`/CSRF/auth | A cross-origin page can clear a recipient's session cookie (forced logout / nuisance). Low impact (no data exposure). **See §3, D5.** | **D5** family (`SEC-SHARE-05` cluster) |

### A5 — Public snapshot DTO (money + PII)

| STRIDE | Threat | Existing control | Residual | Finding (75) |
|---|---|---|---|---|
| I | Internal unit rates leak | `sanitizeProjectPublicationSnapshotForPublicRead` strips unit/misc/contingency (`route.ts:78`, `snapshot.ts:71`,`:95`,`:112`; tested `project-publication-snapshot.test.ts:68`) | None for cost-rate fields. | — |
| I | Private project images / tracking pixels leak | Image-URL allow-list (local thumbs or configured WebP), blocks off-origin/credentialed/query/traversal/project-images (`image-url.ts:21`,`:36`,`:42`) | None material. | — |
| I | **Exact `project.location` exposed to every recipient** | DTO includes `location` (`types.ts:108`); snapshot built from `actions.ts` location field | If location is a precise address/GPS, every unlocked link recipient receives it. **Product decision, not yet redacted.** | **SEC-SHARE-07** (P3, **Decision** → **D2**), DPIA [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) |
| I | **`clientName` + `totalCost` exposed publicly** | DTO includes both (`types.ts:107`,`:115`) — intentional proposal context | Client identity + total project cost visible to anyone with the link. Owner-decision whether this is acceptable default. | **SEC-SHARE-07 → D2** family; **D3** (clientName/totals/public IDs) — DPIA [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) |
| I | Password-gated details leak before unlock | Snapshot JSON + page metadata generic until access cookie verifies (`route.ts:37`-`52`, `page.tsx:271`) | None material. | — |

### A6/A7 — Comment & decision write RPCs (money-bearing)

| STRIDE | Threat | Existing control | Residual | Finding (75) |
|---|---|---|---|---|
| S/E | Write without a valid recipient session | Same-origin+CSRF (`comment/route.ts:168`, `decision/route.ts:126`) + signed session bound to credentialVersion; RPC re-validates active publication + recipient hash | None material. | MANAGER-F-01 (**Partial** — full role-rejection matrix Open) |
| T | **Replay stale snapshot: approve/comment against superseded content after content-only republish** | Route 409 when `viewedSnapshotVersion !== access.snapshotVersion` (`comment/route.ts:228`-`234`, `decision/route.ts:186`-`192`) **+** RPC `is distinct from` equality lock (migration `20260620142000`). Belt-and-suspenders. | Closed. (Conflicts with the UX intent that old pages keep working → **D1**.) | **SEC-SHARE-01** (P1, **Fixed**) |
| T | Tampered `viewToken` accepted | Unverifiable/absent-but-present view token → 409 (`comment/route.ts:223`-`226`, `decision/route.ts:181`-`184`) | Closed; needs route test (QA-G07). | SEC-SHARE-01 / QA-G07 (**Open** test) |
| R | Recipient denies submitting a decision | Decision is one-shot, recipient-bound, telemetry-logged; second submit → 409 (`decision/route.ts:234`) | Non-repudiation is "recipient token + session" strength, not signed legal attestation. Accepted for beta. | — |
| D | Comment flooding | Durable per-recipient limiter (`comment/route.ts:269`, `decision/route.ts:203`) + read-side limiter (`comment/route.ts:152`) | Per-recipient; an attacker still needs a valid session. | SEC-SHARE-03 cluster (**Fixed**) |
| I | XSS via comment/note body | Comment sanitized + length-capped (test `project-publication-comments.test.tsx:259-278`); note `sanitizeSharedLinkRecipientText(note,2000)` (`decision/route.ts:145`); no `dangerouslySetInnerHTML` on receiver | DOM-render escaping test still Open. | QA-G01/G02 (**Stale-invalid**→ regression test), QA-G03 (**Open**) |

### A8 — Telemetry / event tables

| STRIDE | Threat | Existing control | Residual | Finding (75) |
|---|---|---|---|---|
| D | Unbounded open/event writes inflate `project_publication_events` | Event write now gated by `checkProjectPublicationEventRateLimit` before recording on snapshot GET (`route.ts:61`-`63`); limiter on `/events` (`events/route.ts`) | Closed for the snapshot GET path. | **SEC-SHARE-03** (P2, **Fixed**) |
| I | Recipient IP de-anonymized from telemetry | DB telemetry uses HMAC-peppered `hashRequestValue` (`public-repository.ts:171`,`:179`); route logs now use `hashPublicTelemetryValue()` (was unsalted SHA-256) | Closed. | **SEC-SHARE-04** (P2, **Fixed**) |
| E | Recipient reads owner-only event rows | Manager-read RLS symmetry on `project_publication_events` pending-review, not applied | Read-symmetry hardening deferred. | **D10** (RLS as release gate vs post-launch) |

### A9 — Unsubscribe link

| STRIDE | Threat | Existing control | Residual | Finding (75) |
|---|---|---|---|---|
| T | Scanner/prefetch silently unsubscribes (GET side-effect) | **GET is read-only** — renders escaped interstitial whose form POSTs the mutation (`unsubscribe/route.ts:47`-`63`; test `share-unsubscribe-interstitial.test.ts:22`) | Closed. | — |
| S/E | **Cross-origin / absent-Origin POST unsubscribes a known recipient** | `assertSameOrigin` on POST (`unsubscribe/route.ts:70`) — but `assertSameOrigin` **returns `ok` when Origin is absent** (`security.ts:346`-`348`, the `if (!origin) return { ok: true }` branch; doc [10](10_SECURITY_PRIVACY_API_AUDIT.md) cites `security.ts:346`); no CSRF pair; no rate limit | A no-Origin POST (or forged form) can unsubscribe a known token. Impact: **email suppression only** for a known publication+recipient token; no data exposure / proposal mutation. | **SEC-SHARE-05** (P3, **Open — Deferred**) → §3, D5 |

### A10 — Activity route

| STRIDE | Threat | Existing control | Residual | Finding (75) |
|---|---|---|---|---|
| I | **Public activity feed leaks comment bodies / internal comments** | Activity select no longer returns comment bodies — projects only `id, created_at, is_internal, author_email, author_name, recipient_id, estimate_id, row_id` (`activity/route.ts:155`-`157`); `is_internal=true` filtered for public/unauthenticated views (`activity/route.ts:28`) | Closed. (Was mislabeled `SEC-SHARE-05` in [70](70_CONSOLIDATED_FINDINGS_AND_BACKLOG.md); re-IDed.) | **SEC-SHARE-09** (P1, **Fixed**) |
| S | Forge a recipient session to widen the feed | Optional session verified via `verifySharedLinkSessionCookieValue` (`activity/route.ts:145`-`152`); public view still filters internal | None material. | — |
| D | Activity-read flooding | `checkProjectPublicationActivityRateLimit` (`activity/route.ts:86`) | Per token+IP; bounded. | SEC-SHARE-03 cluster (**Fixed**) |

---

## 3. Explicitly catalogued scattered gaps (so none are uncatalogued)

These were scattered across [10](10_SECURITY_PRIVACY_API_AUDIT.md) and review notes. Cataloguing
them here against 75 closes the "ad-hoc list" coverage gap.

| Gap | Where | Status (75) | Disposition |
|---|---|---|---|
| **Session DELETE has no same-origin/CSRF guard** | `session/route.ts:109` (no `assertSameOrigin`, no CSRF, no auth) | **D5** family | Owner call: 403 cross-origin DELETE vs allow (logout-CSRF nuisance only, no data risk). See [71](71_OPEN_DECISIONS_REGISTER.md) **D5**. |
| **Unsubscribe absent-Origin POST** | `unsubscribe/route.ts:70` + `security.ts:346`-`348` (`assertSameOrigin` allows missing Origin; doc [10](10_SECURITY_PRIVACY_API_AUDIT.md) cites `security.ts:346`) | **SEC-SHARE-05** (P3, Open-Deferred) | Add CSRF nonce in interstitial or require Origin on POST + durable rate limit. Tracked [91](91_FORWARD_EXECUTION_PLAN.md). |
| **Owner digest never fires from public routes** | `comment/route.ts:299`-`300`, `decision/route.ts:224`-`225` → `maybeTriggerSharedLinkActivityDigest` requires `requireCurrentUserContext()` → returns `digest-auth-required` (`actions.ts:1526`,`1532`,`1534`), swallowed | **SEC-SHARE-06** (P3, Open) | Notification gap, not a breach. Fix = service-role helper that verifies publicationId+token hash without a browser session. → **D9**. |
| **Stale-snapshot replay** (approve/comment on superseded content) | `comment/route.ts:228`-`234`, `decision/route.ts:186`-`192` + migration `20260620142000` | **SEC-SHARE-01** (P1, **Fixed**) | Closed (route 409 + RPC equality). Residual = UX tension with "old page keeps working" → **D1**. |
| **location / clientName / totalCost public disclosure** | `types.ts:107`,`:108`,`:115` | **SEC-SHARE-07** (P3, Decision) | Owner decision **D2** (location) / **D3** (clientName, totals, public IDs); recorded field-by-field in DPIA [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md). |
| **Non-atomic revoke+insert** in `createProjectPublication` | `actions.ts` revoke-then-insert; pending `AC-MOD-06_one_published_publication_per_project.sql` | **SEC-SHARE-08** (P3, Open) | Availability/integrity (transient failure → no active link). Transaction/RPC + uniqueness index. → **D8**, runbook [90](90_DEPLOY_AND_MIGRATION_RUNBOOK.md). |

---

## 4. Abuse / DoS catalogue

| Abuse | Vector | Existing control | Residual | Finding (75) |
|---|---|---|---|---|
| **Open-event flooding** | Repeated `GET /share/[token]` page + snapshot API writes `open` rows | Event-write limiter on snapshot GET (`route.ts:61`); snapshot-read limiter 60/min (`public-repository.ts:393`-region) | Closed for the snapshot GET path. | **SEC-SHARE-03** (P2, **Fixed**) |
| **Password brute-force** | Repeated `POST /password` guesses | Durable attempt limiter `security_rate_limit_events` (`public-repository.ts:460`) + process-local progressive lockout (`security.ts:558`) + scrypt cost | Process-local lockout is per-node only (multi-node beta → durable layer carries). | SHF-03 / **D4** |
| **Session-init probing** | Repeated `POST /session` to force publication+recipient lookups | `checkSharedLinkSessionStartRateLimit` before recipient verify (`session/route.ts:41`) | Closed. | SEC-SHARE-02 (**Fixed**) |
| **Rotate amplification** | Owner rotates a link with many recipients | Rotate re-issues per recipient (O(recipient count)) | Scale cost; not a security defect. Credential-version model is the scale backlog. | **PERF-12** (P3, Open-measure) |
| **Comment/decision flooding** | Authenticated-recipient write spam | Per-recipient durable limiters (`comment/route.ts:269`, `decision/route.ts:203`) | Requires a valid session; bounded. | SEC-SHARE-03 cluster (**Fixed**) |

**Verification commands (per item) — bind to [91](91_FORWARD_EXECUTION_PLAN.md):**

- Session/CSRF/rate-limit surface (SEC-SHARE-02, D5):
  `bunx vitest run tests/vitest/project-publication-route.test.ts tests/vitest/publication-client-csrf.test.ts --maxWorkers=1`
- Stale-snapshot 409 (SEC-SHARE-01):
  `bunx vitest run tests/vitest/project-publication-comments.test.tsx tests/vitest/project-publication-decision.test.tsx tests/vitest/security-findings-publication-contracts.test.ts --maxWorkers=1`
- Activity body-leak guard (SEC-SHARE-09):
  `bunx vitest run tests/vitest/project-publication-activity.test.tsx --maxWorkers=1`
- Unsubscribe origin/interstitial (SEC-SHARE-05):
  `bunx vitest run tests/vitest/share-unsubscribe-interstitial.test.ts --maxWorkers=1`
- Snapshot disclosure strip (cost fields):
  `bunx vitest run tests/vitest/project-publication-snapshot.test.ts --maxWorkers=1`
- Whole-surface type gate: `bun run type-check`

**Pass/fail gate (binary):** every command above exits `0` with green; no `createHash("sha256").update(ip)`
remains on share public routes (`rg -n 'createHash\("sha256"\).update\((ip|.*ip)' src/app/api/share` returns
no hits). FAIL otherwise.

---

## 5. Residual accepted risks for beta (owner sign-off)

The following residuals are **proposed accepted for beta**. Each is bound to 75 and a decision in
[71](71_OPEN_DECISIONS_REGISTER.md). This is not a unilateral acceptance — it requires the owner
sign-off line below.

| Residual | Why acceptable for beta | Re-open trigger | Finding / Decision |
|---|---|---|---|
| Bearer-link forwarding (anyone with the URL reads) | Inherent to the bearer model; password option exists for sensitive proposals | A recipient demands per-viewer auth | (design) |
| `location` / `clientName` / `totalCost` public on unlock | Intended proposal context for most users | Privacy/legal objection or per-field redaction requested | SEC-SHARE-07 → **D2/D3**, DPIA [13](13_DATA_PRIVACY_DISCLOSURE_DECISION.md) |
| Unsubscribe absent-Origin POST (email-suppression only) | No data exposure or proposal mutation; low blast radius | Reports of malicious mass-unsubscribe | **SEC-SHARE-05** (P3) |
| Owner digest silent-skip from public routes | Functional notification gap, not a breach | Owners miss recipient activity in practice | **SEC-SHARE-06** (P3) → **D9** |
| Session DELETE without same-origin guard | Forced-logout nuisance only | CSRF-logout abuse observed | **D5** |
| Process-local password lockout + in-memory throttle | Single-node beta only | Multi-node deploy | SHF-03 → **D4** |
| Manager-read RLS symmetry on events not yet applied | Service-role route is the read path today | Direct Data-API exposure of event rows | **D10** |
| Rotate is O(recipient count) | No security impact; scale only | Large-recipient links observed slow | **PERF-12** |

**Owner sign-off (required before beta launch):**

```
Residual risks in §5 reviewed and ACCEPTED for beta:  [ ] yes  [ ] no
Decisions resolved before launch (D2/D3 location+identity disclosure, D5 session DELETE): _______
Signed: ______________________  Date: __________
```

**Binary launch gate:** beta launch is **blocked** until the sign-off block is filled and D2/D3/D5
carry a recorded resolution in [71](71_OPEN_DECISIONS_REGISTER.md). No open **P1 source-fix** finding
may remain (per [75](75_FINDING_ID_REGISTRY.md) §8 — none currently open; SEC-SHARE-01/09 Fixed).
