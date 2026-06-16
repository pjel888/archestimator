"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput, ControlTextarea } from "@/components/ui/control-input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Sheet } from "@/components/ui/overlays/sheet-drawer";
import {
  changeCostLibraryComponentLifecycleState,
  updateCostLibraryComponent,
  upsertCostLibraryComponentPriceOption,
} from "@/lib/component-library/actions";
import type { ComponentLifecycleState, EstimateRowItem } from "@/lib/estimates/types";

const LIFECYCLE_OPTIONS: Array<{ value: ComponentLifecycleState; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "in_production", label: "In production" },
  { value: "available", label: "Available" },
  { value: "discontinued", label: "Discontinued" },
  { value: "archived", label: "Archived" },
];

type EditComponentFormState = {
  name: string;
  description: string;
  unit: string;
  supplier: string;
  brand: string;
  lifecycleState: ComponentLifecycleState;
  unitCost: string;
  miscCost: string;
  pricingDate: string;
  pricingSource: string;
  confidence: string;
};

function buildFormState(item: EstimateRowItem): EditComponentFormState {
  return {
    name: item.name?.trim() || item.material,
    description: item.description ?? "",
    unit: item.unit,
    supplier: item.supplier ?? "",
    brand: item.brand ?? "",
    lifecycleState: item.lifecycleState ?? "available",
    unitCost: String(item.itemCost ?? 0),
    miscCost: String(item.miscCost ?? 0),
    pricingDate: item.pricingDate ?? "",
    pricingSource: item.pricingSource ?? "",
    confidence: item.confidence ?? "",
  };
}

/**
 * Focused versioned edit flow for a library component (Phase 1.5): writes
 * identity fields through `update_cost_library_component` and price changes
 * through `upsert_cost_library_component_price_option` — the same hardened
 * RPC path the add flow uses.
 */
export function EditComponentDrawer({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item: EstimateRowItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (patch: Partial<EstimateRowItem> & { id: string }) => void;
}) {
  const [form, setForm] = useState<EditComponentFormState>(() => buildFormState(item));
  const [formItemId, setFormItemId] = useState(item.id);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  // Re-seed the form when the inspector moves to another component.
  if (item.id !== formItemId) {
    setFormItemId(item.id);
    setForm(buildFormState(item));
    setError(null);
  }

  const defaultPriceOption = useMemo(
    () =>
      (item.priceOptions ?? []).find((option) => option.isDefault && option.isActive) ??
      (item.priceOptions ?? []).find((option) => option.isActive) ??
      null,
    [item.priceOptions],
  );

  function setField<K extends keyof EditComponentFormState>(key: K, value: EditComponentFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const name = form.name.trim();
    const unit = form.unit.trim();
    if (!name) {
      setError("Component name is required.");
      return;
    }
    if (!unit) {
      setError("Unit is required.");
      return;
    }
    const unitCost = Number(form.unitCost);
    const miscCost = Number(form.miscCost || "0");
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setError("Unit cost must be a non-negative number.");
      return;
    }
    if (!Number.isFinite(miscCost) || miscCost < 0) {
      setError("Misc cost must be a non-negative number.");
      return;
    }

    const priceChanged =
      unitCost !== item.itemCost ||
      miscCost !== item.miscCost ||
      unit !== item.unit ||
      form.pricingDate.trim() !== (item.pricingDate ?? "") ||
      form.pricingSource.trim() !== (item.pricingSource ?? "") ||
      form.confidence.trim() !== (item.confidence ?? "");
    const supplier = form.supplier.trim();
    const brand = form.brand.trim();
    const supplierId = supplier && supplier === (item.supplier ?? "").trim() ? item.supplierId ?? null : null;
    const brandId = brand && brand === (item.brand ?? "").trim() ? item.brandId ?? null : null;
    const lifecycleChanged = form.lifecycleState !== (item.lifecycleState ?? "available");

    startSaving(async () => {
      try {
        await updateCostLibraryComponent(item.id, {
          name,
          description: form.description.trim(),
          unit,
          supplier: supplier || null,
          supplierId,
          brand: brand || null,
          brandId,
          category: item.category,
          categoryNodeId: item.categoryNodeId ?? null,
          libraryFolderId: item.libraryFolderId ?? null,
          lifecycleState: form.lifecycleState,
          changeReason: "Edited from the component inspector",
        });

        if (lifecycleChanged) {
          await changeCostLibraryComponentLifecycleState({
            itemId: item.id,
            lifecycleState: form.lifecycleState,
            changeReason: "Edited from the component inspector",
          });
        }

        if (priceChanged) {
          await upsertCostLibraryComponentPriceOption(item.id, {
            id: defaultPriceOption?.id,
            label: defaultPriceOption?.label ?? name,
            unit,
            unitCost,
            miscCost,
            pricingDate: form.pricingDate.trim() || undefined,
            pricingSource: form.pricingSource.trim() || undefined,
            confidence: form.confidence.trim() || undefined,
            isDefault: true,
            changeReason: "Edited from the component inspector",
          });
        }

        onSaved({
          id: item.id,
          name,
          material: name,
          description: form.description.trim(),
          unit,
          supplier,
          supplierId: supplierId ?? undefined,
          brand: brand || undefined,
          brandId: brandId ?? undefined,
          lifecycleState: form.lifecycleState,
          itemCost: unitCost,
          miscCost,
          pricingDate: form.pricingDate.trim(),
          pricingSource: form.pricingSource.trim(),
          confidence: form.confidence.trim() || undefined,
        });
        onOpenChange(false);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save the component.");
      }
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      size="md"
      title="Edit component"
      description="Changes create a new component version; estimates keep their captured prices."
    >
      <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          <ControlField label="Name" required>
            <ControlInput value={form.name} onChange={(event) => setField("name", event.target.value)} required />
          </ControlField>
          <ControlField label="Description">
            <ControlTextarea
              rows={3}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </ControlField>
          <div className="grid grid-cols-2 gap-2">
            <ControlField label="Supplier">
              <ControlInput value={form.supplier} onChange={(event) => setField("supplier", event.target.value)} />
            </ControlField>
            <ControlField label="Brand">
              <ControlInput value={form.brand} onChange={(event) => setField("brand", event.target.value)} />
            </ControlField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ControlField label="Lifecycle" as="div">
              <DropdownSelect
                aria-label="Lifecycle state"
                options={LIFECYCLE_OPTIONS}
                value={form.lifecycleState}
                onValueChange={(value) => setField("lifecycleState", value as ComponentLifecycleState)}
              />
            </ControlField>
            <ControlField label="Unit" required>
              <ControlInput value={form.unit} onChange={(event) => setField("unit", event.target.value)} required />
            </ControlField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ControlField label="Unit cost" required>
              <ControlInput
                type="number"
                min={0}
                step="0.01"
                align="right"
                value={form.unitCost}
                onChange={(event) => setField("unitCost", event.target.value)}
                required
              />
            </ControlField>
            <ControlField label="Misc cost">
              <ControlInput
                type="number"
                min={0}
                step="0.01"
                align="right"
                value={form.miscCost}
                onChange={(event) => setField("miscCost", event.target.value)}
              />
            </ControlField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ControlField label="Pricing date">
              <ControlInput
                type="date"
                value={form.pricingDate}
                onChange={(event) => setField("pricingDate", event.target.value)}
              />
            </ControlField>
            <ControlField label="Confidence">
              <ControlInput
                value={form.confidence}
                placeholder="high, medium, low…"
                onChange={(event) => setField("confidence", event.target.value)}
              />
            </ControlField>
          </div>
          <ControlField label="Pricing source">
            <ControlInput
              value={form.pricingSource}
              onChange={(event) => setField("pricingSource", event.target.value)}
            />
          </ControlField>
          {error ? (
            <p role="alert" className="text-[9px] leading-3 text-danger">
              {error}
            </p>
          ) : null}
        </div>
        <div className="mt-2 flex shrink-0 items-center justify-end gap-2 border-t border-hairline pt-2">
          <Button type="button" variant="secondary" size="xs" className="min-w-0 px-2" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="xs" className="min-w-0 px-2" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
