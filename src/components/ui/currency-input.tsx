import { forwardRef, useState, useEffect, type InputHTMLAttributes, type ChangeEvent, type FocusEvent } from "react";
import { cn } from "@/lib/ui/cn";
import { CONTROL_INPUT_SURFACE_CLASS } from "./control-input";

export type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value?: number | null;
  onChange?: (value: number | null) => void;
  currency?: string;
  locale?: string;
  invalid?: boolean;
};

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, currency = "₱", locale = "en-US", invalid, disabled, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localValue, setLocalValue] = useState<string>("");

    useEffect(() => {
      if (!isFocused) {
        if (value === null || value === undefined || Number.isNaN(value)) {
          setLocalValue("");
        } else {
          setLocalValue(
            new Intl.NumberFormat(locale, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(value)
          );
        }
      } else {
        setLocalValue(value === null || value === undefined ? "" : value.toString());
      }
    }, [value, isFocused, locale]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      
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
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      if (localValue === "-" || localValue === "." || localValue === "-.") {
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
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(
            "w-full rounded-xs border !text-[10px] tracking-normal text-ink outline-none transition tabular-nums",
            CONTROL_INPUT_SURFACE_CLASS,
            "pl-6",
            invalid ? "border-danger text-danger focus:border-danger focus:ring-dangerSoft" : "",
            disabled ? "cursor-not-allowed opacity-50" : "",
            isFocused ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" : ""
          )}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
