"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { adminSearch, type AdminSearchActionOutcome } from "@/lib/admin/search-actions";
import type { AdminSearchKind, AdminSearchResult } from "@/lib/admin/search-repository";

const KIND_LABEL: Record<AdminSearchKind, string> = {
  user: "Users",
  account: "Accounts",
  project: "Projects",
  estimate: "Estimates",
};

/**
 * F1 global command palette. Opens on ⌘K / Ctrl+K (or the trigger button),
 * runs a debounced admin search, and navigates to the chosen entity in one step.
 * Self-contained overlay so it does not depend on shared UI primitives.
 */
export function AdminCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<AdminSearchActionOutcome | null>(null);
  const [active, setActive] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global ⌘K / Ctrl+K to open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus the input whenever the palette opens.
  useEffect(() => {
    if (open) {
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    // Clear state when closed so reopening is clean.
    setQuery("");
    setOutcome(null);
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setOutcome(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        setOutcome(await adminSearch(q));
      });
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  const flat = useMemo(() => (outcome && outcome.ok ? outcome.results : []), [outcome]);

  // Reset active index when the result set changes.
  useEffect(() => setActive(0), [flat]);

  function go(result: AdminSearchResult) {
    setOpen(false);
    router.push(result.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flat[active];
      if (target) go(target);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<AdminSearchKind, AdminSearchResult[]>();
    for (const r of flat) {
      const list = map.get(r.kind) ?? [];
      list.push(r);
      map.set(r.kind, list);
    }
    return map;
  }, [flat]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-7 items-center justify-center gap-1 rounded-xs border border-hairline bg-white px-2 text-[10px] font-medium leading-none text-ink transition hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        aria-label="Open admin search"
      >
        <MagnifyingGlass size={12} weight="regular" aria-hidden="true" />
        Search
        <kbd className="ml-1 rounded-xs border border-hairline px-1 text-[8px] font-medium leading-3 text-tertiary">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 p-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Admin search"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex w-full max-w-xl flex-col overflow-hidden rounded-sm border border-hairline bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-hairline px-2">
              <MagnifyingGlass size={13} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search users, accounts, projects, estimates…"
                className="h-9 w-full bg-transparent text-[11px] text-ink outline-none placeholder:text-tertiary"
                aria-label="Search query"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xs p-1 text-tertiary transition hover:bg-surfaceMuted"
                aria-label="Close search"
              >
                <X size={13} weight="regular" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-1">
              {query.trim().length < 2 ? (
                <p className="px-2 py-3 text-center text-[10px] leading-4 text-tertiary">
                  Type at least 2 characters to search.
                </p>
              ) : isPending ? (
                <p className="px-2 py-3 text-center text-[10px] leading-4 text-tertiary">Searching…</p>
              ) : !outcome || !outcome.ok ? (
                <p className="px-2 py-3 text-center text-[10px] leading-4 text-tertiary">Search unavailable.</p>
              ) : flat.length === 0 ? (
                <p className="px-2 py-3 text-center text-[10px] leading-4 text-tertiary">No matches.</p>
              ) : (
                Array.from(grouped.entries()).map(([kind, items]) => (
                  <div key={kind} className="mb-1">
                    <p className="px-2 py-1 text-[8px] font-medium uppercase leading-3 text-tertiary">
                      {KIND_LABEL[kind]}
                    </p>
                    {items.map((result) => {
                      const index = flat.indexOf(result);
                      const isActive = index === active;
                      return (
                        <button
                          key={`${result.kind}-${result.id}`}
                          type="button"
                          onMouseEnter={() => setActive(index)}
                          onClick={() => go(result)}
                          className={`flex w-full items-center justify-between gap-2 rounded-xs px-2 py-1 text-left text-[10px] leading-4 transition ${
                            isActive ? "bg-surfaceMuted text-ink" : "text-ink"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{result.label}</span>
                            {result.sublabel && (
                              <span className="block truncate text-[9px] text-tertiary">{result.sublabel}</span>
                            )}
                          </span>
                          <span className="shrink-0 text-[8px] uppercase text-tertiary">{result.kind}</span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {outcome && outcome.ok && outcome.degraded && (
              <p className="border-t border-hairline px-2 py-1 text-[8px] leading-3 text-tertiary">
                Partial results — a search source was unavailable.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
