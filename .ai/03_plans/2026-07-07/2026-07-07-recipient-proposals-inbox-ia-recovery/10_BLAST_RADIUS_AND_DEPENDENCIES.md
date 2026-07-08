# 10 — Blast Radius and Dependencies

## Direct impact

| Surface | File / route | Impact class | Details |
|---|---|---|---|
| Inbox client | `src/components/workshop/proposals-page-client.tsx` | Required change | Consume forked empty state; wire wrong-account CTA from row errors |
| Inbox empty state | `src/components/workshop/proposals-page/ProposalsEmptyState.tsx` | Required change | Fork copy: "no proposals" vs "may be wrong email" + sign-out link (FR-04) |
| Inbox row | `src/components/workshop/proposals-page/ProposalRow.tsx` | Required change | Wrong-account differentiated CTA on `not-a-recipient` (FR-06) |
| Inbox list | `src/components/workshop/proposals-page/ProposalsList.tsx` | Probable change | Pass through any new row affordance; possibly header copy alignment |
| Share page | `src/app/share/[token]/page.tsx` | Required change | Inline terminal states (expired/revoked) per ARCH-04 |
| Share not-found | `src/app/share/[token]/not-found.tsx` | Required change | Generic-only copy (anti-enumeration); remove expired/revoked conflation |
| Share error | `src/app/share/[token]/error.tsx` | **New file** | Share-level error boundary (FR-10b) |
| Share decision | `src/components/share/SharePageDecision.tsx` | Required change (narrow) | Finality badge copy alignment (FR-08) |
| Share session banner | `src/components/share/SharePageSessionBanner.tsx` | Required change (narrow) | "View all your proposals" link (FR-02) |

## Transitive impact

| Surface | File / route | Impact class | Details |
|---|---|---|---|
| Open action | `src/lib/publication/actions.ts::openRecipientProposalAction` | Verification only | No contract change; the wrong-account branch is row-side. Re-verify the 6 existing tests stay green. |
| Inbox repository | `src/lib/repositories/recipient-proposals-repository.ts` | Verification only | No query change in V1; credential-free assertion must stay green. |
| Inbox action | `src/lib/recipient-proposals/actions.ts` | Verification only | Trivial wrapper; unchanged. |
| Sidebar | `src/components/sidebar/MainSidebar.tsx` | Possible change (V2) | Badge count only if/when notification dispatch lands (OPEN-IA-04). |
| Share copy module | `src/lib/publication/share-copy.ts` | Probable change | New differentiated copy constants (expired/revoked); keep `SHARED_LINK_UNAVAILABLE_COPY` for unknown. |
| Decision copy-contract test | `tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx` | Required change | Reconcile with FR-08 (dialog neutral, badge finality). |

## Explicitly unaffected

| Surface | Owner | Reason |
|---|---|---|
| `security.ts` crypto primitives | `proposal-export-and-immutable-deliverable-trust` / `invite-token-flow-hardening` | Sound; not changed |
| Decision API contract (`/api/share/[token]/decision`) | This pack (no change) | Stable; client copy only |
| Session/password/activity API routes | This pack (no change) | Stable |
| Owner publisher UI / digest / recipient management | `client-ready-proposal-package-workflow` | Fenced off |
| Public activity route | `public-share-activity-minimization` | Fenced off |
| Invite system (`src/lib/collaboration/*`) | `invite-token-flow-hardening` | Separate surface |
| Notification infra (`src/lib/notifications/*`) | client-ready Phase 5 / DATA-04 | V2 dependency |
| D1 schema | — | No V1 migration |
| `wrangler.jsonc` bindings | — | No new binding |
| `DESIGN.md` | — | Alpha guide; no new tokens |

## Users/roles impact

| Role | Impact |
|---|---|
| Signed-in recipient (correct email) | Better IA/recovery; no auth change |
| Signed-in recipient (wrong email) | **New** clear recovery CTA |
| Anonymous link holder | **New** differentiated terminal copy (expired/revoked); unchanged unknown-token copy |
| Owner/publisher | None (this pack is recipient-side) |

## Routes/APIs impact

| Route | Method | Change |
|---|---|---|
| `/workshop/proposals` | GET | UI only (empty-state fork, row CTA) |
| `/share/[token]` | GET | UI only (inline terminal states) |
| `/share/[token]` (unknown) | GET | Unchanged (generic not-found) |
| `/api/share/[token]/*` | * | **None** |
| New API routes | — | **None in V1** |

## Database/migrations impact

- **None in V1.** No migration; no index change; no RPC change.

## Background jobs / integrations

- **None.** Owner digest is unchanged (owned by client-ready-proposal-workflow).

## Caches / auth

- **None.** Cookie model unchanged; TanStack Query config unchanged.

## Tests / analytics / monitoring

- New/updated vitest DOM tests (TEST-01 … TEST-20).
- No new analytics event required (terminal states are not separately tracked in V1; optional later).
- No new monitoring dashboard.

## Documentation impact

- `current-state.md` (post-implementation, DOC-01).
- `decisions.md` (post OPEN-IA-01..04 resolution, DOC-02).
- No user-facing docs (in-app copy suffices).

## Backward compatibility

- Full. All changes are additive (better copy/recovery; no contract/schema change).

## Concurrent-work / sibling-pack risk

- Six sibling packs touch overlapping surfaces. Risk: another pack changes `share-copy.ts`, `security.ts`, or a share route contract out from under this pack.
- **Mitigation:** the implementer must re-read every touched file immediately before editing and run the stale-plan revalidation checklist (README). File-scope ownership is declared in `00_AGENT_COORDINATION.md`.

## Affected features (existing)

- Recipient inbox (enhanced, not broken).
- Share page terminal states (differentiated, not broken).
- Decision flow (copy aligned, contract unchanged).
