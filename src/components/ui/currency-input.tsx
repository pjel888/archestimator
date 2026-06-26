import { useState, type InputHTMLAttributes, type ChangeEvent, type FocusEvent, type Ref } from "react";
import { cn } from "@/lib/ui/cn";
import { CONTROL_INPUT_SURFACE_CLASS } from "./control-input";

export type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  ref?: Ref<HTMLInputElement>;
  value?: number | null;
  onChange?: (value: number | null) => void;
  currency?: string;
  locale?: string;
  invalid?: boolean;
};

const currencyInputNumberFormatters: Record<string, Intl.NumberFormat> = {
  "en-PH": new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
  "en-US": new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
};

function formatCurrencyInputValue(value: number | null | undefined, locale: string) {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return (currencyInputNumberFormatters[locale] ?? currencyInputNumberFormatters["en-US"]).format(value);
}

export function CurrencyInput({ className, value, onChange, currency = "₱", locale = "en-US", invalid, disabled, onFocus, onBlur, ref, ...props }: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [draftValue, setDraftValue] = useState<string>("");
  const displayValue = isFocused ? draftValue : formatCurrencyInputValue(value, locale);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDraftValue(val);

    if (val === "") {
      onChange?.(null);
      return;
    }

    if (val === "-" || val === "." || val === "-.") {
      return;
    }

    const parsed = parseFloat(val);
    if (!Number.isNaN(parsed)) {
      onChange?.(parsed);
    }
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setDraftValue(value === null || value === undefined || Number.isNaN(value) ? "" : value.toString());
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);

    if (draftValue === "-" || draftValue === "." || draftValue === "-.") {
      onChange?.(null);
    }

    onBlur?.(e);
  };

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <div className="pointer-events-none absolute left-2 flex items-center justify-center text-[10px] font-medium text-tertiary">
        {currency}
      </div>
      <input
        ref={ref}
        type={isFocused ? "number" : "text"}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        aria-invalid={invalid}
        className={cn(
          "w-full rounded-xs border !text-[10px] tracking-normal text-ink outline-none transition tabular-nums",
          CONTROL_INPUT_SURFACE_CLASS,
          "pl-6",
          invalid ? "border-danger text-danger focus:border-danger focus-visible:ring-danger/40" : "",
          disabled ? "cursor-not-allowed opacity-50" : "",
          isFocused ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" : ""
        )}
        {...props}
      />
    </div>
  );
}
