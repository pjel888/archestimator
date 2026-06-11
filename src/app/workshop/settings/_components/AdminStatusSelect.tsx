"use client";

import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { cn } from "@/lib/ui/cn";

/**
 * Client island for the platform-admin settings pages. The beta-users and
 * feedback review pages stay server components; only this value picker
 * hydrates. The hidden native control inside `DropdownSelect` serializes
 * `name=value` into the surrounding form — including the empty string, so
 * GET filter forms still submit `?status=` for the "All statuses" choice
 * and per-row server-action forms keep their exact `FormData` shape.
 */

const ADMIN_STATUS_SELECT_TRIGGER_CLASS =
  "h-7 rounded-xs border border-hairline bg-white px-2 !text-[10px] font-normal leading-3 text-ink focus:border-focus";

export type AdminStatusSelectProps = {
  name: string;
  options: readonly DropdownSelectOption[];
  defaultValue?: string;
  className?: string;
  "aria-label"?: string;
};

export function AdminStatusSelect({
  name,
  options,
  defaultValue,
  className,
  "aria-label": ariaLabel,
}: AdminStatusSelectProps) {
  return (
    <DropdownSelect
      name={name}
      options={options}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      className={cn(ADMIN_STATUS_SELECT_TRIGGER_CLASS, className)}
    />
  );
}
