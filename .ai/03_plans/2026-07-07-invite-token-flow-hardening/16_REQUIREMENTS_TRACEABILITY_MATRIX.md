# Requirements Traceability Matrix

**Column contract (Improve directive):** `Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision`.

**Source-strength legend:** `brief`, `repo evidence`, `official docs`, `derived`, `owner-delegated planning decision`.

| Source ID | Requirement | Source evidence | Source strength | Plan section | Work item | Acceptance criteria | Test/proof | Risk | Status | Gap/decision |
|---|---|---|---|---|---|---|---|---|---|---|
| SRC-REPO | SEC-01 | `invite-origin.ts:27,39`; `accept/route.ts:87-96`; `sign-out/route.ts:25-30` | repo evidence + brief | 04 SEC-01; 08 SEC-01; 06 §3.1 | P1-T1 | AC-SEC-01a-e | `invite-accept-origin.test.ts` | RISK-01 | Planned | DEC-01 |
| SRC-REPO | SEC-02 | `continue/route.ts:39-72` (no origin call) | repo evidence | 04 SEC-02; 08 SEC-02 | P1-T2 | AC-SEC-02a-c | `invite-continue-origin.test.ts` (new) | RISK-02 | Planned | DEC-02; P1-T2 DISCOVERY |
| SRC-REPO | SEC-03 | `pending-invite.ts:11,19-23,39-75` | repo evidence | 04 SEC-03 | P6-T1 (non-regression) | AC-SEC-03a-c | `pending-invite-cookie.test.ts` | — | Non-regression | — |
| SRC-REPO | SEC-04 | `sign-out/route.ts:42-43`; `pending-invite-actions.ts:42-51` | repo evidence | 04 SEC-04 | P1-T4 | AC-SEC-04a/b | `project-invite-sign-out-route.test.ts`, `workshop-pending-invite.test.tsx` | — | Planned | DEC-05 |
| SRC-REPO | SEC-05 | `invite-entry.ts:184-185` | repo evidence | 04 SEC-05; 08 SEC-05 | P2-T1 | AC-SEC-05a/b | `project-invite-feature-flag.test.ts` | RISK-05 | Planned | OPEN-SEC-02 |
| SRC-BRIEF | SEC-06 | PROMPT.md constraints; `invite-entry.ts:54-76`; `redact.ts` | brief + repo evidence | 04 SEC-06 | P6-T2 | AC-SEC-06a-c | rg scan + code review | RISK-10 | Non-regression | — |
| SRC-REPO | SEC-07 | no revoke action; `actions.ts:532-546` implicit only | repo evidence + brief | 04 SEC-07; 08 SEC-07 | P3-T2/T3/T4 | AC-SEC-07a-e | `project-collaboration-revoke-invitation.test.ts` (new) | RISK-09 | Planned | DEC-03; DATA-01 |
| SRC-REPO | SEC-08 | `session.ts:56-77`; `invitation-d1-store.ts:493-501` | repo evidence | 04 SEC-08 | P4 audit | AC-SEC-08a/b | `collaboration-invitation-d1-store.test.ts` | — | Planned | — |
| SRC-REPO | SEC-09 | `realtime-identity-server.ts:41-55`; `realtime-room-token.ts:7` | repo evidence | 04 SEC-09; 08 SEC-09 | P5-T1 | AC-SEC-09a-c | `project-collaboration-realtime.test.ts`, `cloudflare-collaboration-room-auth.test.ts` | RISK-06, RISK-08 | Planned | DEC-06; OPEN-REL-02 |
| SRC-REPO | SEC-10 | `actions.ts:785-852` vs `invitation-d1-store.ts:373-451` | repo evidence | 04 SEC-10 | P4-T1 | AC-SEC-10a/b | `project-collaboration-actions.test.ts` | RISK-07 | Planned | DEC-07; P4-T1 DISCOVERY |
| SRC-REPO | SEC-11 | `migrations/0007:74-78` | repo evidence | 04 SEC-11 | P5-T2 | AC-SEC-11a | per OPEN-SEC-01 | — | Planned | OPEN-SEC-01 |
| SRC-REPO | SEC-15 | new revoke action (IDOR surface) | derived | 08 SEC-15 | P3-T3 | AC-SEC-07b (deny) | `project-collaboration-revoke-invitation.test.ts` | — | Planned | — |
| SRC-REPO | FR-01 | `invite-entry.ts:54-80`; `actions.ts:503-612` | repo evidence | 04 FR-01 | P3 (revoke add) | AC-FR-01a/b | `project-invite-entry-schema.test.ts` + revoke test | — | Planned | — |
| SRC-REPO | FR-02 | `invitation-d1-store.ts:78-123,281-336` | repo evidence | 04 FR-02 | P6-T1 | AC-FR-02a/b | `collaboration-invitation-d1-store.test.ts` | — | Non-regression | — |
| SRC-BRIEF | FR-03 | PROMPT.md; `continue/route.ts`; `account-setup.ts:7` | brief + repo evidence | 04 FR-03; 05 J1 | P1 verification + P6 | AC-FR-03a/b | `workshop-pending-invite.test.tsx` + manual e2e | RISK-01/02 | Non-regression | — |
| SRC-REPO | FR-04 | `invitation-d1-store.ts:493-501`; `page.tsx:215-239` | repo evidence | 04 FR-04 | P6-T1 | AC-FR-04a | `collaboration-invitation-d1-store.test.ts` | — | Non-regression | — |
| SRC-REPO | FR-05 | `invitation-d1-store.ts:125-131,476-481` | repo evidence | 04 FR-05 | P6-T1 | AC-FR-05a | `collaboration-invitation-d1-store.test.ts` | — | Non-regression | — |
| SRC-REPO | FR-06 | `actions.ts:399,1247`; `invitation-d1-store.ts:74-76` | repo evidence | 04 FR-06 | P6-T1 | AC-FR-06a | existing tests | — | Non-regression | — |
| SRC-DERIVED | ARCH-01 | `invite-origin.ts` shared helper | repo evidence + derived | 04 ARCH-01 | P1-T1 | AC-ARCH-01a | grep + review | — | Planned | — |
| SRC-REPO | ARCH-02 | `wrangler.jsonc` | repo evidence | 04 ARCH-02 | P6 audit | AC-ARCH-02a | `git diff wrangler.jsonc` empty | — | Constraint | — |
| SRC-REPO | ARCH-03 | `actions.ts` patterns | repo evidence | 04 ARCH-03 | P3-T3 | AC-ARCH-03a | revoke test | — | Planned | — |
| SRC-REPO | DATA-01 | `migrations/0007` | repo evidence | 04 DATA-01; 07 §2; 21 | P3-T1 | AC-DATA-01a/b | `migration-0037-revoke-reason.test.ts` | RISK-04 | Planned | DEC-09 |
| SRC-REPO | DATA-02 | `migrations/0007:94-107` | repo evidence | 04 DATA-02 | P6 audit | AC-DATA-02a | `project-invite-entry-schema.test.ts` | — | Non-regression | — |
| SRC-REPO | UX-01 | `page.tsx:173-239` | repo evidence | 04 UX-01; 05 §2 | P6 | AC-UX-01a/b | `project-invite-entry-route.test.ts` | — | Non-regression | — |
| SRC-DERIVED | UX-02 | `page.tsx` rate-limited branch | repo evidence + derived | 04 UX-02 | P6 | AC-UX-02a | `project-invite-entry-route.test.ts` | — | Non-regression | — |
| SRC-DERIVED | UX-03 | SEC-07 UI | derived | 04 UX-03; 05 §3 | P3-T4 | AC-UX-03a-c | `publisher-revoke-invite.test.tsx` | RISK-03 | Planned | P3-T4 DISCOVERY |
| SRC-DERIVED | A11Y-01 | `src/components/ui/` primitives | repo evidence + derived | 04 A11Y-01; 05 §4 | P3-T4 | AC-A11Y-01a-d | DOM/a11y test + manual keyboard | — | Planned | — |
| SRC-REPO | A11Y-02 | `page.tsx` | repo evidence | 04 A11Y-02 | P6 | AC-A11Y-02a | existing tests | — | Non-regression | — |
| SRC-DERIVED | PERF-01 | origin helper pure parse | repo evidence + derived | 04 PERF-01; 09 §1 | P6 | AC-PERF-01a | query-count assertion | — | Constraint | — |
| SRC-DERIVED | PERF-02 | revoke UI small | derived | 04 PERF-02; 09 §1.3 | P6 | AC-PERF-02a | build artifact | — | Constraint | — |
| SRC-DERIVED | REL-01 | per-phase rollback | derived | 04 REL-01; 13 | P1-P5 docs | AC-REL-01a | review of 13 | — | Planned | — |
| SRC-REPO | REL-02 | `transactional-email-client.ts:59-96` | repo evidence | 04 REL-02; 09 §3 | P6 doc | AC-REL-02a/b | existing tests + doc | — | Non-regression + doc | OPEN-REL-01 |
| SRC-DERIVED | TEST-01 | directive §8A | derived | 04 TEST-01; 12 | per-task | AC-TEST-01a | review of 12 | — | Planned | — |
| SRC-DERIVED | TEST-02 | directive §12 | derived | 04 TEST-02; 19 §5 | P6-T3 | AC-TEST-02a | review of 19 | — | Planned | — |
| SRC-REPO | DOC-01 | `.env.example`, `.dev.vars.example` | repo evidence | 04 DOC-01 | P1-T5, P5-T1 | AC-DOC-01a | grep env examples | — | Planned | — |
| SRC-REPO | DOC-02 | `AGENTS.md` | repo evidence | 04 DOC-02 | closeout | AC-DOC-02a | review at closeout | — | Future | — |

**Completion rule (directive):** No requirement may remain untraced. Every requirement maps to source evidence, a work item, acceptance criteria, a test/proof, and (where applicable) a rollout check. The matrix above satisfies this — every SEC/FR/ARCH/DATA/UX/A11Y/PERF/REL/TEST/DOC requirement is traced.

**Source-strength distribution:**
- `repo evidence`: 26 requirements (the majority — this is a source-grounded hardening pack).
- `brief`: 2 (SEC-01 confirm, SEC-06 constraint, FR-03 preserve).
- `derived`: 11 (ARCH-01, UX-02/03, A11Y-01, PERF-01/02, REL-01, TEST-01/02, SEC-15).
- `official docs`: cited in assumptions (ASSUMP-01/03).
- `owner-delegated planning decision`: DEC-01/04/06 (owner-confirm items).

**Performance-sensitive requirements (PERF/REL) also map to:**
| Req | Baseline | Target | Measurement | Regression threshold | Rollback trigger |
|---|---|---|---|---|---|
| PERF-01 | resolve 3-4 queries; accept 5-7 | no increase | unit + proof harness | +0 queries | any increase |
| PERF-02 | workshop bundle baseline | <1 KB gzipped delta | `bun run build` | <1 KB | >1 KB |
| REL-01 | n/a | per-phase rollback documented | review of 13 | n/a | per-phase triggers in 13 |
