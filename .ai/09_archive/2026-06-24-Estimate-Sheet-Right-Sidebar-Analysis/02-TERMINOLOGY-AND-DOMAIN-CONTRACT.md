# 02 — Terminology and Domain Contract

## The tab-naming gate (RESOLVED)

### User's described tab model
> Library · Project · Component

### Verified source-of-truth tab model
> Library · Project · Templates

### Evidence

**`src/components/workshop/component-library/index.tsx:149-157`**:
```ts
const LIBRARY_TREE_TABS = [
  { id: "components", label: "Library" },
  { id: "project", label: "Project" },
  { id: "templates", label: "Templates" },
] as const;
const PUBLIC_LIBRARY_TREE_TABS = [
  { id: "components", label: "Library" },
  { id: "templates", label: "Templates" },
] as const;
```

**`tests/vitest/component-library-ui.test.tsx:425-427`** — test-pinned:
```ts
expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent))
  .toEqual(["Library", "Project", "Templates"]);
```

### What "Component" refers to

1. **`AddComponentModal` internal tab** — `AddComponentModal.tsx:181` defines `type AddComponentModalTab = "component" | "activity"`; the modal tabstrip renders `{label:"Component"}`. This is the most likely source of the user's "Component" label.
2. **`componentViewMode`** — the Library tab's view-by modes (`default|suppliers|brand`); the tab `id` is still `"components"` internally.
3. **`component-library/` directory** — the feature directory name reinforces internal "component" terminology.

### Recommendation: keep `Library / Project / Templates`

Current labels are correct and should not be renamed. "Library" is broader than "Components" and accurately communicates the reusable catalog. The internal `id` values (`components`, `project`, `templates`) are never user-visible.

**Migration risk if renamed**: `LIBRARY_PREFS_KEY` stores `{activeTab}` in localStorage with these id values; a rename would orphan stored prefs. Test assertions would break.

## Domain glossary

| Term | Definition | Persisted? | Source |
| --- | --- | --- | --- |
| **Library Component** | `cost_library_items` row (workspace-scoped, lifecycle-tracked) | DB | `component-library-repository.ts` |
| **Project Component** | **Projection** of `estimate_row_items` into virtual `project-components-<projectId>` folder. Read-only. | Derived | `project-component-projection.ts` |
| **Custom Template** | `estimate_templates` + child nodes + row items | DB | `estimate-templates.ts` |
| **Template Category** | Free-text `category` string on template rows. NOT a separate entity. | DB field | `actions.ts` |
| **Reusable Project Source** | Read-only browse of another project's estimate tree | Derived | `reusable-sources/types.ts` |
| **Library Folder** | `library_folders` row (`folder_kind: custom\|taxonomy`) | DB | `library-folder-reorder.ts` |
| **Project Projection Folder** | Synthetic id `project-components-<projectId>` — NOT a DB row | Virtual | `project-component-projection.ts` |

## Critical distinction: Project tab ≠ Reusable Project Sources

| Aspect | Project tab (top-level) | Reusable Project Sources (in Templates) |
| --- | --- | --- |
| Data source | Current project's estimate rows | Other projects' estimate trees |
| Scope | Current project only | All accessible workspace projects |
| Insert | Inserts the projected row as a new estimate row | Inserts a subtree copy via RPC |
| Edit/delete | Not available | Not available |
| UI | `LibraryTree` under "Project" tab | `TemplatesTree` under "Projects" section |

This distinction is **not clearly communicated in the UI** — see Finding F-02.

## Area / Group / Node terminology (P6 single-node model)

The codebase has migrated to a **single-node model** where every estimate tree node is an "Area". The legacy "group" kind still exists in the DB but the UI treats all nodes uniformly.

**Evidence**: `EstimateSheetTree.tsx:132-134` — optimistic ids use `optimistic-area-` prefix. `EstimateSheetTree.tsx:842` — single "Add Area" flow, no kind choice.

**Inconsistency**: `summarizeEstimateTemplate` (`estimate-templates.ts:368`) still counts `groupCount` vs `areaCount` separately. Some copy strings still reference "group" (e.g. `index.tsx:562` project-source preview "Select group").
