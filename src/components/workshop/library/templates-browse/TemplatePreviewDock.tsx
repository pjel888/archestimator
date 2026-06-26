"use client";

import { useEffect, useMemo } from "react";
import { Circle, Package, X } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";
import { TREE_ROW_ICON_SIZE } from "@/components/ui/tree";
import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { pesoFormatter } from "@/components/workshop/component-library/helpers";
import {
  summarizeEstimateTemplate,
  type EstimateTemplate,
} from "@/components/workshop/component-library/templates";
import {
  useLibrarySurfaceVariant,
} from "@/components/workshop/library/library-surface-variant";
import { librarySurfaceClass } from "@/components/workshop/library/library-surface-class";
import { SourceTrustChips } from "@/components/workshop/library/source-trust-chips";
import { getTemplateSourceTrustChips } from "@/components/workshop/library/source-trust-model";
import type { EstimateTreeNode } from "@/lib/estimates/types";
import { cn } from "@/lib/ui/cn";
import { buildTemplatePreviewNodeTotals } from "./TemplatePreviewDockModel";

// One neutral node glyph for every node (single-node model).
function NodeKindIcon() {
  return <Circle size={TREE_ROW_ICON_SIZE} weight="regular" className="shrink-0 text-tertiary" aria-hidden="true" />;
}

function StructureOutlineNode({
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
        <StructureOutlineNode key={child.id} node={child} depth={depth + 1} totalsByNodeId={totalsByNodeId} />
      ))}
    </>
  );
}

export type TemplatePreviewDockProps = {
  template: EstimateTemplate;
  onClose: () => void;
  onOpenTemplate: (templateId: string) => void;
  onInsertIntoEstimate: (template: EstimateTemplate) => void;
};

/**
 * Right-dock preview for the Templates browse tab: name, group, structure
 * outline, and template total for the selected template, with the same
 * Open / Insert handoffs as the gallery row. Esc closes; focus returns to
 * the selected row at the call site.
 */
export function TemplatePreviewDock({ template, onClose, onOpenTemplate, onInsertIntoEstimate }: TemplatePreviewDockProps) {
  const surfaceVariant = useLibrarySurfaceVariant();
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
      onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const summary = summarizeEstimateTemplate(template);
  const totalsByNodeId = useMemo(() => buildTemplatePreviewNodeTotals(template.nodes), [template.nodes]);

  return (
    <ResizableSidePanel
      side="right"
      ariaLabel="Template preview dock"
      storageKey="template_preview_dock_width"
      defaultWidth={380}
      minWidth={360}
      maxWidth={560}
    >
      <section
        className={cn("flex h-full min-h-0 flex-col overflow-hidden", librarySurfaceClass(surfaceVariant, "rightDock"))}
        aria-label="Template preview"
        data-template-preview-dock="true"
      >
        <header className={cn("flex h-10 shrink-0 items-center justify-between gap-2 px-2", librarySurfaceClass(surfaceVariant, "railPanelHeader"))}>
          <h2 className="truncate text-[11px] font-medium leading-4 text-ink">Template preview</h2>
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

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <h3 className="text-[12px] font-medium leading-4 text-ink">{template.name}</h3>
          <p className="mt-0.5 truncate text-[9px] leading-3 text-tertiary" title={template.category}>
            {template.category}
          </p>
          {template.description ? (
            <p className="mt-1 text-[9px] leading-4 text-tertiary">{template.description}</p>
          ) : null}
          <SourceTrustChips
            chips={getTemplateSourceTrustChips(template)}
            ariaLabel={`Source trust for ${template.name}`}
            className="mt-2"
          />

          <ul className="mt-3 border-t border-hairline pt-2" aria-label={`${template.name} structure outline`}>
            {template.nodes.length > 0 ? (
              template.nodes.map((node) => (
                <StructureOutlineNode key={node.id} node={node} depth={0} totalsByNodeId={totalsByNodeId} />
              ))
            ) : (
              <li className="py-1 text-[10px] leading-4 text-tertiary">
                No structure yet. Open the template to add Areas.
              </li>
            )}
          </ul>

          <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-hairline pt-2">
            <span className="text-[9px] font-medium leading-3 text-tertiary">Template total</span>
            <span className="text-[12px] font-medium leading-4 tabular-nums text-ink" data-template-preview-total="true">
              {pesoFormatter.format(summary.total)}
            </span>
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-hairline p-2">
          <Button
            type="button"
            variant="primary"
            size="xs"
            className="min-w-0 flex-1 px-2"
            onClick={() => onOpenTemplate(template.id)}
          >
            Open template
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="min-w-0 px-2"
            onClick={() => onInsertIntoEstimate(template)}
          >
            Insert into estimate
          </Button>
        </footer>
      </section>
    </ResizableSidePanel>
  );
}
