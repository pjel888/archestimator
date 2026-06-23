import { type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/ui/cn";

export type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "onChange"> & {
  ref?: Ref<HTMLButtonElement>;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  invalid?: boolean;
};

export function Switch({ className, checked = false, onChange, label, invalid, disabled, ref, ...props }: SwitchProps) {
  return (
    <label
      className={cn(
        "group flex items-center gap-2",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-invalid={invalid ? true : props["aria-invalid"]}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        ref={ref}
        className={cn(
          "relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer items-center rounded-xs border transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-1",
          checked ? "border-primary bg-primary" : "border-hairline bg-surface",
          invalid && (checked ? "border-danger bg-danger" : "border-danger bg-dangerSoft"),
          disabled && "cursor-not-allowed"
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block size-2.5 rounded-xs shadow-sm transition-transform",
            checked ? "translate-x-3 bg-surface" : "translate-x-0.5 bg-tertiary"
          )}
        />
      </button>
      {label && (
        <span className={cn(
          "text-[10px] font-medium leading-none tracking-normal text-ink",
          invalid && "text-danger"
        )}>
          {label}
        </span>
      )}
    </label>
  );
}
