# UNIT-003 — Multi-From send-identity registry + validation

## Goal
Introduce a fail-closed registry of verified From identities and resolve/validate
by id.

## Status
`READY` · depends on: (none) · requirements: DATA-002, SEC-001 · risks: RISK-002

## Owned paths
- `src/lib/email/support-send-identities.ts` (new, write)
- `src/lib/email/support-email-config.ts` (write — add identity env parsing)

## Implementation boundary
1. `support-send-identities.ts` (`server-only`): type
   `SupportSendIdentity = { id; address; name; mailbox; isDefault }`.
2. Build registry: default from `readSupportEmailConfig()` (support@) +
   parse `ARCHESTIMATOR_SUPPORT_SEND_IDENTITIES` (comma list of
   `address|Display Name`). Lowercase addresses; dedupe; validate with
   `normalizeEmailAddress` (rejects header injection).
3. `listSupportSendIdentities()` and `resolveSupportSendIdentity(id?)`:
   omitted → default; unknown id → **throw** (fail-closed).
4. **Include `philip@archestimator.com` as a registered identity** (same verified
   domain — see 00-PLAN §10 readiness evidence: `archestimator.com` is onboarded
   for Cloudflare Email Sending, which onboards a domain not an address). Default
   remains `support@`. DMARC ramp is an ops posture note, not a send gate; runtime
   send stays gated by the address-agnostic delivery flags. Every registered
   address must be same-domain and pass `normalizeEmailAddress`.

## Verification
- `bun run type-check`, `bun run lint`.
- SEC-001 TEST_PROPOSAL recorded (not run): allowlist rejects unknown/unverified
  + injection.

## Scope
In: registry + config parsing. Out: actions/UI (UNIT-004).

## Done criteria
- [ ] Registry resolves default (`support@`) + `philip@` + any configured
      identities; unknown id throws.
- [ ] Addresses validated for header safety and same verified domain.
- [ ] type-check + lint clean.

## Recovery
New file + additive config; revert to roll back.
