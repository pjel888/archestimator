# 08 — Security, Privacy, and Threat Model

## 8.1 Applicability

This plan touches the request/error/metrics emit surface, so the security review
focuses on **information disclosure via logs/headers/metrics** and on **not
introducing new trust boundaries or auth paths**. It does not add auth,
mutations, public links, uploads, or integrations — those surfaces are unchanged.

## 8.2 Threat model

| ID | Threat | Asset | Actor | Entry point | Trust boundary | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|---|---|---|
| T-01 | Request-id header injection | response headers | any client | inbound `x-request-id` | edge → response | Med | Low (id is non-secret) | Validate `^[A-Za-z0-9._:-]{1,128}$`; reject otherwise; never reflect unsanitized |
| T-02 | PII leak via `Server-Timing` | logs/headers | internal | timing emit | app → response | Low | Med | Label allowlist (`total`,`db`,`r2`,`upstream`); integer ms; no ids/SQL/paths; gate by env; suppress on cacheable/auth |
| T-03 | PII leak via Analytics Engine dimensions | metrics store | internal | `writeDataPoint` | app → AE | Med | High (AE retained, queryable) | Dimension allowlist (enum buckets only); reject email/token/path-shaped values; test bypass attempts |
| T-04 | PII leak via `console.*` outside logger | Workers Logs | internal | ad-hoc logs | app → console | Med | Med | Audit every `console.*` in `src/`; route user-data-bearing ones through `logAppError`+`redactForLog` |
| T-05 | Secret leak in proof artifacts | R2/D1/internal routes | operator | proof route emit | app → proof JSON | Low | High | Wrap proof samples in `redactForLog`; never emit raw headers/cookies/URLs |
| T-06 | Log correlation enabling user tracking | logs | any client | inbound id | edge → log | Med | Low (id is per-request, not PII) | Do not log inbound id alongside user identity at info; rate-limit acceptance of inbound ids (no per-user storage) |
| T-07 | Error stack leaking internals | response body / logs | any client | thrown error | app → response | Med | Med | `app-error.ts` already returns safe client JSON; `toClientJSON` omits stack; ensure 500 path uses it |
| T-08 | Retention budget evasion causing quota exhaustion | D1 quota | internal | cron | cron → D1 | Low | Med | `maxRowsDeletedPerTick` caps writes; monitor rows-written/day via GraphQL |
| T-09 | DO fan-out amplification (DoS via room) | DO CPU | collab member | websocket | DO → sockets | Med | Med | `MAX_BROADCAST_TARGETS` cap; message size cap (existing 4096); close 1011 on error |
| T-10 | Metric write blocking the request | availability | internal | AE write fail | app → AE | Low | Low | `metrics.ts` swallows AE errors; never throws to the request path |

## 8.3 Trust boundaries (unchanged set, new emit points)

1. **Client → Cloudflare Edge** (`cf-ray`, TLS, WAF). Unchanged.
2. **Edge → Worker** (new: `x-request-id` accepted/validated/echoed). Validation gate.
3. **Worker → OpenNext** (id in ALS + header). Same isolate; no new boundary.
4. **App → D1/R2/DO/Queue** (unchanged authz). Observability adds no new authz.
5. **App → Workers Logs** (console). Redaction gate (`redact.ts`) must cover all emit paths.
6. **App → Analytics Engine** (new). Dimension allowlist gate.
7. **App → Client** (error envelope, `Server-Timing`). Safe-JSON + label allowlist gates.

## 8.4 Existing controls (verified, reused)

- `redact.ts` — `NEVER_LOG_KEYS` (authorization, cookie, password, token, jwt,
  api_key, service_role_key), `HASHED_ONLY_KEYS` (email hashes to sha256:16hex),
  regex redaction for emails, Bearer, JWT, `/share/`+`/invite/` paths, query
  secrets, hex ≥32, prompt-injection phrases. Cycle protection. **Reused as-is.**
- `app-error.ts` — safe client JSON via `toClientJSON` (kind/code/message only,
  no stack). **Reused.**
- `client-identity.ts` — IP from `CF-Connecting-IP` only, /24 /48 prefix
  (not raw IP). **Reused; do not regress to raw IP in metrics dimensions.**
- `route-error.ts` — `Cache-Control: no-store, private` on error responses.
  **Reused.**
- Worker fast-path `routeMalformedShareTokenRequest` — static 404 for malformed
  share tokens. **Unchanged.**

## 8.5 New controls

- **`request-id.ts` validation** — inbound id must match `^[A-Za-z0-9._:-]{1,128}$`;
  reject (and generate fresh) otherwise. Unit test must include path-traversal-
  like, CRLF, oversized, and Unicode payloads.
- **`server-timing-header.ts` label allowlist** — labels match
  `^(total|db|r2|upstream|do|queue|cron)$`; values are integers; test CRLF
  injection (`total;dur=1\r\nEvil: 1`) is rejected.
- **`metrics.ts` dimension allowlist** — dimension values match a fixed enum per
  index (e.g. `route_class ∈ {auth,upload,share,ai,export,internal,other}`,
  `outcome ∈ {ok,client_error,server_error,exceeded_cpu,exceeded_memory}`,
  `code ∈ {<AppErrorCode set>}`). Reject anything else. Test that
  `philip@example.com`, `eyJ...`, `/share/abc`, and a 256-char string are all
  rejected.
- **Console audit** — `19_…` records a `rg` of every `console.*` in `src/` and
  classifies each as logger-routed or user-data-free.

## 8.6 Credential-material taxonomy

This plan introduces **no new credentials**. The only identifier added is the
per-request `requestId`, classified:

| Material | Class | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| `requestId` / `trace_id` | public marker (non-secret) | `request-id.ts` (UUIDv4) | ALS (transient) + log line + response header | app, logs, client (on error only) | yes (header + error body) | no | none needed (per-request, ephemeral) | unit test: two requests get distinct ids; inbound id reused only if valid |

It is deliberately **not** a bearer token, **not** stored, **not** used for
authz, and **not** a session handle. Treating it as public is correct.

The existing credential materials (Better-Auth session cookie, share tokens,
invite tokens, password hashes, OAuth state) are **unchanged** by this plan and
remain covered by `redact.ts`. The plan reinforces redaction coverage but does
not alter their lifecycle.

## 8.7 Rate limiting / abuse

- Inbound `x-request-id` acceptance is not rate-limited per se (it is a passive
  header), but the **response always echoes a valid id**, so an attacker cannot
  use it to track other users' requests (each request gets its own id).
- Metrics emission is capped at 250 points/invocation (AE hard limit) and the
  implementation will sample to ≤1 KPI/request to stay far below.
- DO fan-out cap (REL-03) limits broadcast amplification.
- No new CSRF/XSS/SSRF surface (no new mutation, no new outbound fetch, no new
  HTML rendering).

## 8.8 Incident-response implications

- An incident can now be traced by `x-request-id` in the response → grep Workers
  Logs by that id → see the full request lifecycle + any error.
- Redaction guarantees no PII in those logs (modulo the audit of `console.*`
  outside the logger, which is a P0 closeout item).
- The runbook (`13_…`) documents the lookup flow.

## 8.9 Privacy / data minimization

- Logs: 3-day retention on free; redacted at emit.
- Analytics Engine: retains per AE policy; dimensions are enum-only, no PII.
- `requestId` is non-PII (random, per-request, not correlated to user identity
  in dimensions).
- Retention rules unchanged; the budget guard reduces worst-case D1 retention
  of transient event rows.

## 8.10 Security testing required for implementation

- Denial test: inbound `x-request-id: <script>` / CRLF / 200-char → rejected,
  fresh id generated, no header injection.
- Denial test: `metrics.ts` rejects PII-shaped dimensions.
- Denial test: `Server-Timing` cannot be injected with CRLF.
- Unit test: `redact.ts` still covers a regression corpus (emails, tokens,
  share paths).
- Grep audit artifact: every `console.*` classified.
