# 04 — Requirements Specification

IDs use category prefixes. Each requirement has objective, source strength, acceptance criteria, validation, and affected code.

**Source-strength legend:** `brief` (user text), `repo-evidence` (current source), `official-docs` (local installed Next.js docs / nextjs.org), `derived` (synthesized from evidence), `owner-delegated` (product call flagged for owner).

---

## FR-1 — Persistent workshop chrome across top-level navigation
- **Statement:** Navigating between any two top-level workshop routes (`/workshop`, `/workshop/projects`, `/workshop/proposals`, `/workshop/library`, `/workshop/publisher`, `/workshop/settings`) must NOT unmount/remount the sidebar, glass backdrop, title-bar container, or footer.
- **Rationale:** RC-1 is the dominant remount cost; the proven `library/*` and `projects/[projectId]/*` layouts already achieve persistence.
- **Source:** `repo-evidence` + `official-docs` (layouts persist on nav).
- **Priority:** P0.
- **Dependencies:** none.
- **Acceptance criteria:** (a) During a client `<Link>` nav `/workshop`↔`/workshop/proposals`, a `MainSidebar` instance's React identity is stable (React DevTools / a `useEffect` mount-count probe logs a single mount across the nav). (b) No layout shift of the sidebar/header.
- **Validation:** React Profiler mount count; manual nav in prod build; Playwright optional.
- **Affected code:** `workshop/layout.tsx`; new `WorkshopShell`; `WorkshopPageShell`; `StaticWorkshopLoadingShell`; top-level `page.tsx`/`loading.tsx` files.
- **Status:** pending (planning).

## FR-2 — Content-only loading state on client navigation
- **Statement:** On a client `<Link>` nav to a workshop leaf, only a content-area skeleton (for that page) shows while the page streams; the full dashboard skeleton (`workshop/loading.tsx`) must NOT show.
- **Rationale:** RC-3; `proposals/loading.tsx` should be the fallback, not `workshop/loading.tsx`.
- **Source:** `official-docs` (`instant-navigation.md`, `loading.md`).
- **Priority:** P0.
- **Acceptance criteria:** During `/workshop`→`/workshop/proposals` nav in a **production** build, the 9.3 KB dashboard skeleton does not render; the `proposals` content skeleton does.
- **Validation:** prod build manual nav + DOM assertion (`[data-workshop-page-shell-root]` stays; content slot swaps).
- **Affected code:** `loading.tsx` files; `WorkshopShell` content Suspense.
- **Status:** pending.

## FR-3 — (RECLASSIFIED) Auth/terms gate is intentionally synchronous/blocking
- **Statement:** The workshop layout's uncached `headers()`/session/terms reads are the **security gate** and MUST stay synchronous-first; they are intentionally blocking. RC-2's "non-blocking gate" goal is **withdrawn** — deferring these reads would expose workshop content to unauthenticated/terms-pending users (see `08` SEC-T1/T2). This requirement is now folded into SEC-1.
- **Rationale:** Verified source (`request-proxy.ts:195,227-248`, `protected-route-gate.ts:26-39`) — the layout is the sole prod verifier. `layout.md:316-323`/`loading.md:90-95` explain why it blocks; that blocking is correct.
- **Source:** `repo-evidence` (corrected this cycle) + `official-docs`.
- **Priority:** P0 (merged into SEC-1).
- **Acceptance criteria:** gate documented as intentional/synchronous-first (WP-2.1); no defer/Suspense; static gate passes (every `redirect()` precedes JSX).
- **Validation:** PROOF-3 (static) + SEC-1 denial tests.
- **Affected code:** `workshop/layout.tsx` (comment only).
- **Status:** reclassified → SEC-1.

## ARCH-1 — Keep nested `/workshop/*` URLs
- **Statement:** Do NOT flatten to `/proposals`; do NOT use route groups to strip `/workshop`. Keep the nested structure.
- **Rationale:** DEC-01 — nesting enables shared-layout reuse + SPA transitions; flattening loses both.
- **Source:** `official-docs` + `owner-delegated` (needs owner sign-off).
- **Priority:** P0.
- **Acceptance criteria:** URLs unchanged; no new top-level routes; no route groups introduced to rename.
- **Validation:** route inventory unchanged.
- **Affected code:** none (this is a "do not change" requirement).
- **Status:** recommended (pending owner ack).

## UX-1 — No regression to current loading affordances
- **Statement:** The existing `RouteLoadingOverlay` global spinner and per-page content skeletons remain available; reduced reliance on the 9.3 KB dashboard skeleton must not remove perceived progress feedback.
- **Source:** `repo-evidence`.
- **Priority:** P1.
- **Acceptance criteria:** during any workshop nav, the user sees either a content skeleton or the global overlay, never a blank/unresponsive screen.
- **Validation:** manual nav matrix in prod build.
- **Affected code:** none structurally (preserve layers).
- **Status:** pending.

## A11Y-1 — Preserve accessibility semantics during nav
- **Statement:** `aria-live` progress announcements and `aria-hidden` handling for the swapping content slot remain correct; the persistent sidebar keeps its `aria-label`/landmark role across navigations.
- **Source:** `repo-evidence` (`StaticWorkshopLoadingShell` has `aria-live` polite output; `route-loading-overlay` aria-hides the root).
- **Priority:** P1.
- **Acceptance criteria:** axe/DOM assertions: the content slot swap announces loading; the sidebar landmark persists; no duplicate landmark IDs.
- **Validation:** axe snapshot before/after; keyboard nav ⌘1–5 still works.
- **Affected code:** `WorkshopShell`, content Suspense fallback.
- **Status:** pending.

## SEC-1 — Auth/terms gate stays the sole prod verifier, synchronous-first (CORRECTED — see 08)
- **Statement:** The auth+terms gate in `workshop/layout.tsx` MUST remain the first synchronous operation and complete its `redirect()` BEFORE any workshop chrome/content renders. It is the **sole production auth+terms verifier** (middleware is a cookie-presence fast-path only — verified `request-proxy.ts:227-248`, `protected-route-gate.ts:26-39`). It MUST NOT be Suspense-deferred or moved behind chrome rendering.
- **Source:** `repo-evidence` (corrected this cycle — original "backstop" framing was wrong).
- **Priority:** P0.
- **Acceptance criteria:** (1) Unauthenticated GET `/workshop/proposals` → redirect `/login?next=/workshop/proposals`, **no workshop content** in body. (2) Terms-pending authenticated GET → redirect to terms, no content. (3) Static gate: in `workshop/layout.tsx` every `redirect()` precedes any JSX/`<WorkshopShell>`; no `await` for chrome precedes gate reads. (4) Dev-bypass still passes via headers.
- **Validation:** denial tests + static gate (see `08_SECURITY_PRIVACY_THREAT_MODEL.md` SEC-T1/T2/T3).
- **Affected code:** `workshop/layout.tsx` (gate logic unchanged; chrome added AFTER gate).
- **Status:** pending.

## PERF-1 — Performance evaluator (see 09)
- **Statement:** A defined evaluator measures route-transition shell stability + nav latency with baseline, target, regression threshold.
- **Source:** `derived`.
- **Priority:** P1.
- **Acceptance criteria:** evaluator runnable; baseline + post-change numbers recorded.
- **Status:** pending.

## DOC-1 — Record the routing decision and the "chrome belongs in the layout" rationale
- **Statement:** Update relevant docs/state so future agents understand why workshop chrome is layout-owned.
- **Source:** `derived`.
- **Priority:** P2.
- **Acceptance criteria:** a note in `.ai/10_state/current-state.md` (or a code comment) captures DEC-01 and the RC-1/RC-2 mechanism.
- **Status:** pending.

---

## Shadow-path matrix (applicable flows)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `/workshop`→`/workshop/proposals` client nav | persistent shell, content skeleton → page | n/a | page shows empty proposals state | n/a | (handled by gate) | overlay spinner, content skeleton | two rapid navs → router handles | n/a | instant shell, streamed content | PERF-1 + manual |
| Direct URL load `/workshop/proposals` | layout shell renders, content streams | n/a | empty state | n/a | redirect `/login` | overlay + skeleton | n/a | n/a | shell + content | manual |
| Unauthenticated hit `/workshop/proposals` | — | — | — | — | redirect `/login?next=/workshop/proposals` | — | — | — | redirect | denial test |

(Data/provider flows are out of scope → marked n/a with reason in `06`.)
