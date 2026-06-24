"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { getComponentDetailsHref } from "@/components/workshop/library/component-route-state";
import {
  useLibrarySurfaceVariant,
} from "@/components/workshop/library/library-surface-variant";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-class";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import {
  searchLibraryOverview,
  type LibraryOverviewSearchResult,
} from "@/lib/component-library/actions";
import { cn } from "@/lib/ui/cn";
import { LibraryOverviewSearchGroup } from "./LibraryOverviewSearchGroup";
import {
  libraryOverviewSearchOptionDomId,
  type LibraryOverviewSearchEntry,
} from "./LibraryOverviewSearchModel";

const SEARCH_DEBOUNCE_MS = 150;
const LISTBOX_ID = "library-overview-search-results";

type LibraryOverviewSearchState = {
  query: string;
  open: boolean;
  pending: boolean;
  results: LibraryOverviewSearchResult | null;
  highlightedId: string | null;
};

type LibraryOverviewSearchAction =
  | { type: "query"; value: string }
  | { type: "open" }
  | { type: "close" }
  | { type: "search:start" }
  | { type: "search:success"; results: LibraryOverviewSearchResult }
  | { type: "search:error" }
  | { type: "highlight"; entryId: string };

const EMPTY_SEARCH_RESULTS: LibraryOverviewSearchResult = { components: [], templates: [] };

const INITIAL_SEARCH_STATE: LibraryOverviewSearchState = {
  query: "",
  open: false,
  pending: false,
  results: null,
  highlightedId: null,
};

function libraryOverviewSearchReducer(
  state: LibraryOverviewSearchState,
  action: LibraryOverviewSearchAction,
): LibraryOverviewSearchState {
  switch (action.type) {
    case "query": {
      const query = action.value;
      if (!query.trim()) {
        return { ...INITIAL_SEARCH_STATE, query };
      }
      return { ...state, query, open: true, highlightedId: null };
    }
    case "open":
      return { ...state, open: true };
    case "close":
      return { ...state, open: false };
    case "search:start":
      return { ...state, pending: true };
    case "search:success":
      return { ...state, results: action.results, pending: false, highlightedId: null };
    case "search:error":
      return { ...state, results: EMPTY_SEARCH_RESULTS, pending: false, highlightedId: null };
    case "highlight":
      return { ...state, highlightedId: action.entryId };
    default:
      return state;
  }
}

/**
 * Cross-library search for the Overview home: a persistent 360px
 * `SearchInput` whose results popover groups Components and Templates,
 * fetched lazily through the `searchLibraryOverview` server action from the
 * first keystroke. Component results deep-link to the Components inspector;
 * templates open their editor. `⌘K` focuses the input, arrows move the
 * highlight, Esc closes.
 */
export function LibraryOverviewSearch() {
  const router = useNavigationRouter();
  const surfaceVariant = useLibrarySurfaceVariant();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const [searchState, dispatchSearch] = useReducer(libraryOverviewSearchReducer, INITIAL_SEARCH_STATE);
  const { query, open, pending, results, highlightedId } = searchState;

  const trimmedQuery = query.trim();

  // The search index lives server-side: results load lazily through the
  // server action from the first keystroke. Empty-query resets happen in the
  // change handler; the effect only owns the debounced fetch.
  const updateQuery = useCallback((value: string) => {
    if (!value.trim()) {
      requestIdRef.current += 1;
    }
    dispatchSearch({ type: "query", value });
  }, []);

  useEffect(() => {
    if (!trimmedQuery) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timer = setTimeout(() => {
      dispatchSearch({ type: "search:start" });
      searchLibraryOverview({ query: trimmedQuery })
        .then((nextResults) => {
          if (requestIdRef.current !== requestId) return;
          dispatchSearch({ type: "search:success", results: nextResults });
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          dispatchSearch({ type: "search:error" });
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  // ⌘K focuses the search (same guard idiom as the Components sheet).
  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
      event.preventDefault();
      inputRef.current?.focus();
    }

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  // Pointer-down outside the search closes the popover.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (containerRef.current?.contains(event.target)) return;
      dispatchSearch({ type: "close" });
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const componentEntries = useMemo<LibraryOverviewSearchEntry[]>(() => {
    if (!results || results.components.length === 0) return [];
    return [
      ...results.components.map((component) => ({
        id: `component-${component.id}`,
        title: component.name,
        meta: [component.category, component.supplier].filter(Boolean).join(" · ") || undefined,
        href: getComponentDetailsHref(component.id),
        kind: "component" as const,
      })),
      {
        id: "see-all-components",
        title: "See all in Components",
        href: "/workshop/library/components",
        kind: "see-all" as const,
      },
    ];
  }, [results]);

  const templateEntries = useMemo<LibraryOverviewSearchEntry[]>(() => {
    if (!results || results.templates.length === 0) return [];
    return [
      ...results.templates.map((template) => ({
        id: `template-${template.id}`,
        title: template.name,
        meta: template.category || undefined,
        href: `/workshop/library/templates/${template.id}`,
        kind: "template" as const,
      })),
      {
        id: "see-all-templates",
        title: "See all in Templates",
        href: "/workshop/library/templates",
        kind: "see-all" as const,
      },
    ];
  }, [results]);

  const flatEntries = useMemo(() => [...componentEntries, ...templateEntries], [componentEntries, templateEntries]);
  const hasResults = flatEntries.length > 0;
  const showNoResults = Boolean(results) && !pending && !hasResults;

  // A stale highlight falls back to the first entry on Enter.
  const highlightedEntry = flatEntries.find((entry) => entry.id === highlightedId) ?? null;

  const activateEntry = useCallback(
    (entry: LibraryOverviewSearchEntry) => {
      dispatchSearch({ type: "close" });
      router.push(entry.href);
    },
    [router],
  );

  const moveHighlight = useCallback(
    (delta: 1 | -1) => {
      if (flatEntries.length === 0) return;
      const currentIndex = flatEntries.findIndex((entry) => entry.id === highlightedId);
      const nextIndex =
        currentIndex === -1
          ? delta === 1
            ? 0
            : flatEntries.length - 1
          : (currentIndex + delta + flatEntries.length) % flatEntries.length;
      dispatchSearch({ type: "highlight", entryId: flatEntries[nextIndex].id });
    },
    [flatEntries, highlightedId],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        if (open) {
          event.preventDefault();
          dispatchSearch({ type: "close" });
        }
        return;
      }
      if (!open && trimmedQuery && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        dispatchSearch({ type: "open" });
        return;
      }
      if (!open) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHighlight(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHighlight(-1);
        return;
      }
      if (event.key === "Enter") {
        const entry = highlightedEntry ?? flatEntries[0];
        if (!entry) return;
        event.preventDefault();
        activateEntry(entry);
      }
    },
    [activateEntry, flatEntries, highlightedEntry, moveHighlight, open, trimmedQuery],
  );

  return (
    <div ref={containerRef} className="relative w-[360px] max-w-full" data-library-overview-search="true">
      <SearchInput
        ref={inputRef}
        wrapperClassName={cn("w-full", librarySurfaceClass(surfaceVariant, "segmentedControl"))}
        placeholder="Search components and templates"
        aria-label="Search components and templates"
        role="combobox"
        aria-expanded={open}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={highlightedEntry ? libraryOverviewSearchOptionDomId(highlightedEntry.id) : undefined}
        shortcutKey="⌘K"
        value={query}
        onChange={(event) => updateQuery(event.target.value)}
        onClear={() => {
          updateQuery("");
          inputRef.current?.focus();
        }}
        onKeyDown={handleKeyDown}
      />
      {open ? (
        // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- Library search renders a custom ARIA listbox, not a native datalist.
        <div
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Library search results"
          className={cn(
            "absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto pb-1",
            librarySurfaceClass(surfaceVariant, "popup"),
          )}
          data-library-overview-search-popover="true"
        >
          {hasResults ? (
            <>
              <LibraryOverviewSearchGroup
                label="Components"
                entries={componentEntries}
                highlightedId={highlightedEntry?.id ?? null}
                onActivate={activateEntry}
                onHighlight={(entryId) => dispatchSearch({ type: "highlight", entryId })}
              />
              <LibraryOverviewSearchGroup
                label="Templates"
                entries={templateEntries}
                highlightedId={highlightedEntry?.id ?? null}
                onActivate={activateEntry}
                onHighlight={(entryId) => dispatchSearch({ type: "highlight", entryId })}
              />
            </>
          ) : showNoResults ? (
            <div className="flex flex-col items-start gap-1 px-2 py-2">
              <p className="text-[9px] leading-4 text-tertiary">{`No components or templates match "${trimmedQuery}"`}</p>
              <Button
                type="button"
                variant="plain"
                size="xs"
                className="min-h-6 min-w-0 px-1 !text-[9px]"
                onClick={() => {
                  updateQuery("");
                  inputRef.current?.focus();
                }}
              >
                Clear search
              </Button>
            </div>
          ) : (
            <p className="px-2 py-2 text-[9px] leading-4 text-tertiary" aria-live="polite">
              Searching the library…
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
