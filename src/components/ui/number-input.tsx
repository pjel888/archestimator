import { type InputHTMLAttributes, useRef, type Ref } from "react";
import { CaretUp, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";
import { CONTROL_INPUT_SURFACE_CLASS } from "./control-input";

export type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  ref?: Ref<HTMLInputElement>;
  invalid?: boolean;
};

export function NumberInput({ className, invalid, disabled, min, max, step = 1, value, onChange, ref, ...props }: NumberInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const setRefs = (node: HTMLInputElement) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const handleStep = (direction: 1 | -1) => {
      if (disabled || !inputRef.current) return;
      
      if (direction === 1) {
        inputRef.current.stepUp();
      } else {
        inputRef.current.stepDown();
      }
      
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(inputRef.current, inputRef.current.value);
      const event = new Event("input", { bubbles: true });
      inputRef.current.dispatchEvent(event);
    };

    return (
      <div className={cn("relative flex w-full items-center", className)}>
        <input
          ref={setRefs}
          type="number"
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          aria-invalid={invalid}
          className={cn(
            "w-full rounded-xs border !text-[10px] tracking-normal text-ink outline-none transition",
            CONTROL_INPUT_SURFACE_CLASS,
            "pr-6",
            invalid ? "border-danger text-danger focus:bg-dangerSoft/30" : "",
            disabled ? "cursor-not-allowed opacity-50" : "",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          )}
          {...props}
        />
        <div className="absolute right-1 flex flex-col items-center justify-center gap-[1px]">
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => handleStep(1)}
            className="flex h-3 w-4 items-center justify-center rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Increase value"
          >
            <CaretUp size={8} weight="regular" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => handleStep(-1)}
            className="flex h-3 w-4 items-center justify-center rounded-xs text-tertiary hover:bg-surfaceMuted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Decrease value"
          >
            <CaretDown size={8} weight="regular" />
          </button>
        </div>
      </div>
    );
}
