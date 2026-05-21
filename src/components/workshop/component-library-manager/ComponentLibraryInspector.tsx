"use client";

import { X } from "@phosphor-icons/react/dist/ssr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

import { formatCompactDate, formatMoney, getHealthLabel, getKindLabel } from "./helpers";
import type { ComponentLibraryManagerItem, LibraryHealthIssue, LibraryPriceHealth } from "./types";

type ComponentLibraryInspectorProps = {
  item: ComponentLibraryManagerItem;
  onClose: () => void;
  className?: string;
};

const healthTone: Record<LibraryPriceHealth, "success" | "warning" | "danger"> = {
  current: "success",
  "needs-review": "warning",
  stale: "warning",
  missing: "danger",
};

const issueLabels: Record<LibraryHealthIssue, string> = {
  "missing-price": "Missing unit price",
  "missing-source": "Missing pricing source",
  "missing-date": "Missing pricing date",
  "low-confidence": "Low confidence",
  "stale-price": "Stale price",
};

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-hairline px-3 py-2 last:border-b-0">
      <h3 className="mb-1 text-[9px] font-bold uppercase leading-3 tracking-[0.08em] text-tertiary">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-[10px] leading-4">
      <span className="font-semibold text-tertiary">{label}</span>
      <span className={cn("min-w-0 font-bold text-ink", mono ? "font-mono tabular-nums" : "")}>{value}</span>
    </div>
  );
}

function getSafeExternalHref(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function ComponentLibraryInspector({ item, onClose, className }: ComponentLibraryInspectorProps) {
  const healthIssues = item.healthIssues.length > 0 ? item.healthIssues : [];
  const safeSourceHref = getSafeExternalHref(item.sourceUrl);

  return (
    <aside className={cn("flex h-full min-h-0 flex-col bg-white", className)} aria-label={`${item.name} details`}>
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-hairline px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold leading-4 text-ink">{item.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge tone={healthTone[item.health]}>{getHealthLabel(item.health)}</Badge>
            <Badge>{getKindLabel(item.kind)}</Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close inspector" className="size-6 shrink-0" onClick={onClose}>
          <X size={12} weight="bold" aria-hidden="true" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <DetailSection title="Identity">
          <Field label="Category" value={item.category} />
          <Field label="Supplier" value={item.supplier} />
          {item.brand ? <Field label="Brand" value={item.brand} /> : null}
          {item.sku ? <Field label="SKU" value={item.sku} mono /> : null}
        </DetailSection>

        <DetailSection title="Pricing">
          <Field label="Unit" value={item.unit} />
          <Field label="Unit cost" value={formatMoney(item.unitCost)} mono />
          <Field label="Labor default" value={formatMoney(item.laborCost)} mono />
          <Field label="Other default" value={formatMoney(item.supplementaryCost)} mono />
          <Field label="Source" value={item.pricingSource || "No source"} />
          <Field label="Price date" value={formatCompactDate(item.pricingDate)} />
          <Field label="Confidence" value={item.confidence || "Unreviewed"} />
        </DetailSection>

        <DetailSection title="Supplier / Source">
          <Field label="Supplier" value={item.rawSupplier || "No supplier"} />
          {item.sourceUrl ? (
            <Field
              label="Source URL"
              value={
                safeSourceHref ? (
                  <a className="truncate text-accentDark underline-offset-2 hover:underline" href={safeSourceHref} target="_blank" rel="noreferrer">
                    {item.sourceUrl}
                  </a>
                ) : (
                  <span className="truncate text-tertiary">{item.sourceUrl}</span>
                )
              }
            />
          ) : null}
          <Field label="Notes" value={item.notes || "No notes"} />
        </DetailSection>

        <DetailSection title="Description / Spec">
          <p className="text-[10px] font-semibold leading-4 text-secondary">{item.description || "No description provided."}</p>
          {item.discipline || item.designation || item.tags?.length ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {item.discipline ? <Badge tone="accent">{item.discipline}</Badge> : null}
              {item.designation ? <Badge tone="accent">{item.designation}</Badge> : null}
              {item.tags?.map((tag) => <Badge key={tag}>{tag}</Badge>)}
            </div>
          ) : null}
        </DetailSection>

        <DetailSection title="Health">
          {healthIssues.length > 0 ? (
            <ul className="space-y-1">
              {healthIssues.map((issue) => (
                <li key={issue} className="rounded-sm border border-warningSoft bg-warningSoft/50 px-2 py-1 text-[10px] font-semibold leading-4 text-warning">
                  {issueLabels[issue]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-sm border border-successSoft bg-successSoft/50 px-2 py-1 text-[10px] font-semibold leading-4 text-success">Current enough for demo review.</p>
          )}
        </DetailSection>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1 border-t border-hairline px-3 py-2">
        <Button variant="secondary" size="sm" className="h-7 min-h-7" disabled title="Editing library items is not enabled yet.">
          Edit
        </Button>
        <Button variant="secondary" size="sm" className="h-7 min-h-7" disabled title="Duplicate is not enabled yet.">
          Duplicate
        </Button>
        <Button variant="ghost" size="sm" className="h-7 min-h-7" onClick={onClose}>
          Close
        </Button>
      </div>
    </aside>
  );
}
