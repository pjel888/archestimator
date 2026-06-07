"use client";

import type { ReactNode } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";

import { ControlInput, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/ui/cn";
import { AppModal } from "./modal";

export type CommandItem = {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
};

export type CommandGroup = {
  id: string;
  label: string;
  items: CommandItem[];
};

export type CommandDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  query?: string;
  onQueryChange?: (query: string) => void;
  groups: CommandGroup[];
  loading?: boolean;
  emptyLabel?: string;
};

export function CommandDialog({
  open,
  onOpenChange,
  title = "Command palette",
  description = "Static grouped commands for Storybook review.",
  query = "",
  onQueryChange,
  groups,
  loading,
  emptyLabel = "No commands match",
}: CommandDialogProps) {
  return (
    <AppModal open={open} onOpenChange={onOpenChange} title={title} description={description} size="lg" bodyClassName="space-y-2">
      <CommandMenu query={query} onQueryChange={onQueryChange} groups={groups} loading={loading} emptyLabel={emptyLabel} />
    </AppModal>
  );
}

export function CommandPalette(props: CommandDialogProps) {
  return <CommandDialog {...props} />;
}

type CommandMenuProps = {
  query?: string;
  onQueryChange?: (query: string) => void;
  groups: CommandGroup[];
  loading?: boolean;
  emptyLabel?: string;
};

export function CommandMenu({ query = "", onQueryChange, groups, loading, emptyLabel = "No commands match" }: CommandMenuProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: normalizedQuery
        ? group.items.filter((item) => `${item.label} ${item.description ?? ""}`.toLowerCase().includes(normalizedQuery))
        : group.items,
    }))
    .filter((group) => group.items.length > 0);
  const empty = !loading && filteredGroups.length === 0;

  return (
    <div className="space-y-2">
      <label className="flex h-8 items-center gap-1 rounded-xs border border-hairline bg-white px-2">
        <MagnifyingGlass size={13} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
        <ControlInput
          className={cn(CONTROL_INPUT_SURFACE_CLASS, "h-7 border-0 bg-transparent px-0 focus:ring-0")}
          value={query}
          onChange={(event) => onQueryChange?.(event.target.value)}
          readOnly={!onQueryChange}
          placeholder="Search commands"
          aria-label="Search commands"
        />
      </label>
      {loading ? (
        <div className="space-y-1">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-10/12" />
          <Skeleton className="h-7 w-8/12" />
        </div>
      ) : null}
      {empty ? <EmptyState title={emptyLabel} description="Try a different static command fixture." /> : null}
      {!loading && !empty ? (
        <div className="max-h-72 overflow-auto rounded-xs border border-hairline">
          {filteredGroups.map((group) => (
            <div key={group.id} className="border-b border-hairline last:border-b-0">
              <p className="border-b border-hairline bg-surfaceMuted px-2 py-1 text-[8px] font-medium uppercase leading-3 tracking-normal text-tertiary">
                {group.label}
              </p>
              <div role="listbox" aria-label={group.label}>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    disabled={item.disabled}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] leading-4 tracking-normal text-secondary hover:bg-surfaceMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                    onClick={() => item.onSelect?.()}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{item.label}</span>
                      {item.description ? <span className="block truncate text-[9px] leading-3 text-tertiary">{item.description}</span> : null}
                    </span>
                    {item.shortcut ? <span className="shrink-0 text-[9px] leading-3 text-tertiary">{item.shortcut}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
