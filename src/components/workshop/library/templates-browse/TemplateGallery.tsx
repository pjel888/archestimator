"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Circle, DotsThree, Package, Plus, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { TreePanelHeader } from "@/components/ui/tree-panel-header";
import { TREE_ROW_ICON_SIZE } from "@/components/ui/tree";
import { pesoFormatter } from "@/components/workshop/component-library/helpers";
import {
  filterTemplatesByQuery,
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "@/components/workshop/component-library/templates";
import {
  useLibrarySurfaceVariant,
} from "@/components/workshop/library/library-surface-variant";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-class";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import { buildTemplatePreviewNodeTotals } from "./TemplatePreviewDockModel";

export type TemplatesBrowseStatus =
  | { state: "idle" }
  | { state: "saving"; message: string }
  | { state: "saved"; message: string }
  | { state: "error"; message: string };

function formatCount(count: number, noun: string) {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

type EstimateTemplateSummary = ReturnType<typeof summarizeEstimateTemplate>;

function formatTemplateStructureCounts(summary: EstimateTemplateSummary) {
  // One node type: groups + areas read as a single "areas" count.
  return `${formatCount(summary.groupCount + summary.areaCount, "area")} · ${formatCount(summary.rowCount, "row")}`;
}

function getTemplateChips(template: EstimateTemplate) {
  const rootNames = template.nodes.slice(0, 2).map((node) => node.name);
  return [template.category, ...rootNames.filter((name) => name !== template.category)].slice(0, 3);
}

function NodeKindIcon() {
  return <Circle size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}

function SelectedTemplateStructureNode({
  node,
  depth,
  totalsByNodeId,
}: {
  node: EstimateTreeNode;
  depth: number;
  totalsByNodeId: ReadonlyMap<string, number>;
}) {
  return (
    <>
      <li
        className="flex min-h-6 items-center gap-1.5 py-0.5"
        style={{ paddingLeft: `${depth * 12}px` }}
        data-template-preview-node={node.id}
      >
        <NodeKindIcon />
        <span className="min-w-0 flex-1 truncate text-[10px] leading-4 text-ink">{node.name}</span>
        <span className="shrink-0 text-[9px] leading-3 tabular-nums text-tertiary">
          {pesoFormatter.format(totalsByNodeId.get(node.id) ?? 0)}
        </span>
      </li>
      {(node.estimateRowItems ?? []).map((row) => (
        <li
          key={row.id}
          className="flex min-h-6 items-center gap-1.5 py-0.5"
          style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        >
          <Package size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[10px] leading-4 text-secondary">{row.name ?? row.material}</span>
          <span className="shrink-0 text-[9px] leading-3 tabular-nums text-tertiary">
            {row.quantity} {row.unit}
          </span>
        </li>
      ))}
      {(node.children ?? []).map((child) => (
        <SelectedTemplateStructureNode key={child.id} node={child} depth={depth + 1} totalsByNodeId={totalsByNodeId} />
      ))}
    </>
  );
}

function SelectedTemplatePreview({
  template,
  onClose,
  onOpen,
  onInsert,
}: {
  template: EstimateTemplate;
  onClose: () => void;
  onOpen: (templateId: string) => void;
  onInsert: (template: EstimateTemplate) => void;
}) {
  const surfaceVariant = useLibrarySurfaceVariant();
  const summary = summarizeEstimateTemplate(template);
  const totalsByNodeId = useMemo(() => buildTemplatePreviewNodeTotals(template.nodes), [template.nodes]);

  return (
    <section
      className={cn("m-2 mb-0 shrink-0 overflow-hidden", librarySurfaceClass(surfaceVariant, "contentTile"))}
      aria-label="Template preview"
      data-template-center-preview="true"
    >
      <header className="flex min-h-8 items-start gap-2 border-b border-hairline px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[12px] font-medium leading-4 text-ink">{template.name}</h3>
          <p className="mt-0.5 truncate text-[9px] leading-3 text-tertiary" title={template.category}>
            {template.category}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-6 rounded-xs p-0 text-tertiary"
          aria-label="Close template preview"
          onClick={onClose}
        >
          <X size={11} weight="regular" aria-hidden="true" />
        </Button>
      </header>

      <div className="max-h-[36vh] overflow-y-auto px-2 py-2">
        {template.description ? (
          <p className="mb-2 text-[9px] leading-4 text-tertiary">{template.description}</p>
        ) : null}
        <ul className="border-t border-hairline pt-2" aria-label={`${template.name} structure outline`}>
          {template.nodes.length > 0 ? (
            template.nodes.map((node) => (
              <SelectedTemplateStructureNode key={node.id} node={node} depth={0} totalsByNodeId={totalsByNodeId} />
            ))
          ) : (
            <li className="py-1 text-[10px] leading-4 text-tertiary">
              No structure yet. Open the template to add Areas.
            </li>
          )}
        </ul>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-hairline px-2 py-1.5">
        <div className="mr-auto min-w-0">
          <p className="text-[9px] font-medium leading-3 text-tertiary">Template total</p>
          <p className="text-[12px] font-medium leading-4 tabular-nums text-ink" data-template-preview-total="true">
            {pesoFormatter.format(summary.total)}
          </p>
        </div>
        <Button type="button" variant="primary" size="xs" className="min-w-0 px-2" onClick={() => onOpen(template.id)}>
          Open template
        </Button>
        <Button type="button" variant="secondary" size="xs" className="min-w-0 px-2" onClick={() => onInsert(template)}>
          Insert into estimate
        </Button>
      </footer>
    </section>
  );
}

const TemplateGalleryRow = memo(function TemplateGalleryRow({
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
  const surfaceVariant = useLibrarySurfaceVariant();
  const summary = summarizeEstimateTemplate(template);

  return (
    <li
      data-template-gallery-row={template.id}
      className={cn(
        "px-3 py-2 transition",
        librarySurfaceClass(surfaceVariant, "contentTile"),
        selected ? "border-ink" : surfaceVariant === "glass" ? "hover:border-white/80 hover:bg-white/90" : "hover:border-divider",
      )}
    >
      <div className="flex items-baseline gap-2">
        <h3 className="min-w-0 truncate text-[11px] font-medium leading-4 text-ink">
          <button
            type="button"
            className="cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            data-template-row-preview={template.id}
            aria-label={`Preview ${template.name}`}
            onClick={() => onSelect(template.id)}
            onDoubleClick={() => onOpen(template.id)}
          >
            {template.name}
          </button>
        </h3>
        <p className="min-w-0 shrink-0 text-[9px] leading-3 text-tertiary">{formatTemplateStructureCounts(summary)}</p>
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
          </Button>
          <DropdownMenu
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-6 rounded-xs p-0 text-tertiary"
                aria-label={`${template.name} actions`}
              >
                <DotsThree size={12} weight="regular" aria-hidden="true" />
              </Button>
            }
            align="end"
          >
            <DropdownMenu.Item label="Rename" onClick={() => onRename(template)} />
            <DropdownMenu.Item label="Duplicate" onClick={() => onDuplicate(template)} />
            <DropdownMenu.Item label="Archive" onClick={() => onRequestDelete(template)} />
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
});

export type TemplateGalleryProps = {
  scopeLabel: string;
  templates: EstimateTemplate[];
  selectedTemplateId: string | null;
  selectedTemplate?: EstimateTemplate | null;
  status: TemplatesBrowseStatus;
  onSelectTemplate: (templateId: string) => void;
  onClosePreview: () => void;
  onOpenTemplate: (templateId: string) => void;
  onInsertIntoEstimate: (template: EstimateTemplate) => void;
  onRenameTemplate: (template: EstimateTemplate) => void;
  onDuplicateTemplate: (template: EstimateTemplate) => void;
  onRequestDeleteTemplate: (template: EstimateTemplate) => void;
  onNewTemplate: () => void;
  onOpenArchived: () => void;
};

/**
 * Center sheet of the Templates browse tab: one `TreePanelHeader` toolbar
 * (search disclosure + the labeled New template action), a text-only context
 * strip with singular-correct counts, and template rows with real actions.
 */
export function TemplateGallery({
  scopeLabel,
  templates,
  selectedTemplateId,
  selectedTemplate = null,
  status,
  onSelectTemplate,
  onClosePreview,
  onOpenTemplate,
  onInsertIntoEstimate,
  onRenameTemplate,
  onDuplicateTemplate,
  onRequestDeleteTemplate,
  onNewTemplate,
  onOpenArchived,
}: TemplateGalleryProps) {
  const surfaceVariant = useLibrarySurfaceVariant();
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
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden !text-[10px]",
        librarySurfaceClass(surfaceVariant, "centerColumn"),
      )}
      data-template-gallery="true"
      aria-label="Template content"
    >
      <header className={cn("sticky top-0 z-20", librarySurfaceClass(surfaceVariant, "sheetHeader"))} aria-label="Template content controls">
        <TreePanelHeader
          className={cn("static z-auto bg-transparent", librarySurfaceClass(surfaceVariant, "railPanelHeader"))}
          toolbarClassName={librarySurfaceClass(surfaceVariant, "toolbar")}
          showToolbarBottomBorder={surfaceVariant !== "glass"}
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
              label: "Archived Templates",
              visibleLabel: "Archived",
              showVisibleLabel: true,
              icon: null,
              onClick: onOpenArchived,
            },
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
          className={cn(
            "flex h-7 shrink-0 items-center justify-between gap-2 px-2",
            librarySurfaceClass(surfaceVariant, "contextStrip"),
          )}
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
          <output
            aria-live="polite"
            className={cn(
              "border-b border-hairline px-2 py-1 text-[10px] leading-4",
              status.state === "error" ? "text-danger" : "text-tertiary",
            )}
          >
            {status.message}
          </output>
        ) : null}
      </header>

      {selectedTemplate ? (
        <SelectedTemplatePreview
          template={selectedTemplate}
          onClose={onClosePreview}
          onOpen={onOpenTemplate}
          onInsert={onInsertIntoEstimate}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto p-2">
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
      </div>
    </section>
  );
}
