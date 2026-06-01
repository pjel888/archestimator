# 05 — Component Library Polish Plan

**Date:** 2026-06-01

## Current State

`/workshop/library` has a working component library with:
- **Tree views:** Default (library_folders with create/rename/delete/reorder via RCT), Suppliers, Brand
- **Center sheet:** Component rows filtered by selected tree node
- **Add Component modal:** Identity + variant tabs (SKU, unit, pricing, images, attachments)
- **154 seeded components** with WebP thumbnails under `component-images/seeded-component-thumbnails/v1/`
- **RLS:** Working — authenticated workspace members can read; editors can mutate

## Gap Analysis

| Area | Current | Gap |
|------|---------|-----|
| **Browse/search UX** | No search input on library page | Missing search across component names, descriptions, suppliers, brands |
| **Filter UX** | Tree-based folder/supplier/brand filtering only | No in-sheet filter for category, lifecycle state, pricing date |
| **Empty states** | No empty state for empty folders/suppliers/brands | User doesn't know a folder is empty vs. loading |
| **Error states** | No explicit error state for failed loads | Silent failure looks broken |
| **Loading states** | Static loading shell at route level | No skeleton loading inside tree/sheet when switching folders |
| **Component rows** | Basic rows with name, supplier, unit, cost, thumbnail | Could use compact card-style rows with more trust-building fields |
| **Add Component modal UX** | Functional but not design-system-polished | Variant tab switching could be smoother; image upload flow clunky |
| **Supplier/brand comboboxes** | Searchable creatable comboboxes | Works, but no empty state for "no suppliers yet" |
| **Design-system compliance** | Passes lint | Needs visual audit — some surfaces may have ad-hoc styling |
| **Seed data quality** | 154 components from seeding scripts | May contain stale pricing, missing images, taxonomy misfiles |
| **Tree usability** | RCT with DnD | Folder reorder via DnD works, but "no folders yet" state unhelpful |
| **Performance** | Routes build clean | No lazy loading of component images in sheet |

## Implementation Tasks

### P0 — Must fix before MVP launch

1. **Add search input to library page**
   - Add SearchInput above center sheet (or in header toolbar)
   - Search across: `cost_library_items.name`, `description`, `supplier` text, `brand` text
   - Client-side filtering of already-loaded rows for instant feedback
   - Clear search to return to tree-filtered view
   - Files: `src/components/workshop/LibraryPageClient.tsx`, `src/components/ui/search-input.tsx`

2. **Add empty states for all tree views**
   - Default view: "No library folders yet. Create a folder to organize your components."
   - Suppliers view: "No suppliers yet. Add a supplier when creating a component."
   - Brand view: "No brands yet. Add a brand when creating a component."
   - Center sheet when no folder selected: "Select a folder, supplier, or brand to browse components."
   - Center sheet when filter returns no results: "No components match your search."
   - Files: `src/components/workshop/LibraryPageClient.tsx`, `src/components/ui/empty-state.tsx`

3. **Add loading states**
   - Skeleton rows in center sheet while data loads
   - Spinner/skeleton in tree while folders load
   - Files: `src/components/workshop/LibraryPageClient.tsx`, `src/components/ui/skeleton.tsx`

### P1 — Should fix before MVP launch

4. **Improve component row display**
   - Show pricing date prominently (helps trust)
   - Show lifecycle state as small badge (draft/in_production/available)
   - Show supplier brand context
   - Compact row height consistent with estimate sheet rows
   - Files: `src/components/workshop/LibraryPageClient.tsx`

5. **Design-system visual audit**
   - Verify all text is SF Pro, regular/medium weights only
   - Verify no font size exceeds 12px
   - Verify all border radius is xs (3px)
   - Verify zero letter-spacing
   - Verify icons are regular weight (not fill/bold)
   - Files: All library components

6. **Seed data cleanup**
   - Audit seed component names (no brand prefixes, no "allowance" suffixes)
   - Verify taxonomy placement for all 154 components
   - Verify thumbnail URLs resolve and display correctly
   - Update stale pricing if possible
   - Files: `supabase/migrations/20260525095729*`, seed scripts

### P2 — Nice to have for MVP

7. **Lazy-load component thumbnails**
   - Use `loading="lazy"` on all component images
   - Add blur placeholder while loading
   - Files: `src/components/workshop/LibraryPageClient.tsx`

## Acceptance Criteria

- [ ] Search input filters component rows by name, description, supplier, brand
- [ ] Clearing search returns to tree-filtered view
- [ ] Empty state shown when no folder/supplier/brand selected
- [ ] Empty state shown when search returns no results
- [ ] "No folders yet" empty state for Default view
- [ ] Loading skeleton displayed during data fetch
- [ ] Component rows show name, supplier, unit, cost, pricing date, lifecycle badge
- [ ] Design-system lint passes with 0 violations
- [ ] No text exceeds 12px font size
- [ ] All border radius is xs (3px)
- [ ] All icons are regular weight
- [ ] Seed components have clean names (no brand prefixes or allowance suffixes)
- [ ] Thumbnails load correctly for all seeded components

## Files Likely Touched

- `src/components/workshop/LibraryPageClient.tsx` — main library page
- `src/components/ui/search-input.tsx` — search input primitive (may need variant)
- `src/components/ui/empty-state.tsx` — empty state primitive (may need variant)
- `src/components/ui/skeleton.tsx` — loading skeleton
- `src/lib/repositories/component-library-repository.ts` — data fetching
- `supabase/migrations/` — seed data cleanup migration (optional)

## Impact-Analysis Targets

Before editing, run impact analysis on:
- `LibraryPageClient` — blast radius ~5 components
- `getCurrentWorkspaceComponentRowsLibrary` — blast radius ~3 callers
- `SearchInput` — blast radius ~10 usages across workshop

## Tests

- Vitest: Search input filters rows, empty states render, loading skeleton renders
- Vitest: Design-system tokens are correct (font, size, radius, weight, tracking)
- E2E: Browse library → search → select component → verify details
