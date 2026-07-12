# UNIT-007 Full-Width Shell Receipt

## Scope and status

- **Unit:** `UNIT-007`
- **Run scope:** `IMPLEMENT_LOCAL`
- **Result:** `PASS`
- **Implementation:** `src/components/client-portal/ClientPortalShell.tsx` and the v2 branch in `src/app/share/[token]/page.tsx`.
- **Focused tests:** Client Portal focused Vitest suite — 16 passed, including `tests/vitest/client-portal-shell.test.tsx`.
- **Static verification:** isolated TypeScript program for 18 public-access/shell entry files — passed.

## Delivered contract

- `/share/:token` probes v2 portal tokens safely, renders the Client Portal shell for those tokens, and preserves the legacy share page for all other or unavailable v2 token probes.
- The shell fills the viewport with a responsive grid: persistent section rail on desktop, wide center content, and contextual review rail at large widths.
- Mobile uses a horizontally scrollable section selector, fixed action bar, and accessible review-context drawer rather than a compressed desktop rail.
- Only the manifest and selected issued section are fetched. Hash-selected section deep links are restored on load and updated on selection.
- Password gates reuse the existing client-side CSRF/password interaction against the compatibility handoff; unavailable resources remain generic.
- The initial renderer is intentionally generic and safe. Unit-specific financial, estimate, discussion, activity, and decision renderers remain later owned work.

## Acceptance review

| Acceptance claim | Evidence | Result |
|---|---|---|
| Uses browser width without a global centered cap | Full-width responsive grid has no `max-w-*` page shell. | PASS |
| Responsive navigation and context | Desktop rail, mobile section selector, fixed mobile actions, and mobile context drawer are present. | PASS |
| Section renderer is lazy and contract-bound | DOM test proves manifest fetch precedes only the selected-section fetch. | PASS |
| Current issue identity remains visible | Sticky header, contextual rail, and mobile drawer all display issued identity/status. | PASS |
| Deep-link path exists | Section IDs synchronize with URL hashes. | PASS |

## Validation boundary

The local DOM test proves fetch and rendering sequencing, not physical browser viewport, keyboard, print-device, or hosted deployment behavior. Browser/visual proof remains intentionally outside this local receipt.

## Next unit

`UNIT-008` owns the estimate-browser extraction and all-row contract.
