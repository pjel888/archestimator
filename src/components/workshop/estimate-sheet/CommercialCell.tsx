"use client";

import { useId } from "react";

export type CommercialCellValue = {
  remarks: string;
  quotationRequirement: "not_required" | "required";
  quotationStatus: "not_requested" | "requested" | "available" | "unavailable";
  quotationReference: string;
  vatTreatment: "inclusive" | "exclusive" | "exempt";
  vatRateBps: number;
};

type CommercialCellProps = {
  rowLabel: string;
  value: CommercialCellValue;
  disabled?: boolean;
  pending?: boolean;
  error?: string | null;
  onRemarksCommit: (remarks: string) => void;
  onCommercialChange: (value: Omit<CommercialCellValue, "remarks">) => void;
};

export function CommercialCell({
  rowLabel,
  value,
  disabled = false,
  pending = false,
  error,
  onRemarksCommit,
  onCommercialChange,
}: CommercialCellProps) {
  const remarksId = useId();
  const quotationReferenceId = useId();
  const errorId = useId();
  const controlsDisabled = disabled || pending;
  const commercialValue = {
    quotationRequirement: value.quotationRequirement,
    quotationStatus: value.quotationStatus,
    quotationReference: value.quotationReference,
    vatTreatment: value.vatTreatment,
    vatRateBps: value.vatRateBps,
  };

  return (
    <div
      aria-busy={pending}
      className="grid h-full min-h-24 content-center gap-1 p-1 text-[9px]"
      data-commercial-cell=""
      data-testid="commercial-cell"
    >
      <label className="sr-only" htmlFor={remarksId}>Remarks for {rowLabel}</label>
      <textarea
        id={remarksId}
        key={`remarks:${value.remarks}`}
        defaultValue={value.remarks}
        disabled={controlsDisabled}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        rows={2}
        maxLength={500}
        placeholder="Remarks"
        className="min-h-8 w-full resize-none rounded-xs border border-hairline bg-white px-1 py-0.5 text-[9px] leading-3 text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
        onBlur={(event) => {
          const normalized = event.currentTarget.value.trim();
          event.currentTarget.value = normalized;
          if (normalized !== value.remarks) onRemarksCommit(normalized);
        }}
      />
      <div className="grid grid-cols-2 gap-1">
        <select
          aria-label={`${rowLabel} quotation requirement`}
          value={value.quotationRequirement}
          disabled={controlsDisabled}
          className="h-6 min-w-0 rounded-xs border border-hairline bg-white px-1 text-[9px]"
          onChange={(event) => onCommercialChange({
            ...commercialValue,
            quotationRequirement: event.target.value as CommercialCellValue["quotationRequirement"],
          })}
        >
          <option value="not_required">No quote</option>
          <option value="required">Quote required</option>
        </select>
        <select
          aria-label={`${rowLabel} quotation status`}
          value={value.quotationStatus}
          disabled={controlsDisabled}
          className="h-6 min-w-0 rounded-xs border border-hairline bg-white px-1 text-[9px]"
          onChange={(event) => onCommercialChange({
            ...commercialValue,
            quotationStatus: event.target.value as CommercialCellValue["quotationStatus"],
          })}
        >
          <option value="not_requested">Not requested</option>
          <option value="requested">Requested</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>
      <label className="sr-only" htmlFor={quotationReferenceId}>Quotation reference for {rowLabel}</label>
      <input
        id={quotationReferenceId}
        key={`quotation-reference:${value.quotationReference}`}
        defaultValue={value.quotationReference}
        disabled={controlsDisabled}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        maxLength={160}
        placeholder="Quotation reference"
        className="h-6 min-w-0 rounded-xs border border-hairline bg-white px-1 text-[9px]"
        onBlur={(event) => {
          const normalized = event.currentTarget.value.trim();
          event.currentTarget.value = normalized;
          if (normalized !== value.quotationReference) {
            onCommercialChange({ ...commercialValue, quotationReference: normalized });
          }
        }}
      />
      <div className="grid grid-cols-[1fr_3.5rem] gap-1">
        <select
          aria-label={`${rowLabel} VAT treatment`}
          value={value.vatTreatment}
          disabled={controlsDisabled}
          className="h-6 min-w-0 rounded-xs border border-hairline bg-white px-1 text-[9px]"
          onChange={(event) => {
            const vatTreatment = event.target.value as CommercialCellValue["vatTreatment"];
            onCommercialChange({
              ...commercialValue,
              vatTreatment,
              vatRateBps: vatTreatment === "exempt" ? 0 : commercialValue.vatRateBps || 1200,
            });
          }}
        >
          <option value="inclusive">VAT INC</option>
          <option value="exclusive">VAT EX</option>
          <option value="exempt">VAT Exempt</option>
        </select>
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          aria-label={`${rowLabel} VAT rate percent`}
          value={(value.vatRateBps / 100).toFixed(2)}
          disabled={controlsDisabled || value.vatTreatment === "exempt"}
          className="h-6 min-w-0 rounded-xs border border-hairline bg-white px-1 text-right text-[9px] tabular-nums"
          onChange={(event) => onCommercialChange({
            ...commercialValue,
            vatRateBps: Math.max(0, Math.min(10_000, Math.round(Number(event.target.value || 0) * 100))),
          })}
        />
      </div>
      {pending ? <output aria-live="polite" role="status" className="text-[9px] text-muted">Saving commercial terms</output> : null}
      {error ? <p id={errorId} role="alert" className="text-[9px] leading-3 text-danger">{error}</p> : null}
    </div>
  );
}
