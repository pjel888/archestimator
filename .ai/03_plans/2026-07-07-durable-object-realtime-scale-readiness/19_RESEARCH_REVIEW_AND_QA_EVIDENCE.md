# 19 — Research, Review, and QA Evidence

## Research questions and sources

| Question | Sources | Decision it shaped |
|---|---|---|
| What are the current DO + hibernatable-WS limits? | developers.cloudflare.com/durable-objects/* (state, best-practices/websockets, platform/limits, platform/pricing), changelogs (2025-04-07 free-tier DO, 2025-10-31 WS msg 32MiB, 2026-04-07 auto-reply-to-close) | DEC-DO-04/05/06; ASSUMP-04; PERF-01 budgets |
| How does hibernation affect presence? | DO best-practices/websockets (in-memory wiped on hibernate) | DEC-DO-02 (rehydrate from attachments) |
| Does the platform drain sockets on deploy? | DO best-practices/websockets (deploys disconnect all) | FR-06 reconnect; REL-01 |
| Is there a server-side realtime rate-limit today? | `.ai/10_state/decisions.md` (T1.3 deferred), Launch-Readiness REALTIME-01 | DEC-DO-08; OPEN-01 |
| Is Supabase Realtime still active? | `realtime-auth-bridge.tsx` (stub), `realtime-telemetry.ts` | ASSUMP-01 |

Citations are recorded inline with each finding above (full URL list in the research lane
output, retained in the coordination ledger). Source dates: where visible, 2025-04 to
2026-07. Version assumptions: `wrangler ^4.105.0`, `vitest ^4.1.9`, compat date 2026-06-29.

**What was searched for but not found authoritatively** (recorded as gaps, not invented):
hard concurrent-socket cap below 32,768; minimum alarm reschedule interval; free-tier
observability retention; per-DO req/s hard ceiling; the "50ms boosted" free CPU figure.

## Skills/workflows used or unavailable

See `00_AGENT_COORDINATION.md` table. All used skills materially improved evidence. None
unavailable. `gitnexus` deliberately not used (narrow, well-understood call surface —
proportional graph policy in `AGENTS.md`).

## Specialist workstream outputs

Four native subagents delivered independent outputs (tests/proof infra, Cloudflare DO
limits, identity/token subsystem, related plans/specs). Their findings are integrated across
`03_…`, `04_…`, `06_…`, `08_…`, `14_…`. No fabricated outputs.

## Performance evaluator contract (PERF-01)

- **Baseline metric:** p50/p95 end-to-end broadcast delivery (sender send → last authorized
  peer `receive`) at the chosen cap (OPEN-01).
- **Target/budget:** p95 < 500ms (default assumption; finalize per OPEN-01); p50 < 150ms.
- **Measurement command/harness:** `scripts/benchmark-realtime-fanout.ts` (or a vitest under
  `tests/vitest/do/`) under Miniflare via `@cloudflare/vitest-pool-workers`.
- **Dataset/fixture size:** N = chosen cap (e.g. 256) authorized sockets; 1 broadcaster; 1000
  broadcast messages.
- **Number of runs / flake policy:** 5 runs; report median p50/p95; discard the slowest run
  if >2× the median (Miniflare noise).
- **Regression threshold:** >2× baseline p95 fails the gate.
- **Related functional tests:** FR-02 (broadcast branch), FR-04 (cap), FR-05 (rate).
- **Evidence artifact location:** `scripts/output/realtime-fanout-report.json` (gitignored or
  committed per repo convention; redacted).
- **Label:** `inferred` (Miniflare ≠ prod) unless OPEN-02 adds a hosted probe → then
  `provider-backed` for that slice.

## UltraQA adversarial scenario matrix

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Actual result | Status | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|---|
| AQ-01 | non-member | broadcast without authorize | socket, no token | `test:do` | `auth_required`; no fanout | pending impl | — | `tests/vitest/do/...` | none |
| AQ-02 | member, long session | token expiry mid-session (>300s) | fake timers | `test:dom` | refresh; no `auth_failed` | pending | — | hook test | none |
| AQ-03 | member, wrong room | wrong-topic token | forged token | `test:do` | `auth_failed` | pending | — | DO test | none |
| AQ-04 | attacker | tampered envelope | bit-flip sig | `test:dom` | receiver rejects | pending | — | identity test (existing) | none |
| AQ-05 | attacker | upgrade flood beyond cap | N+1 sockets | `test:do` | 1013 before authz | pending | — | cap test | none |
| AQ-06 | member | spam broadcast | >budget msgs | `test:do` | `rate_limited` | pending | — | rate test | none |
| AQ-07 | member | spam presence-track | >budget tracks | `test:do` | `rate_limited` (R-SEC-04) | pending | — | rate test | none |
| AQ-07b | attacker | rotate claimed `payload.userId` to reset budget (P1-4) | spoofed ids | `test:do` | still rate-limited under one verified `sub` | pending | — | rate-key test | none |
| AQ-08 | member | hibernate→wake mid-session | DO idle then msg | `test:do` | presence rehydrates | pending | — | rehydrate test | none |
| AQ-09 | member | deploy disconnect | forced close | `test:dom` | reconnect + re-authz | pending | — | reconnect test | none |
| AQ-10 | member, half-open | silent socket | stop ponging | `test:do` | pruned by alarm | pending | — | prune test | none |
| AQ-11 | member, multi-tab | two sockets same user | two sockets | `test:do` | one presence entry | pending | — | collapse test | none |
| AQ-12 | member of room A | peek room B presence | cross-room | `test:do` | no leak (R-SEC-03) | pending | — | isolation test | none |
| AQ-13 | operator | telemetry PII | synthesized event | `test:dom` | redacted (no path/token) | pending | — | telemetry test | none |
| AQ-14 | dev user | transport disabled | flag off | existing | no sockets | existing green | — | flag test | none |
| AQ-15 | attacker | oversized message | >4096 B | `test:do` | `message_too_large` | pending | — | branch test (FR-02) | none |
| AQ-16 | attacker | binary frame | ArrayBuffer | `test:do` | `binary_not_supported` | pending | — | branch test (FR-02) | none |
| AQ-17 | attacker | invalid JSON | garbage | `test:do` | `invalid_json` | pending | — | branch test (FR-02) | none |
| AQ-18 | attacker | oversized event name | >80 chars | `test:do` | `invalid_event` | pending | — | branch test (FR-02) | none |
| AQ-19 | attacker | non-WS upgrade | HTTP GET | `test:do` | 426 | pending | — | branch test (FR-02) | none |
| AQ-20 | member | reconnect race with refresh | close during refresh | `test:dom` | one authorize, no dup | pending | — | reconnect test | none |

All scenarios have a planned test owner. None requires browser automation except AQ hosted
variants (only if OPEN-02).

## Critique-and-revision cycle summaries

- **Cycle 1 (lead self-review, same-agent):** checked every requirement traceable, every
  task has exact path/symbol, shadow-path matrices complete, no vague tasks, no
  hallucinated requirements. Found: initial draft had no `426`/binary/invalid-event tests
  called out explicitly → added AQ-15–19 and FR-02 specifics. Added R-SEC-04 (rate-cap on
  presence-track). Added the credential-material taxonomy note in `18_…`.
- **Cycle 2 (adversarial review, `verification_mode: independent` — separate native
  subagent):** delivered a structured P0/P1/P2 report. Findings and dispositions:
  - **P0-1 (attachment limit):** reviewer claimed the limit is 16,384 B, not 2,048 B.
    **Lead re-verified against the official docs
    ([DO WebSockets API](https://developers.cloudflare.com/durable-objects/api/websockets/)):
    the reviewer's claim is INCORRECT — the official `serializeAttachment` limit is 2,048
    bytes ("The serialized size of `value` is limited to 2,048 bytes") and
    `setWebSocketAutoResponse` request/response are each ≤2,048 chars.** The reviewer also
    incorrectly asserted the `durable-objects` skill states the figure (it does not).
    **Disposition:** plan's 2,048 figure retained; citations tightened to the official docs
    URL in `07_…`/`18_…`; added a `getWebSocketAutoResponseTimestamp(ws)` note (FR-07) so
    the prune logic reads pong time from the runtime, not the attachment.
  - **P0-2 (missing README + 17):** valid — these were the pending finalize deliverables.
    **Disposition:** both authored below/here; cross-references resolved; "21 documents"
    corrected to 21 (00–19 + README + this file = 21).
  - **P1-1 (hook reconnect asymmetry):** valid. **Disposition:** `04_FR-06` now records the
    per-hook current state (presence has retry+re-authz; cursor/row have none); WP-5.2/5.4
    split to "add reconnect to cursor/row" + "refresh parity for all three."
  - **P1-2 (CLOCK_SKEW_MS misuse):** valid. **Disposition:** introduced
    `ENVELOPE_REFRESH_LEAD_SECONDS`; AC-FR-06c and WP-5.1/5.3 updated.
  - **P1-3 (`presence-untrack` shadow-path + `hasOwn` invariant):** valid. **Disposition:**
    added AC-FR-03c, a Flow C "untrack while authorized" row, and an implementation note in
    WP-2.1 preserving the `hasOwn(attachment,"presence")` distinction.
  - **P1-4 (rate-key must be verified `sub`):** valid. **Disposition:** added AC-FR-05c,
    AQ-07b, and a WP-4.1 note.
  - **P1-5 (cap rejection mechanism):** valid. **Disposition:** AC-FR-04d + WP-3.1 specify
    pre-handshake 503 rejection (no socket, no HMAC).
  - **P2-1 (duplicate AC-FR-04b):** valid. **Disposition:** relabeled to AC-FR-04c and
    traced in `16_…`.
  - **P2-3 (free-tier 10ms CPU uncited):** **Disposition:** labelled as the Workers free-tier
    CPU figure in `09_…`; treated as `inferred` consistent with `19_…`'s gap-recording.
  - Other P2s: noted; no material plan change.
- **Cycle 3 (final verifier, `verification_mode: independent` — separate native subagent):**
  delivered a requirement-by-requirement matrix; all 10 PROMPT.md items `proven` or
  `blocked_with_evidence`/`deferred_with_rationale`; zero contradicted claims; confirmed the
  README/17/scores gaps (resolved by this revision). Recommended scores and verdict recorded
  in `17_FINAL_READINESS_REVIEW.md`.
- **Cycle 4 (Improve-Prompt omission review, separate native subagent):** audited the package
  against the stricter corporate bar. Findings and dispositions (all applied in this Improve
  pass):
  - RTM wrong-schema → rewritten to the 11-column schema with a source-strength column and
    source IDs (`16_…`).
  - Attack Surface Inventory missing → added with the mandated columns; surfaced
    **SEC-OPEN-01** (issuance rate-limit absent on `issueRealtimeIdentity`) as a new
    owner-gated open decision (`08_…`).
  - Proof-contract rows wrong-schema → added P-01..P-14 with the mandated columns (`12_…`).
  - Access-path matrix missing → added with the mandated columns (`07_…`).
  - Credential taxonomy partial → full dimensional table added (raw/hash/encrypted/public/
    derived × lifecycle × boundary) for HMAC token, HMAC secret, Ed25519 signing key,
    envelope, public key, userId (`08_…`).
  - Evidence-class table missing → added (`17_…`).
  - Per-document scorecard missing → added for the behavior-bearing docs (`17_…`).
  - State matrix incomplete + a11y proof matrix absent → expanded to the full Improve set
    with N/A reasons; a11y proof matrix added (`05_…`).
  - Scores inflated (Security 96, Accessibility 92) → corrected to honest values (Security
    88, Accessibility 88) with explicit below-100 reasons on every row; `verification_mode`
    corrected from `independent` → `emulated` (honesty: the lead authored revisions).
  - Known-red ledger incomplete → completed with date/branch/failure-class + narrower proof;
    `type-check` relabeled as a heap workaround, not a known-red test (`12_…`).
  - OPEN-01 "knob present" overstatement → reconciled (knob roll-forward marked pending;
    `wrangler.jsonc` currently has no cap/budget vars) (`16_…`).
  - Provider claims unsourced → official-doc URLs cited verbatim for 32,768 sockets, 2,048-
    byte attachment, auto-reply-to-close compat date (`18_…`).

## Independent final verifier evidence

See `17_FINAL_READINESS_REVIEW.md`.

## Explicit validation gaps

- **Hosted proof (TEST-02/PERF-01 hosted slice):** blocked on OPEN-02; without it, scale and
  hosted-latency claims are `inferred`.
- **Cap/rate numeric values:** blocked on OPEN-01; defaults are documented assumptions.
- **Telemetry sink choice:** blocked on OPEN-03; default is Workers Logs (DEC-DO-07).
- **Free-tier observability retention:** not authoritatively documented; the runbook treats
  it as a manual `wrangler tail`/dashboard query.
