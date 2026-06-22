"use client";

import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";

export type AddEstimateColumnProps = {
  remainingOptions: DropdownSelectOption[];
  canAdd: boolean;
  onAdd: (estimateId: string) => void;
};

export function AddEstimateColumn({ remainingOptions, canAdd, onAdd }: AddEstimateColumnProps) {
  return (
    <div className="sticky right-0 flex min-w-[132px] self-stretch bg-white/90 pl-2">
      <DropdownSelect
        aria-label="Add estimate to compare"
        options={canAdd ? remainingOptions : []}
        value=""
        onValueChange={onAdd}
        placeholder={canAdd ? "Add estimate" : "All sheets shown"}
        disabled={!canAdd}
        variant="boxed"
        className={`min-h-full w-full rounded-xs border border-dashed text-[10px] ${ADD_BUTTON_CLASSNAME}`}
      />
    </div>
  );
}
