# 004 — Email Boundary Chokepoint: Strip CRLF + Escape HTML

> **Historical provenance only.** `UNIT-004` is `SUPERSEDED` by `DEC-AUTO-007`.
> This predecessor did not implement the unit; current authority is
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

> Closes `SEC-EXT-001`, `SEC-EXT-002`, `SEC-EXT-003`.

## unit_id
`UNIT-004` · **status:** `SUPERSEDED` · **priority:** P1 (before external invites) · **effort:** S · **implementation_risk:** LOW · **local_implementation_status:** `NOT_STARTED` · **external_lifecycle_status:** `NOT_REQUIRED`.

## requirements / findings
- Requirements: `SEC-003`.
- Findings: `SEC-EXT-001` (CRLF in subject), `SEC-EXT-002` (unescaped HTML in collaboration body), `SEC-EXT-003` (no chokepoint validation).

## goal
The `cloudflare-email-client.ts` `sendCloudflareEmail` chokepoint strips `\r`/`\n` and other C0 control chars from `subject`/`from`/`replyTo`, validates `to`/`from`/`replyTo` against a strict email grammar, and HTML-escapes any caller-supplied value interpolated into `html`. Callers no longer need to remember to escape (defense at the chokepoint).

## security_invariants
1. No `\r` or `\n` reaches the `EMAIL.send()` binding in `subject`/`from`/`replyTo`/`to`.
2. `to`/`from`/`replyTo` validated against `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (reject display-name tricks).
3. `html` body content is HTML-escaped at the chokepoint unless the caller explicitly marks it as pre-escaped.

## current_source_evidence
- `src/lib/email/cloudflare-email-client.ts:130-158` — only `.trim()` on `from`/`replyTo`; no control-char stripping; no HTML sanitization.
- `src/lib/collaboration/actions.ts:768-772` — interpolates `projectName`, `role`, `scopeLabel`, `inviteUrl` into HTML body unescaped.
- `src/lib/admin/support-actions.ts:78,163` — `Re: ${conversation.subject}` (subject is user-supplied via support form).
- `src/lib/publication/actions.ts:532,1396,1895` — uses `escapePublicationEmailHtml` correctly (the safe pattern to generalize).

## affected_paths_and_resources
- `src/lib/email/cloudflare-email-client.ts` (chokepoint).
- `src/lib/email/transactional-email-client.ts` (passes through; ensure no bypass).
- `src/lib/email/html-escape.ts` (new file — extract/generalize `escapePublicationEmailHtml`).
- `src/lib/collaboration/actions.ts` (callers — may now rely on chokepoint escaping, but explicit escape at the call site is also acceptable).
- `src/lib/admin/support-actions.ts`.

## owned_paths
- `src/lib/email/`

## dependencies
None.

## preconditions
None.

## non_goals
- Replacing Cloudflare `EMAIL` binding with another provider.
- Adding `Reply-To`/display-name rich semantics — strict-grammar validation is enough.
- DKIM/SPF/DMARC configuration — hosted DNS, not in scope.

## implementation_sequence
1. Extract `escapePublicationEmailHtml` from `src/lib/publication/...` into `src/lib/email/html-escape.ts` as `escapeEmailHtml(value: string): string`.
2. Add `stripEmailHeaderControlChars(value: string): string` that removes `\r`, `\n`, and other C0 controls except tab (which is unusual in email headers anyway).
3. Add `isValidEmailAddress(value: string): boolean` (extract from `publication/actions.ts:1240-1243`).
4. In `cloudflare-email-client.ts` `sendCloudflareEmail`:
   - Validate `to`/`from`/`replyTo` against `isValidEmailAddress`; throw on invalid.
   - `subject = stripEmailHeaderControlChars(input.subject)`.
   - `html = escapeEmailHtml(input.html)` unless `input.htmlPreEscaped === true` (opt-in for callers that compose their own escaped HTML).
5. Update `collaboration/actions.ts:768-772` and `admin/support-actions.ts:78,163` to either pass pre-escaped HTML or rely on the chokepoint.
6. Run `bun run type-check`.

## data_or_schema_changes
None.

## authz_and_tenant_implications
None.

## failure_and_exception_behavior
Invalid email address → throw → caller returns 4xx (no email sent). Fail-closed.

## acceptance_criteria
1. `cloudflare-email-client.ts` validates addresses and strips CRLF (source inspection).
2. `escapeEmailHtml` exists and is applied at the chokepoint.
3. `grep -rn '\r\|\\n' src/lib/email/cloudflare-email-client.ts` confirms no raw control chars in headers values reach the binding.
4. `bun run type-check` passes.

## acceptance_evidence
Source/diff inspection + `type-check` exit 0.

## test_decision
`TEST_PROPOSAL` (cheap decisive existing-test pattern).

## exact_test_proposal_if_any
Risk: a `projectName` containing `\r\nBcc: attacker@example.com` could inject a header. Cheapest decisive test: `bun x vitest run tests/vitest/email/cloudflare-email-client.test.ts` — call `sendCloudflareEmail` with `subject="a\r\nBcc: x@y"` and assert the binding mock receives a single-line subject.

## authorization_boundaries
None.

## observability_or_audit_requirements
None.

## recovery_or_fix_forward
If a legitimate caller relied on raw HTML in `html`, switching to escape-by-default would break formatting — fix-forward: pass `htmlPreEscaped: true` at that call site.

## conflict_and_concurrency_notes
None.

## completion_signal
All four acceptance criteria evidenced. `DONE`.

## historical_next_unit_on_success
The original proposal allowed any other unit. The retired pack now has
`next_unit=null`; use `.ai/03_plans/2026-07-31/Code-Improvement/`.
