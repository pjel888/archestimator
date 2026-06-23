import { type InputHTMLAttributes, useRef, type Ref } from "react";
import { Calendar, X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";
import { CONTROL_INPUT_SURFACE_CLASS } from "./control-input";

export type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  ref?: Ref<HTMLInputElement>;
  invalid?: boolean;
  onClear?: () => void;
};

export function DatePicker({ className, invalid, disabled, value, onChange, onClear, ref, ...props }: DatePickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const hasValue = Boolean(value);

    const setRefs = (node: HTMLInputElement) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      
      if (onClear) {
        onClear();
      } else if (inputRef.current) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        nativeInputValueSetter?.call(inputRef.current, "");
        const event = new Event("input", { bubbles: true });
        inputRef.current.dispatchEvent(event);
        const changeEvent = new Event("change", { bubbles: true });
        inputRef.current.dispatchEvent(changeEvent);
      }
    };

    return (
      <div className={cn("relative flex w-full items-center", className)}>
        <Calendar 
          size={12} 
          weight="regular" 
          className="pointer-events-none absolute left-2 z-10 text-tertiary" 
        />
        <input
          ref={setRefs}
          type="date"
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(
            "w-full rounded-xs border !text-[10px] tracking-normal text-ink outline-none transition",
            CONTROL_INPUT_SURFACE_CLASS,
            "pl-6",
            hasValue ? "pr-6" : "pr-2",
            invalid ? "border-danger text-danger focus:border-danger focus:ring-dangerSoft" : "",
            disabled ? "cursor-not-allowed opacity-50" : "",
            "[&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden",
            "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          )}
          {...props}
        />
        {hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 z-20 grid size-4 place-items-center rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink"
            aria-label="Clear date"
          >
            <X size={10} weight="regular" />
          </button>
        )}
      </div>
    );
}
