# 22 — Attack Surface Inventory

Required by `Improve-Plan-Prompt.md` §7 for Server Actions / data-bearing surfaces. This pack **does not change** these contracts — it audits them so the security model is complete and the owner-UI surfacing work doesn't introduce new exposure. All rows are current repo evidence (`src/lib/publication/actions.ts`, `src/lib/publisher/*`, `src/app/api/share/[token]/*`).

**Owner/sender entry points (manager-gated Server Actions):**

| Entry point (file:line) | Actor | Authn/authz + ownership check | Input validation | Output DTO | Cache/header behavior | Rate/abuse posture | Required tests |
|---|---|---|---|---|---|---|---|
| `createProjectPublication` (`actions.ts:775`) | manager (rank ≥ 30) | `requireAuth` + `assertProjectPublicationManager(projectId)` | `projectId` resolved; empty-snapshot guard (`:809-811`); `selectedEstimateIds`/`expiresAt`/`password`/`locationVisibility` normalized | `{ok, message, clientLinkPath}` | `revalidatePath('/workshop/projects/${projectId}')` + `revalidatePath(clientLinkPath)` (`:739,741`) | none on the action itself (D1 UNIQUE partial index one-published is the concurrency guard) | `project-publication-actions.test.ts` |
| `republishProjectPublication` (`actions.ts:845`) | manager | same | snapshot/version/password/expiry normalized | same | same `revalidatePath` | none | `project-publication-actions.test.ts` |
| `rotateProjectPublicationLink` (`actions.ts:938`) | manager | same | `projectId`/`password`/`clearPassword` | `{ok, message, clientLinkPath}` | same | none on action; rotates token in place (invalidates recipient hashes) | `project-publication-rotate-resend.test.ts` |
| `revokeProjectPublication` (`actions.ts:1012`) | manager | same | `projectId` | `{ok, message}` | same | none; idempotent via status check | `project-publication-actions.test.ts` |
| `refreshProjectPublicationSummary` (`actions.ts:1045`) | authenticated | `requireAuth` | `projectId` | summary DTO | none | none | (existing) |
| `readSharedLinkEmailDeliveryReadiness` (`actions.ts:473`) | authenticated | `requireCurrentUserContext` | none | `{configured, hasReplyTo}` | none | none | (existing) |
| `listSharedLinkRecipients` (`actions.ts:1329`) | manager | `requireAuth` + `getPublicationProjectId` + `assertProjectPublicationManager` | `publicationId` | recipient list (no raw tokens) | none | none | `recipient-email-composer.test.tsx` |
| `addSharedLinkRecipients` (`actions.ts:1352`) | manager | `assertProjectPublicationManager` | email regex + normalize + self-invite block (`isSelfRecipientEmail`) + dedup + 50-cap (`SHARED_LINK_RECIPIENT_ACTION_LIMIT`) + batch-abort if link unresolvable (`:1436-1449`) | per-recipient `{status: sent\|pending\|duplicate\|failed}` | `revalidatePath` | bounded concurrency 4; 50-recipient cap; self-invite block | `recipient-email-composer.test.tsx` + action unit |
| `resendSharedLinkRecipientEmail` (`actions.ts:1554`) | manager | `assertProjectPublicationManager` + `checkSharedLinkRecipientResendRateLimit` + unsubscribe check | `publicationId`/`recipientId`/`baseClientLink`; send-before-persist (`:1607-1610`) | `{ok, message}` | none | **1 per 5min** per user+pub+recipient (`shared_link_recipient_resend`) | `project-publication-rotate-resend.test.ts` |
| `removeSharedLinkRecipient` (`actions.ts:1653`) | manager | `assertProjectPublicationManager` | `publicationId`/`recipientId?`/`email?` | `{ok}` | none | none; cascade delete | (existing) |
| `loadSharedLinkActivity` (`actions.ts:1816`) | manager | `requireCurrentUserContext` + re-resolve from `token_hash` + `assertProjectPublicationManager` | `publicationToken`/opts | sanitized activity (peppered IP/UA hashes) | none | none | `publisher-activity-feed.test.tsx` |
| `maybeTriggerSharedLinkActivityDigest` (`actions.ts:1968`) | internal (public routes call it) | **no workspace auth** (react-doctor exception `:1967`); owner digest path | `publicationId`/`publicationToken`/`kind` | `{ok}` | none | **15min digest rate limit** (`reservePublicationDigestSlot`) | (existing) — **out of scope to change** |
| `openRecipientProposalAction` (`actions.ts:304`) | authenticated recipient | `requireCurrentUserContext` + D1 RPC `authorize_recipient_publication_for_current_user` (email match) | `formData` recipient token | decrypt → set session cookie → `redirect('/share/<token>')` | sets `shared_link_session_<suffix>` cookie | none (recipient bridge) | (existing) — owner-visibility only here |
| `readPublisherPublicationDrawerData` (`drawer-actions.ts:39`) | owner/editor (viewer redacted) | `requireAuth` + `canReadPublisherRosterProject`; viewer → `redactPublisherClientLinkForReadOnly` (`:27-37`) | `projectId` | drawer DTO (**no raw token**; `clientLinkPath` redacted for viewers) | none | none | `publisher-drawer-actions.test.ts` |

**Public recipient entry points (audit-only; out of scope to change — owned by share/activity/recipient packs):**

| Entry point | Actor | Authn | Rate limit |
|---|---|---|---|
| `GET /api/share/[token]` (`route.ts:19`) | anonymous | token hash | `project_publication_snapshot` 60/60s |
| `POST /api/share/[token]/session` (`session/route.ts:146`) | anonymous recipient | recipient token + CSRF (`assertSameOriginPublicPost`) | `shared_link_session_start` 10/60s, 50/1h |
| `POST /api/share/[token]/password` (`password/route.ts:46`) | anonymous | password + CSRF | `project_publication_password` 5 failures/1h lockout |
| `POST /api/share/[token]/comment` (`comment/route.ts:213`) | recipient session | CSRF + session + circuit breaker | `shared_link_comment` 5/60s, 20/1h |
| `POST /api/share/[token]/decision` (`decision/route.ts`) | recipient session | CSRF + session | `shared_link_decision` 5/60s |
| `POST /api/share/[token]/unsubscribe` (`unsubscribe/route.ts:82`) | anonymous | CSRF form + rate limit | `shared_link_unsubscribe` 5/60s, 20/1h |

---

## DTO minimization audit (Improve-Plan §7: "missing DTO minimization caps SEC below 80")

| Output | Contains raw credential? | Verdict |
|---|---|---|
| `clientLinkPath` (`/share/${token}`) from create/republish/rotate | **YES — contains the raw publication token in the path** | **Acceptable, source-cited reason:** the owner is the manager who is authorized to copy/distribute the link; the raw token is the *intended* owner-visible share credential. Returned only after `assertProjectPublicationManager` passes. Never returned to read-only viewers (`drawer-actions.ts:27-37` redaction). This matches the credential taxonomy in `07`: raw publication token is owner-visible by design; raw **recipient** token is never returned to any client. |
| recipient list from `listSharedLinkRecipients` | NO (only `recipient_token_hash` exists server-side; raw recipient token never persisted) | clean |
| activity from `loadSharedLinkActivity` | NO (peppered `ip_hash`/`user_agent_hash`, no raw PII) | clean |
| drawer DTO | NO raw token; `clientLinkPath` redacted for viewers | clean |

**Security-cap implication:** DTO minimization is satisfied (the one raw-token surface is owner-only and authorized). No cap below 80 applies for DTO reasons. The remaining security cap is the emulated-verification mode (not a content gap).

## Rate/abuse posture summary (owner-side)
- **Resend** is the only owner-side action with a per-action rate limit (1/5min). This pack **surfaces** it (REQ-FR-04), does not weaken it.
- `create`/`republish`/`rotate`/`revoke` have **no per-action rate limit** today; the D1 UNIQUE partial index (one-published-per-project) is the concurrency guard, and these are manager-only destructive actions behind confirm dialogs. **Finding (not a blocker):** if abuse of rotate/revoke becomes a concern post-beta, a per-manager rate limit could be added — flagged in `14` RISK-RELIABILITY-1, not planned here (no abuse signal pre-launch; cost posture).
- No new unauthenticated endpoint introduced by this pack.
