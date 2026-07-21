# UNIT-003 — Verified support identity registry and readiness contract

## Goal and status

`READY` · dependencies: none · requirements: DATA-002, SEC-001 · risks: RISK-002

Define a small fail-closed registry for `support@` and `philip@` while keeping
From address separate from the canonical routed Reply-To mailbox.

## Owned paths

- new `src/lib/email/support-send-identities.ts`
- `src/lib/email/support-email-config.ts`
- `.env.example`, `.dev.vars.example`
- `docs/support-email-operator-runbook.md`
- existing email readiness scripts when their declared config surface changes

## Implementation boundary

1. Parse stable id, From address/name, reply mailbox, and default flag.
2. Include the two accepted same-domain identities; reject duplicate ids/
   addresses, malformed/header-injection input, cross-domain From, invalid reply
   mailbox, multiple defaults, empty registry, and excessive entries.
3. Omitted id resolves the default; unknown id throws. Expose a serializable
   client-safe list with no secrets.
4. Keep the reply mailbox canonical unless a future separately verified inbound
   route explicitly changes the product contract.
5. Document provider readiness honestly: local registry validation is not DNS,
   provider acceptance, delivery, or inbox-placement proof.

## Acceptance evidence

- Source proves fail-closed resolution and header-safe normalization.
- Examples/readiness docs agree on names without committing values or secrets.
- TEST_PROPOSAL only: `bun x vitest run tests/vitest/support-send-identities.test.ts`.

## Recovery and completion

New registry plus additive config/docs. Complete when UNIT-004 can resolve a
single authoritative identity object and no send logic changed yet.

