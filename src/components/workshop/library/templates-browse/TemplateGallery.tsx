"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, Plus, SquaresFour } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { pesoFormatter } from "@/components/workshop/component-library/helpers";
import {
  filterTemplatesByQuery,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "@/components/workshop/component-library/templates";
import { cn } from "@/lib/ui/cn";

export type TemplatesBrowseStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

function formatCount(count: number, noun: string) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function formatTemplateStructureCounts(template: EstimateTemplate) {
  const summary = summarizeEstimateTemplate(template);
  return `${formatCount(summary.groupCount, "group")} · ${formatCount(summary.areaCount, "area")} · ${formatCount(summary.rowCount, "row")}`;
}

function getTemplateChips(template: EstimateTemplate) {
  const rootNames = template.nodes.slice(0, 2).map((node) => node.name);
  return [template.category, ...rootNames.filter((name) => name !== template.category)].slice(0, 3);
}

function TemplateGalleryRow({
  template,
  selected,
  onSelect,
  onOpen,
  onInsert,
  onRename,
  onDuplicate,
  onRequestDelete,
}: {
  template: EstimateTemplate;
  selected: boolean;
  onSelect: (templateId: string) => void;
  onOpen: (templateId: string) => void;
  onInsert: (template: EstimateTemplate) => void;
  onRename: (template: EstimateTemplate) => void;
  onDuplicate: (template: EstimateTemplate) => void;
  onRequestDelete: (template: EstimateTemplate) => void;
}) {
  const summary = summarizeEstimateTemplate(template);

  return (
    <li
      data-template-gallery-row={template.id}
      className={cn(
        "cursor-pointer rounded-xs border bg-white px-3 py-2 transition",
        selected ? "border-ink" : "border-hairline hover:border-divider",
      )}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, [role='menu']")) return;
        onSelect(template.id);
      }}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a, input, [role='menu']")) return;
        onOpen(template.id);
      }}
    >
      <div className="flex items-baseline gap-2">
        <h3 className="min-w-0 truncate text-[11px] font-medium leading-4 text-ink">
          <button
            type="button"
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            data-template-row-preview={template.id}
            aria-label={`Preview ${template.name}`}
            onClick={() => onSelect(template.id)}
          >
            {template.name}
          </button>
        </h3>
        <p className="min-w-0 shrink-0 text-[9px] leading-3 text-tertiary">{formatTemplateStructureCounts(template)}</p>
        <span className="ml-auto shrink-0 text-[11px] font-medium leading-4 tabular-nums text-ink">
          {pesoFormatter.format(summary.total)}
        </span>
      </div>
      {template.description ? (
        <p className="mt-0.5 truncate text-[9px] leading-4 text-tertiary" title={template.description}>
          {template.description}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-1">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {getTemplateChips(template).map((chip) => (
            <span
              key={chip}
              className="max-w-40 truncate rounded-xs border border-hairline bg-surfaceMuted px-1 py-0.5 text-[8px] font-normal leading-3 text-secondary"
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="primary"
            size="xs"
            className="min-h-6 min-w-0 px-2"
            aria-label={`Open ${template.name}`}
            onClick={() => onOpen(template.id)}
          >
            Open
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="min-h-6 min-w-0 px-2"
            aria-label={`Insert ${template.name} into estimate`}
            onClick={() => onInsert(template)}
          >
            Insert into estimate
            <CaretDown size={10} weight="regular" aria-hidden="true" className="ml-1" />
          </Button>
          <DropdownMenu
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6 rounded-xs p-0 text-tertiary"
                aria-label={`${template.name} actions`}
              >
                <span aria-hidden="true">⋯</span>
              </Button>
            }
            align="end"
          >
            <DropdownMenu.Item label="Rename" onClick={() => onRename(template)} />
            <DropdownMenu.Item label="Duplicate" onClick={() => onDuplicate(template)} />
            <DropdownMenu.Item label="Delete" destructive onClick={() => onRequestDelete(template)} />
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}

export type TemplateGalleryProps = {
  scopeLabel: string;
  templates: EstimateTemplate[];
  totalTemplateCount: number;
  selectedTemplateId: string | null;
  status: TemplatesBrowseStatus;
  onSelectTemplate: (templateId: string) => void;
  onOpenTemplate: (templateId: string) => void;
  onInsertIntoEstimate: (template: EstimateTemplate) => void;
  onRenameTemplate: (template: EstimateTemplate) => void;
  onDuplicateTemplate: (template: EstimateTemplate) => void;
  onRequestDeleteTemplate: (template: EstimateTemplate) => void;
  onNewTemplate: () => void;
};

/**
 * Center sheet of the Templates browse tab: one `TreePanelHeader` toolbar
 * (search disclosure + the labeled New template action), a text-only context
 * strip with singular-correct counts, and template rows with real actions.
 */
export function TemplateGallery({
  scopeLabel,
  templates,
  totalTemplateCount,
  selectedTemplateId,
  status,
  onSelectTemplate,
  onOpenTemplate,
  onInsertIntoEstimate,
  onRenameTemplate,
  onDuplicateTemplate,
  onRequestDeleteTemplate,
  onNewTemplate,
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const visibleTemplates = useMemo(
    () => filterTemplatesByQuery(templates, searchQuery),
    [searchQuery, templates],
  );

  useEffect(() => {
    function handleSearchShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
      event.preventDefault();
      setSearchOpen(true);
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }

    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  return (
    <section
      id="template-gallery-center-column"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white !text-[10px]"
      data-template-gallery="true"
      aria-label="Template content"
    >
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur" aria-label="Template content controls">
        <TreePanelHeader
          className="static z-auto bg-transparent"
          ariaLabel="Template content tools"
          labelPrefix="template content"
          searchValue={searchQuery}
          onSearchValueChange={setSearchQuery}
          searchPlaceholder="Search templates"
          searchLabel="Search templates"
          searchOpen={searchOpen}
          onSearchOpenChange={setSearchOpen}
          searchInputRef={searchInputRef}
          showDefaultActions={false}
          addActions={[
            {
              label: "New template",
              visibleLabel: "New template",
              showVisibleLabel: true,
              icon: <Plus size={12} weight="regular" aria-hidden="true" />,
              onClick: onNewTemplate,
            },
          ]}
        />
        <div
          className="flex h-7 shrink-0 items-center justify-between gap-2 border-b border-hairline px-2"
          data-template-sheet-context-strip="true"
        >
          <p className="truncate text-[10px] font-normal leading-4 text-secondary">
            {scopeLabel} · {formatCount(templates.length, "template")}
          </p>
          <p aria-live="polite" className="shrink-0 text-[9px] leading-3 text-tertiary">
            {searchQuery
              ? `${visibleTemplates.length} of ${templates.length} match "${searchQuery}"`
              : "Sorted by group"}
          </p>
        </div>
        {status.state !== "idle" ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "border-b border-hairline px-2 py-1 text-[10px] leading-4",
              status.state === "error" ? "text-danger" : "text-tertiary",
            )}
          >
            {status.message}
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {visibleTemplates.length > 0 ? (
          <ul className="flex flex-col gap-1.5" aria-label={`${scopeLabel} template rows`}>
            {visibleTemplates.map((template) => (
              <TemplateGalleryRow
                key={template.id}
                template={template}
                selected={selectedTemplateId === template.id}
                onSelect={onSelectTemplate}
                onOpen={onOpenTemplate}
                onInsert={onInsertIntoEstimate}
                onRename={onRenameTemplate}
                onDuplicate={onDuplicateTemplate}
                onRequestDelete={onRequestDeleteTemplate}
              />
            ))}
          </ul>
        ) : totalTemplateCount === 0 ? (
          <EmptyState
            icon={<SquaresFour size={18} weight="regular" aria-hidden="true" />}
            title="No templates yet"
            description="Create a template from scratch, or save any estimate group as a template from the estimate page."
            action={
              <Button type="button" variant="primary" size="xs" className="min-w-0 px-2" onClick={onNewTemplate}>
                New template
              </Button>
            }
            className="h-full border-0 bg-white"
          />
        ) : searchQuery ? (
          <EmptyState
            icon={<SquaresFour size={18} weight="regular" aria-hidden="true" />}
            title={scopeLabel}
            description={`No templates match "${searchQuery}".`}
            action={
              <Button
                type="button"
                variant="secondary"
                size="xs"
                className="min-w-0 px-2"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
              >
                Clear search
              </Button>
            }
            className="h-full border-0 bg-white"
          />
        ) : (
          <EmptyState
            icon={<SquaresFour size={18} weight="regular" aria-hidden="true" />}
            title={scopeLabel}
            description="No templates in this group yet."
            action={
              <Button type="button" variant="primary" size="xs" className="min-w-0 px-2" onClick={onNewTemplate}>
                New template
              </Button>
            }
            className="h-full border-0 bg-white"
          />
        )}
      </div>
    </section>
  );
}
