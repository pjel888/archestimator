"use client";

import { X } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { ControlInput } from "@/components/ui/control-input";

import type { NewComponentForm as NewComponentFormType } from "./types";

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="grid gap-1">
      <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-tertiary">
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass = "h-7 border border-hairline bg-white px-2 !text-[10px] font-semibold text-ink outline-none transition focus:border-accent";

export type NewComponentFormProps = {
  form: NewComponentFormType;
  formError: string;
  onChange: (form: NewComponentFormType) => void;
  onSave: () => void;
  onSaveAndAdd: () => void;
  onCancel: () => void;
};

export function NewComponentForm({ form, formError, onChange, onSave, onSaveAndAdd, onCancel }: NewComponentFormProps) {
  const update = (partial: Partial<NewComponentFormType>) => onChange({ ...form, ...partial });

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/20">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-component-title"
        className="flex max-h-[92%] w-full flex-col overflow-hidden border-t border-hairline bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-hairline px-3 py-2">
          <h3 id="new-component-title" className="text-[11px] font-bold text-ink">
            New component
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 rounded-sm p-0 text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label="Cancel new component"
            onClick={onCancel}
          >
            <X size={13} />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3">
          {formError ? (
            <p className="mb-2 border border-dangerSoft bg-dangerSoft p-2 text-[10px] font-bold text-danger">{formError}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Field label="Component name" required>
              <ControlInput className={inputClass} value={form.material} onChange={(e) => update({ material: e.target.value })} autoFocus />
            </Field>
            <Field label="Category" required>
              <ControlInput className={inputClass} value={form.category} onChange={(e) => update({ category: e.target.value })} />
            </Field>
            <Field label="Supplier">
              <ControlInput className={inputClass} value={form.supplier} onChange={(e) => update({ supplier: e.target.value })} />
            </Field>
            <Field label="Unit" required>
              <ControlInput className={inputClass} value={form.unit} onChange={(e) => update({ unit: e.target.value })} />
            </Field>
            <Field label="Base price" required>
              <ControlInput className={inputClass} inputMode="decimal" value={form.itemCost} onChange={(e) => update({ itemCost: e.target.value })} />
            </Field>
            <Field label="Currency">
              <ControlInput className={inputClass} value={form.currency} onChange={(e) => update({ currency: e.target.value })} />
            </Field>
            <Field label="Discipline">
              <ControlInput className={inputClass} value={form.discipline} onChange={(e) => update({ discipline: e.target.value })} />
            </Field>
            <Field label="Designation">
              <ControlInput className={inputClass} value={form.designation} onChange={(e) => update({ designation: e.target.value })} />
            </Field>
            <Field label="Labor default">
              <ControlInput className={inputClass} inputMode="decimal" value={form.laborCost} onChange={(e) => update({ laborCost: e.target.value })} />
            </Field>
            <Field label="Other cost default">
              <ControlInput className={inputClass} inputMode="decimal" value={form.supplementaryCosts} onChange={(e) => update({ supplementaryCosts: e.target.value })} />
            </Field>
            <Field label="SKU / Reference">
              <ControlInput className={inputClass} value={form.sku} onChange={(e) => update({ sku: e.target.value })} />
            </Field>
            <Field label="Source URL">
              <ControlInput className={inputClass} value={form.sourceUrl} onChange={(e) => update({ sourceUrl: e.target.value })} />
            </Field>
            <Field label="Image URL">
              <ControlInput className={inputClass} value={form.imageUrl} onChange={(e) => update({ imageUrl: e.target.value })} />
            </Field>
            <Field label="Tags">
              <ControlInput className={inputClass} value={form.tags} placeholder="tag1, tag2, tag3" onChange={(e) => update({ tags: e.target.value })} />
            </Field>
          </div>
          <div className="mt-2 grid gap-2">
            <Field label="Description">
              <textarea
                className={cn(inputClass, "h-16 resize-none py-1.5")}
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </Field>
            <Field label="Notes">
              <textarea
                className={cn(inputClass, "h-12 resize-none py-1.5")}
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 border-t border-hairline px-3 py-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onSave}>
            Save
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onSaveAndAdd}>
            Save &amp; Add
          </Button>
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/ui/cn";
