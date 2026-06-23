# 03 - Library Gap Analysis

## Severity Legend

- P0: must fix in the first implementation sequence because it defines the visual system or prevents parity.
- P1: important once P0 slots exist.
- P2: polish or lower-risk follow-up.
- Defer: intentionally outside this UI pass.

## Ranked Gaps

| ID | Severity | Gap | User impact | Affected files | Fix type |
|---|---:|---|---|---|---|
| GAP-01 | P0 | Library route family has mixed material systems | App feels stitched together; Overview/Templates do not look like the rest of Workshop | `LibraryOverview.tsx:209`, `TemplatesBrowseManager.tsx:788`, `LibraryPageClient.tsx:135` | Reuse/extend Library surface slots |
| GAP-02 | P0 | Overview is a white admin page inside a glass shell | First Library impression feels outdated | `LibraryOverview.tsx:209`, `loading.tsx:10` | Recompose as command surface |
| GAP-03 | P0 | Templates browse does not use Library surface variant | Components and Templates feel like different products | `TemplatesBrowseManager.tsx:788`, `TemplateGallery.tsx:61`, `TemplatePreviewDock.tsx:91` | Wire to surface provider/classes |
| GAP-04 | P0 | Components inner surfaces bypass variant classes | The strongest route still has local white cards, shadows, and sticky heads | `ComponentLibraryManager.tsx:1499`, `ComponentLibraryManager.tsx:1583` | Replace local classes with slots |
| GAP-05 | P0 | Toolbar contract is implicit | Future implementation may add one-off Library toolbar rules | `HeaderIconToolbar.tsx:88`, `TreePanelHeader.tsx:194`, `LibraryFolderTree.tsx:992` | Document and enforce shared contract |
| GAP-06 | P1 | Right docks are white panels, not glass rails | Inspector/preview look detached from pane system | `ComponentInspectorDock.tsx:136`, `TemplatePreviewDock.tsx:91` | Add `rightDock` slot |
| GAP-07 | P1 | Cards are visually busy and over-shadowed | Trust fields are present but scan hierarchy is weak | `ComponentLibraryManager.tsx:463`, `ComponentLibraryManager.tsx:1499` | Flat paper tile/card treatment |
| GAP-08 | P1 | Dense table needs paper/headchrome discipline | Large-library mode can look like legacy admin data | `ComponentLibraryManager.tsx:1499` | Dense table slot and sticky head chrome |
| GAP-09 | P1 | Loading states mirror old white UI while aligned fallbacks need parity review | Loading reinforces the outdated visual language; already-glass fallbacks still need to match final skeleton geometry | `src/app/workshop/library/loading.tsx:10`, `LibraryPageClient.tsx:29` | Skeleton parity; preserve aligned glass fallback |
| GAP-10 | P1 | Shared popups may still be hard-white in glass context | Filter/search menus can visually pop out of the material system | `TreePanelHeader.tsx:194`, shared filter/search primitives | Shared primitive cleanup after local proof |
| GAP-11 | P2 | Template Editor shell remains white/admin | Editor feels lower polish than browse routes | `TemplateEditorClient.tsx:238` | Later phase due behavior risk |
| GAP-12 | Defer | Data model, taxonomy, provider persistence, authz | Not a visual-system problem in this pass | Supabase actions/migrations | No change |

## Must Fix Now

1. Define and implement the Library-local surface slot contract before route-specific reskins.
2. Recompose Overview so the first Library screen matches Workshop's liquid-glass workspace.
3. Standardize Components and Templates around the same pane grammar.
4. Lock the `HeaderIconToolbar` usage contract before any toolbar rewrite.
5. Define loading, empty, and error states in the same visual language as the final surfaces.

## Defer

- Template Editor full polish until Overview, Components, and Templates browse share a stable material contract.
- Broad shared primitive edits until Library-local slots prove the needed states.
- Any dashboard route, project route, estimate route, public route, or database changes.
- Full browser visual proof until implementation changes exist.

## Root Causes

- The Library evolved from multiple prior surfaces: standalone manager, estimate-sidebar concepts, template browsing, and newer workshop shell.
- The app now has stronger glass primitives than older Library subroutes use.
- Previous Library work prioritized performance, authz, source trust, dense mode, copy, and behavior. It shipped strong function but did not fully unify route-family material language.
- The shared toolbar primitives are powerful, but their Library-specific label, slot, and emphasis rules are not documented in one place.

## Preserve List

- Route-level tabs and title bar.
- Query/cache warm revisit behavior and mutation callback architecture.
- Deep links such as filter/freshness/lifecycle/brand/add state.
- Folder taxonomy and tree semantics.
- Dense mode, virtualization, source-trust fields, and 5k performance behavior.
- Add/edit drawers, inspector focus return, destructive confirmations, and a11y contracts.
- Template editor save state and insert-into-estimate behavior.
