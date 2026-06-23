import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/ui/cn";

export type RadioOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type RadioGroupProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  ref?: Ref<HTMLDivElement>;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  layout?: "vertical" | "horizontal";
  invalid?: boolean;
};

export function RadioGroup({ className, options, value, onChange, name, disabled, layout = "vertical", invalid, ref, ...props }: RadioGroupProps) {
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-invalid={invalid ? true : props["aria-invalid"]}
      className={cn(
        "flex",
        layout === "vertical" ? "flex-col gap-2" : "flex-row flex-wrap gap-4",
        className
      )}
      {...props}
    >
      {options.map((option) => {
        const isChecked = value === option.value;
        const isDisabled = disabled || option.disabled;
        
        return (
          <label
            key={option.value}
            className={cn(
              "group flex items-center gap-2",
              isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
          >
            <div className="relative flex size-3.5 shrink-0 items-center justify-center">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => onChange?.(option.value)}
                className={cn(
                  "peer absolute inset-0 m-0 size-full appearance-none rounded-xs border border-hairline bg-surface transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-1",
                  "checked:border-primary",
                  invalid && "border-danger focus-visible:ring-danger checked:border-danger"
                )}
              />
              <div 
                className={cn(
                  "pointer-events-none absolute size-1.5 rounded-xs bg-primary opacity-0 transition-opacity peer-checked:opacity-100",
                  invalid && "bg-danger"
                )} 
              />
            </div>
            {option.label && (
              <span className={cn(
                "text-[10px] font-medium leading-none tracking-normal text-ink",
                invalid && "text-danger"
              )}>
                {option.label}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
