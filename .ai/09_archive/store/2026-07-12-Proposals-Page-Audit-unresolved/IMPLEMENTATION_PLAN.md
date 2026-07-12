# Proposals Inbox — Implementation Plan

Status: `IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / ACTIVE`.

This is the execution contract for `/workshop/proposals`. It merges the
2026-07-11 `Proposals-Feature` plan into the newer 2026-07-12 source audit.
The predecessor is archived only after this receipt and its unit mapping exist.

## Ordered slices

0. **Slice 0 — email verification (P2, downgraded from P0 round 11):** live
   checks show the email substrate is already wired (nameservers on Cloudflare,
   Email Sending enabled, all 5 `cf-bounce` DNS records published). Two small
   actions remain: (a) tighten DMARC `p=none`→`p=quarantine` (owner dashboard,
   optional for beta), (b) real-send verification to Gmail/Outlook (`TEST_TASK`).
   **No longer blocking — the feature can ship while these complete.** See
   `20-EMAIL-DNS-FIX-PLAYBOOK.md`.
1. **Slice 1 — row resilience and decision typing:** execute A1+A2 together in
   `recipient-proposals-repository.ts`. Drop and log unmappable rows, preserve
   the result contract, and use the `"unknown"` decision sentinel.
2. **Slice 2 — response delivery status:** execute A3 in
   `src/lib/publication/d1-store.ts`; atomically write `delivery_status='responded'`
   when a recipient response is submitted.
3. **Slice 3 — bounded inbox signal:** execute A4 with `LIMIT 51`, a boolean
   `truncated` result, and a bounded UI notice. Do not add a count query or
   pagination in V1.
4. **Slice 3b — deep-audit P1 data-integrity + privacy (round 2):** execute
   A5 (recipient-removal PII purge, DEC-AUTO-111), A6
   (`project_publication_events` retention TTL), A7 (`openRecipientProposalAction`
   rate limit + error collapse, DEC-AUTO-113), A8 (`shared_link_responses`
   unique-constraint migration). These are the four P1s added by the round-2
   deep audit (`09`, `10`) and must ship before first users. See
   `05` §2 for exact paths/approach per unit.
5. **Slice 3c — deep-audit P2 hardening (round 2):** execute A9 (console log
   redaction one-liner), A10 (client refresh-failure observability), A11
   (`loadRecipientProposals` rate limit), A12 (inbox de-dup by project,
   DEC-AUTO-112). Independent of Slice 3b and each other; batchable.
6. **Slice 4 — collection shell:** execute B1, then B2–B5. Retain the existing
   TanStack Query key, cache lifetime, focus refetch, and action contracts.
7. **Slice 5 — presentation:** execute B6+B7, then B8+B9. Extract shared
   proposal state helpers once; provide card and list modes only.
8. **Slice 6 — bounded follow-ups:** audit the XLSX contractor-name risk,
   expiry behavior, stale selectors, analytics (P2-11/P2-12), and
   reconciliation only after Slices 1–5. Do not duplicate completed publisher or
   shared-page work. Includes the beta-recommended domain items from `08`
   (electronic-consent disclosure, assumptions/exclusions block) if the owner
   authorizes them via AUTH-3.

## V1 scope decisions

- No grouping, owner-side controls, new server actions, new D1 columns,
  immutable snapshots, or PDF work.
- `clientName` is optional and deferred unless a current implementation need
  proves it useful; do not widen the query merely to preserve an old plan item.
- Existing publisher/share work is treated as completed elsewhere; only current
  defects affecting this inbox remain in scope.

## Evidence and stop condition

No automated tests, builds, typechecks, or browser proof are authorized by this
planning task. Each code slice must apply the User Test Authorization Gate and
record any named `TEST_PROPOSAL` before running tests. This plan is complete
when every slice has either implementation evidence or an explicit, current
deferral in `LOOP_LEDGER.md` and the final reconciliation is recorded.
