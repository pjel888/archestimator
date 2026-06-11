"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { useNavigationRouter } from "@/hooks/use-navigation-router";
import {
  searchLibraryOverview,
  type LibraryOverviewSearchResult,
} from "@/lib/component-library/actions";

const SEARCH_DEBOUNCE_MS = 150;
const LISTBOX_ID = "library-overview-search-results";

type SearchEntry = {
  id: string;
  title: string;
  meta?: string;
  href: string;
  kind: "component" | "template" | "see-all";
};

function optionDomId(entryId: string) {
  return `library-overview-search-option-${entryId}`;
}

/**
 * Cross-library search for the Overview home: a persistent 360px
 * `SearchInput` whose results popover groups Components and Templates,
 * fetched lazily through the `searchLibraryOverview` server action from the
 * first keystroke. Components deep-link to the Components tab (no per-item
 * selection link exists yet — documented v1 simplification); templates open
 * their editor. `⌘K` focuses the input, arrows move the highlight, Esc
 * closes.
 */
export function LibraryOverviewSearch() {
  const router = useNavigationRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [results, setResults] = useState<LibraryOverviewSearchResult | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const trimmedQuery = query.trim();

  // The search index lives server-side: results load lazily through the
  // server action from the first keystroke. Empty-query resets happen in the
  // change handler; the effect only owns the debounced fetch.
  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      requestIdRef.current += 1;
      setResults(null);
      setPending(false);
      setOpen(false);
      setHighlightedId(null);
      return;
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!trimmedQuery) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timer = setTimeout(() => {
      setPending(true);
      searchLibraryOverview({ query: trimmedQuery })
        .then((nextResults) => {
          if (requestIdRef.current !== requestId) return;
          setResults(nextResults);
          setPending(false);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setResults({ components: [], templates: [] });
          setPending(false);
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
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const componentEntries = useMemo<SearchEntry[]>(() => {
    if (!results || results.components.length === 0) return [];
    return [
      ...results.components.map((component) => ({
        id: `component-${component.id}`,
        title: component.name,
        meta: [component.category, component.supplier].filter(Boolean).join(" · ") || undefined,
        href: "/workshop/library/components",
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

  const templateEntries = useMemo<SearchEntry[]>(() => {
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

  // Results changed under the highlight: re-anchor to the first entry.
  const highlightedEntry = flatEntries.find((entry) => entry.id === highlightedId) ?? null;
  if (highlightedId !== null && !highlightedEntry) setHighlightedId(null);

  const activateEntry = useCallback(
    (entry: SearchEntry) => {
      setOpen(false);
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
      setHighlightedId(flatEntries[nextIndex].id);
    },
    [flatEntries, highlightedId],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      }
      if (!open && trimmedQuery && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        setOpen(true);
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

  const renderGroup = (label: string, entries: SearchEntry[]) => {
    if (entries.length === 0) return null;
    return (
      <div role="group" aria-label={label}>
        <p className="px-2 pb-0.5 pt-2 text-[8px] font-medium uppercase leading-3 text-tertiary" aria-hidden="true">
          {label}
        </p>
        {entries.map((entry) => {
          const highlighted = entry.id === (highlightedEntry?.id ?? null);
          return (
            <button
              key={entry.id}
              type="button"
              id={optionDomId(entry.id)}
              role="option"
              aria-selected={highlighted}
              data-library-overview-search-result={entry.id}
              className={`flex w-full items-baseline gap-1.5 px-2 py-1.5 text-left transition hover:bg-surfaceMuted ${highlighted ? "bg-surfaceMuted" : ""}`}
              onPointerEnter={() => setHighlightedId(entry.id)}
              onClick={() => activateEntry(entry)}
            >
              {entry.kind === "see-all" ? (
                <span className="text-[9px] font-medium leading-3 text-secondary">{entry.title}</span>
              ) : (
                <>
                  <span className="min-w-0 truncate text-[10px] font-medium leading-4 text-ink">{entry.title}</span>
                  {entry.meta ? (
                    <span className="min-w-0 truncate text-[9px] font-normal leading-3 text-tertiary">{entry.meta}</span>
                  ) : null}
                </>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-[360px] max-w-full" data-library-overview-search="true">
      <SearchInput
        ref={inputRef}
        wrapperClassName="w-full rounded-xs border border-hairline"
        placeholder="Search components and templates"
        aria-label="Search components and templates"
        role="combobox"
        aria-expanded={open}
        aria-controls={LISTBOX_ID}
        aria-activedescendant={highlightedEntry ? optionDomId(highlightedEntry.id) : undefined}
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
        <div
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Library search results"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xs border border-hairline bg-white pb-1 shadow-sm"
          data-library-overview-search-popover="true"
        >
          {hasResults ? (
            <>
              {renderGroup("Components", componentEntries)}
              {renderGroup("Templates", templateEntries)}
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
