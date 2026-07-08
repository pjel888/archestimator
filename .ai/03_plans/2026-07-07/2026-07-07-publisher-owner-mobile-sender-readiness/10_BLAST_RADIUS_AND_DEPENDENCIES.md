# 10 — Blast Radius and Dependencies

---

## Direct impact (classified)

| Area | File/symbol | Impact class | Notes |
|---|---|---|---|
| Publisher roster client (mobile) | `PublisherRosterClient.tsx:224-228` | **Required change** (Option B message + copy-URL) | keep CSS guard; improve message |
| Publisher empty state | `PublisherEmptyState.tsx:29-33` (`mobile` variant) | **Probable change** (copy + copy-URL button) | only if Option B changes the message |
| Roster row actions | `PublisherRosterRow.tsx` | **Possible change** (action label/clarity) | sender action clarity |
| Drawer | `PublisherDrawer.tsx` | **Required change** (state/a11y surfacing) | SERIALIZE with workflow pack |
| Email composer | `RecipientEmailComposer.tsx` | **Required change** (clarity/states) | SERIALIZE with workflow pack |
| Activity feed | `PublisherActivityFeed.tsx` | **Possible change** (proof surfacing) | audit/proof |
| Route | `src/app/workshop/publisher/page.tsx` | **Verification only** (no server data-shape change in Option B) | read-only unless Option A |
| Server actions | `src/lib/publication/actions.ts` | **Verification only** (audit; no contract change) | do not duplicate workflow-pack gating |
| Security | `src/lib/publication/security.ts` | **Explicitly unaffected** | no crypto change |
| D1 schema | `migrations/*` | **Explicitly unaffected** | no migration (workflow pack owns `0037`) |
| Bindings | `wrangler.jsonc`, `cloudflare-env.d.ts` | **Explicitly unaffected** | no binding change → no `cf:typegen` |

## Transitive impact
- **Recipients (downstream):** rotate/revoke already affect them; this pack only surfaces it to the owner. No recipient-facing route change.
- **Sibling packs:** consume honest-delivery labels + readiness gate from workflow pack (one-way).
- **Tests:** extend existing `publisher-*` / `recipient-email-composer` / `project-publication-*` tests; no test-framework change.
- **Docs:** no user-facing doc change required (publisher is an internal workshop surface).

## Parallelization classification

| Workstream | Classification | Why |
|---|---|---|
| Source/UI audit | (done) parallel-safe | read-only |
| Backend/authz audit | (done) parallel-safe | read-only |
| Sibling-trace | (done) parallel-safe | read-only |
| Mobile message + copy-URL (Option B) | parallel-safe (impl) | localized to `PublisherRosterClient` + `PublisherEmptyState` |
| Drawer state/a11y surfacing | **SEQUENTIAL-DEPENDS-ON-WORKFLOW-PACK** | shared file with workflow pack Phase 6 |
| Composer clarity/states | **SEQUENTIAL-DEPENDS-ON-WORKFLOW-PACK** | shared file with workflow pack |
| Activity/proof surfacing | parallel-safe (impl) | `PublisherActivityFeed` not touched by workflow pack |
| Test extensions | parallel-safe per file | disjoint test files |

## Sibling-pack dependency map

```
client-ready-proposal-package-workflow (readiness gate, Preflight, owner message,
  honest delivery labels, responded wiring, notification dispatch)
        │
        │ (this pack consumes: honest labels + readiness gate result)
        ▼
publisher-owner-mobile-sender-readiness (THIS PACK: device operability,
  sender-action clarity, owner-side error/recovery/audit-proof/a11y)
        ▲
        │ (this pack consumes: snapshot integrity is preserved; no change)
        │
proposal-export-and-immutable-deliverable-trust (snapshot immutability, export integrity)
```

- `recipient-proposals-inbox-ia-recovery` and `public-share-activity-minimization` are recipient/token-boundary complements; **no code dependency** on this pack (different files), only conceptual.

## Serialization rule for shared files
- `PublisherDrawer.tsx` and `RecipientEmailComposer.tsx`: if both this pack and the workflow pack implement, **the workflow pack lands first** (it owns the gate/message), then this pack's state/a11y/clarity edits rebases on top. File-scope lease recorded in `00`.
- `actions.ts`: this pack is **audit-only**; no edit, so no conflict.

## Affected documentation
- None external. This plan folder is the only doc artifact.
