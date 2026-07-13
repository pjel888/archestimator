# 15 — Decisions, Assumptions, and Alternatives

## Key decisions

### DEC-IA-01 — Hybrid recipient matching (email for listing, session for acting)
- **Problem:** How to reconcile the inbox's email-keyed listing with the share page's session-bound acting, without re-architecting either.
- **Constraints:** Listing must show *all* of a recipient's proposals (a per-token session cannot). Acting must stay session-bound (the P5 cookie is the recipient credential). Low churn for V1.
- **Options:**
  - (a) Keep email-matching everywhere — simplest, but the acting path on the share page is already session-bound, so this is the status quo.
  - (b) Move listing to session-bound `recipientId` — breaks "list all my proposals."
  - (c) **Hybrid: email for listing, session for acting** — matches reality, lowest churn.
- **Recommendation:** (c). Accepted as the V1 posture (OPEN-IA-01).
- **Reason:** (b) breaks the core listing use case; (a) is the status quo and (c) names it explicitly.
- **Security implications:** Email-matching is backed by `idx_shared_link_recipients_lower_email`; the acting path's session cookie is HMAC-signed. Neither is weakened.
- **Performance implications:** None (no query change).
- **Operational implications:** None.
- **Consequences:** V1 ships with the current matching model, documented. A future hardening (move listing to a verified-email claim) is not precluded.
- **Conditions that would change the decision:** If email-spoofing becomes a concern (e.g. a recipient changes their Better Auth email to another's), revisit — but Better Auth email verification (magic link) is the control.

### DEC-IA-02 — Differentiate expired/revoked copy, keep unknown generic (anti-enumeration)
- **Problem:** Recipients cannot tell why a link is dead; collapsing all into generic "unavailable" harms recovery.
- **Constraints:** Must not enable token enumeration (T-01).
- **Options:**
  - (a) Single generic "unavailable" (status quo) — poor recovery.
  - (b) **Differentiate expired/revoked; keep unknown generic** — recovery + anti-enumeration.
  - (c) Full differentiation (including unknown) — enumeration risk.
- **Recommendation:** (b). Accepted as V1 (OPEN-IA-02).
- **Reason:** Only a holder of a *valid* token can reach an expired/revoked row (the row must resolve), so differentiating after resolution does not confirm a token's existence to an attacker.
- **Security implications:** Anti-enumeration preserved (SEC-05).
- **Consequences:** Expired/revoked visitors get better recovery; attackers learn nothing new.
- **Conditions that would change the decision:** If the resolver ever leaks row existence before resolution, revert to generic.

### DEC-IA-03 — Decisions immutable for V1; surface finality clearly
- **Problem:** The schema enforces one decision per recipient per publication; the UI does not clearly communicate this, and the copy-contract test asserts the dialog is *not* final.
- **Constraints:** Schema change (revision) is high-blast-radius and out of V1 scope.
- **Options:**
  - (a) **Keep immutable; surface finality in the badge; keep dialog neutral** — reconciles the conflict.
  - (b) Allow owner-permitted revision — schema change, out of scope.
  - (c) Allow free revision within a window — schema change, out of scope.
- **Recommendation:** (a). Accepted as V1 (OPEN-IA-03).
- **Reason:** The immutability is a deliberate trust property (decision `:793` snapshot binding); revision is a separate, larger work.
- **Security/trust implications:** Immutability preserves the decision→snapshot binding for owner reporting and (future) export trust.
- **Consequences:** The dialog stays neutral (does not threaten finality); the badge communicates "Decision recorded." The copy-contract test is reconciled (TEST-08).
- **Conditions that would change the decision:** Owner wants revision → spawn a V2 plan pack (schema change + history UI).

### DEC-IA-04 — Email-only notifications for V1
- **Problem:** Recipients learn of new proposals only via email; in-app notification dispatch is unbuilt.
- **Constraints:** In-app dispatch depends on client-ready-proposal-workflow Phase 5 / DATA-04 (do the `notification_*` tables exist? is dispatch wired?).
- **Options:**
  - (a) **Email-only (status quo) for this pack** — documents the boundary.
  - (b) In-app bell + email — downstream dependency.
  - (c) In-app only — downstream dependency.
- **Recommendation:** (a). Accepted as V1 (OPEN-IA-04).
- **Reason:** This pack owns the recipient IA, not the notification infra. Wiring the bell here would duplicate/conflict with client-ready Phase 5.
- **Consequences:** Recipients check their email or the inbox directly. The inbox has no badge (V2).
- **Conditions that would change the decision:** When notification dispatch lands, add a badge + recipient-event kind.

### DEC-IA-05 — Share↔inbox bridge via plain link, not a bridge cookie
- **Problem:** How to connect the share page to the inbox without conflating auth surfaces.
- **Options:**
  - (a) **Plain link on the session banner** — simplest, safest.
  - (b) Bridge cookie (à la invite `archestimator_pending_invite`) — conflates P5 and app sessions.
- **Recommendation:** (a).
- **Reason:** A link cannot be confused with an authority grant; a cookie can.

### DEC-IA-06 — Inline terminal render (ARCH-04) over route segments or notFound+param
- See ARCH-04. Chosen for server-side authority + no URL leak + no routing complexity.

## Assumptions

| ID | Assumption | Source-strength | Validation |
|---|---|---|---|
| ASSUMP-01 | `resolveProjectPublicationAccessByToken` can distinguish inactive-from-existing vs unknown (or can be cheaply extended to) | repo evidence + DISCOVERY 1.2 | Task 1.2 confirms before 1.3 |
| ASSUMP-02 | Better Auth sign-out path is stable and reachable from a client link/action | repo evidence | Confirm route during implementation |
| ASSUMP-03 | The recipient inbox query shape is stable (no sibling changes it) | repo evidence | Re-read before edit (RISK-01) |
| ASSUMP-04 | The decision API contract is stable (no sibling changes it) | repo evidence + sibling READMEs | Re-read before edit |
| ASSUMP-05 | Receiver E2E fixture (`tests/fixtures/shared-link.ts`) is not yet available | repo evidence (`e2e/shared-link-receiver.spec.ts` skip note) | Task 6.2/6.3 |
| ASSUMP-06 | Email delivery remains OFF by default during V1 implementation | current-state.md | Out of scope; owned by client-ready |
| ASSUMP-07 | The latest migration at implementation time will be ≥ `0039` | `ls migrations/` at planning time | Re-check before any migration (none in V1) |

## Alternatives considered and rejected (consolidated)

| Alternative | Rejected because |
|---|---|
| Move listing to session-bound `recipientId` | Breaks "list all my proposals" |
| Bridge cookie for share→inbox | Conflates P5 + app auth surfaces |
| Terminal route segments | URL state leak; routing complexity |
| New `/api/recipient-proposals/*` routes for V1 | No need; server action + existing routes suffice |
| In-app notification dispatch in V1 | Downstream dependency (OPEN-IA-04) |
| Allow decision revision in V1 | High-blast-radius schema change; separate pack |
| Full terminal-state differentiation (incl. unknown) | Enumeration risk (T-01) |
| Proactive wrong-account scan | Leaks recipient data (T-02) |
| New design tokens / primitives for V1 | Existing chips/cards/buttons suffice; `DESIGN.md` is alpha |
