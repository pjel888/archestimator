"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ControlField, ControlInput, ControlTextarea } from "@/components/ui/control-input";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Sheet } from "@/components/ui/overlays/sheet-drawer";
import { updateCostLibraryComponent } from "@/lib/component-library/actions";
import { validateQuickAddComponentInput } from "@/lib/component-library/quick-add-validation";
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
  };
}

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

  const componentCategory = item.category?.trim() || "Component";
  const validation = useMemo(() => validateQuickAddComponentInput({
    name: form.name,
    category: componentCategory,
    unit: form.unit,
    unitCost: form.unitCost,
    miscCost: form.miscCost,
    supplier: form.supplier,
    brand: form.brand,
    pricingDate: form.pricingDate,
    pricingSource: form.pricingSource,
    libraryFolderId: item.libraryFolderId ?? null,
  }), [
    componentCategory,
    form.brand,
    form.miscCost,
    form.name,
    form.pricingDate,
    form.pricingSource,
    form.supplier,
    form.unit,
    form.unitCost,
    item.libraryFolderId,
  ]);

  function setField<K extends keyof EditComponentFormState>(key: K, value: EditComponentFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const firstError = Object.values(validation.errors)[0];
    if (firstError) {
      setError(firstError);
      return;
    }
    const normalized = validation.normalized;
    const name = normalized.name ?? form.name.trim();
    const unit = normalized.unit ?? form.unit.trim();
    const unitCost = normalized.unitCost ?? Number(form.unitCost);
    const miscCost = normalized.miscCost ?? Number(form.miscCost || "0");
    const pricingDate = normalized.pricingDate ?? "";
    const pricingSource = normalized.pricingSource ?? "";
    const supplier = normalized.supplier ?? "";
    const brand = normalized.brand ?? "";

    startSaving(async () => {
      try {
        await updateCostLibraryComponent(item.id, {
          name,
          description: form.description.trim(),
          unit,
          supplier,
          supplierId: item.supplierId ?? null,
          brand,
          brandId: item.brandId ?? null,
          category: componentCategory,
          categoryNodeId: item.categoryNodeId ?? null,
          libraryFolderId: item.libraryFolderId ?? null,
          lifecycleState: form.lifecycleState,
          unitCost,
          miscCost,
          pricingDate: pricingDate || null,
          pricingSource: pricingSource || null,
          changeReason: "Edited from the component inspector",
        });

        onSaved({
          id: item.id,
          name,
          material: name,
          description: form.description.trim(),
          unit,
          supplier,
          brand: brand || undefined,
          lifecycleState: form.lifecycleState,
          itemCost: unitCost,
          miscCost,
          pricingDate,
          pricingSource,
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
      description="Changes create a new component version and update every linked estimate instance."
    >
      <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmit}>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          <ControlField label="Name" required errorText={validation.errors.name}>
            <ControlInput
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              required
              invalid={Boolean(validation.errors.name)}
            />
          </ControlField>
          <ControlField label="Description">
            <ControlTextarea
              rows={3}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </ControlField>
          <div className="grid grid-cols-2 gap-2">
            <ControlField label="Supplier" errorText={validation.errors.supplier}>
              <ControlInput
                value={form.supplier}
                onChange={(event) => setField("supplier", event.target.value)}
                invalid={Boolean(validation.errors.supplier)}
              />
            </ControlField>
            <ControlField label="Brand" errorText={validation.errors.brand}>
              <ControlInput
                value={form.brand}
                onChange={(event) => setField("brand", event.target.value)}
                invalid={Boolean(validation.errors.brand)}
              />
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
            <ControlField label="Unit" required errorText={validation.errors.unit}>
              <ControlInput
                value={form.unit}
                onChange={(event) => setField("unit", event.target.value)}
                required
                invalid={Boolean(validation.errors.unit)}
              />
            </ControlField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ControlField label="Unit cost" required errorText={validation.errors.unitCost}>
              <ControlInput
                type="number"
                min={0}
                step="0.01"
                align="right"
                value={form.unitCost}
                onChange={(event) => setField("unitCost", event.target.value)}
                required
                invalid={Boolean(validation.errors.unitCost)}
              />
            </ControlField>
            <ControlField label="Misc cost" errorText={validation.errors.miscCost}>
              <ControlInput
                type="number"
                min={0}
                step="0.01"
                align="right"
                value={form.miscCost}
                onChange={(event) => setField("miscCost", event.target.value)}
                invalid={Boolean(validation.errors.miscCost)}
              />
            </ControlField>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ControlField label="Pricing date" errorText={validation.errors.pricingDate}>
              <ControlInput
                type="date"
                value={form.pricingDate}
                onChange={(event) => setField("pricingDate", event.target.value)}
                invalid={Boolean(validation.errors.pricingDate)}
              />
            </ControlField>
          </div>
          <ControlField label="Pricing source" errorText={validation.errors.pricingSource}>
            <ControlInput
              value={form.pricingSource}
              onChange={(event) => setField("pricingSource", event.target.value)}
              invalid={Boolean(validation.errors.pricingSource)}
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
