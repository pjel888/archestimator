# Blast Radius and Dependencies

## 1. Affected surfaces (direct + transitive)

| Surface | Direct change? | Files | Impact classification | Phase |
|---|---|---|---|---|
| `/invite/[token]/accept` route | Yes (origin tighten) | `src/app/invite/[token]/accept/route.ts` | **Required change** | P1 |
| `/invite/[token]/continue` route | Yes (origin add) | `src/app/invite/[token]/continue/route.ts` | **Required change** | P1 |
| `/invite/[token]/sign-out` route | Yes (origin tighten + cookie attrs) | `src/app/invite/[token]/sign-out/route.ts` | **Required change** | P1 |
| Origin helper | Yes (rewrite) | `src/lib/collaboration/invite-origin.ts` | **Required change** | P1 |
| `signOutForPendingInvite` action | Yes (cookie attrs) | `src/lib/collaboration/pending-invite-actions.ts` | **Required change** | P1 |
| Invite page | Probable (verify Continue nav mechanism) | `src/app/invite/[token]/page.tsx` | **Verification / minor change** | P1 DISCOVERY |
| Rate-limit helper | Yes (fail-closed) | `src/lib/collaboration/invite-entry.ts` | **Required change** | P2 |
| New revoke action | Yes (new) | `src/lib/collaboration/actions.ts` | **Required change (new file region)** | P3 |
| Revoke RPC | Yes (new) | `src/lib/collaboration/invitation-d1-store.ts` | **Required change (new function)** | P3 |
| Revoke UI | Yes (new) | `src/components/workshop/publisher/*` | **Required change (new component)** | P3 |
| Migration `0037` | Yes (new) | `migrations/0037_*.sql` | **Required change (additive)** | P3 |
| Direct-grant helpers | Yes (promotion-only) | `src/lib/collaboration/actions.ts:785-852` | **Required change** | P4 |
| Realtime identity | Yes (pepper separation) | `src/lib/collaboration/realtime-identity-server.ts`, `realtime-room-token.ts` | **Required change (owner-gated)** | P5 |
| Env examples | Yes (new vars) | `.env.example`, `.dev.vars.example` | **Required change** | P1/P5 |
| Tests | Yes (extend + new) | `tests/vitest/*invite*` + new revoke test | **Required change** | P1-P3 |
| Hosted proof harness | Probable (extend for revoke) | `src/lib/cloudflare/collaboration-invitation-proof-router.ts` | **Probable change** | P3 |
| `/workshop/pending-invite` route | Verification (cookie attrs mirror) | `src/app/workshop/pending-invite/route.ts` | **Verification only** | P1 |
| `src/proxy.ts` / `request-proxy.ts` | No | — | **Explicitly unaffected** | — |
| Better Auth config | No | `src/lib/auth/better-auth-cloudflare.ts` | **Explicitly unaffected** | — |
| `/share/[token]` publication | No | — | **Explicitly unaffected** (sibling plan) | — |
| Closed-beta allowlist | No | — | **Explicitly unaffected** (separate feature) | — |
| `wrangler.jsonc` bindings | No | — | **Explicitly unaffected** (ARCH-02) | — |

## 2. Direct impact on users / roles

| User role | Impact | Phase |
|---|---|---|
| Invited collaborator (signed-out) | J1 flow preserved (FR-03). SEC-01/02 must not block Continue/Accept. | P1 verification |
| Invited collaborator (signed-in, correct) | J2 unchanged. | P1 verification |
| Invited collaborator (wrong account) | J3 unchanged. | P1 verification |
| Manager (inviter) | Gains revoke capability (SEC-07). Direct-grant no longer downgrades (SEC-10). | P3, P4 |
| Anonymous attacker | Forged POSTs now denied (SEC-01/02). Rate limits no longer vanish if flag off (SEC-05). | P1, P2 |
| Existing accepted members | Unaffected (lifecycle state changes don't touch membership rows). | — |

## 3. Direct impact on routes / APIs

- `/invite/[token]/accept` — tighter origin (P0 surface: membership creation).
- `/invite/[token]/continue` — origin check added (P1 surface: cookie mint).
- `/invite/[token]/sign-out` — tighter origin + cookie attrs.
- New `revokeProjectInvitation` / `revokeEstimateSheetInvitation` Server Actions.
- No other route contract changes.

## 4. Direct impact on database

- `collaboration_invitations`: new `revoked_reason` column (P3); new `lifecycle_state='revoked'` writes (P3); no row-shape change for existing flows.
- `collaboration_invitation_tokens`: revoke UPDATEs (existing pattern, now also reachable via explicit revoke).
- `collaboration_audit_events`: new `collaboration_invite_revoked` event type.
- No membership-table schema changes.

## 5. Transitive impact

- **Email delivery:** no change (SEC-07 doesn't send email; revoke is silent to the invitee — they discover via terminal state on next open).
- **Realtime collaboration:** SEC-09 pepper separation requires realtime sessions to re-handshake on key rotation (P5, owner-gated).
- **Onboarding:** no change (FR-03 preserves the invited-collaborator onboarding branch).
- **Observability:** one new audit event type; no new dashboards required.
- **Build/deploy:** no config change; standard `bun run build` + Cloudflare deploy.

## 6. Backward compatibility

- The origin tightening is the one backward-incompatible behavior change. A client/proxy that strips both Origin and Referer on a same-site POST would be blocked in production. Mitigation: env toggle `ARCHESTIMATOR_INVITE_ORIGIN_STRICT` (default true) + 24h 403-rate monitoring.
- All other changes are additive or non-regression.

## 7. Compatibility with other active development

The git status shows concurrent work on component-library, app-error, the 07-06 Transition pack, and other 07-07 packs. This hardening touches **disjoint files** from those workstreams:
- No overlap with `src/components/workshop/component-library/` (component-library work).
- No overlap with `src/lib/observability/app-error.ts` (app-error work).
- No overlap with `EstimateSheetContent.tsx` (estimate-sheet work).
- The revoke UI touches `src/components/workshop/publisher/*` — coordinate if a concurrent publisher-panel change exists (DISCOVERY in P3).

## 8. Documentation impact

- `.env.example` / `.dev.vars.example`: add `ARCHESTIMATOR_INVITE_ORIGIN_STRICT`, `REALTIME_IDENTITY_SIGNING_KEY` (P1/P5).
- `.ai/10_state/decisions.md` + `current-state.md`: record DEC-01..DEC-10 at closeout (DOC-02).
- This plan pack itself is the primary planning doc.

## 9. blast-radius summary

**High-blast-radius surface:** the invite accept path (membership creation) + the auth round-trip bridge (onboarding continuity). The hardening is designed to **tighten** these without changing their happy-path behavior. The riskiest phase is P1 (origin tightening); it carries an env-toggle kill switch and a 24h monitoring gate. All other phases are additive or low-risk.
