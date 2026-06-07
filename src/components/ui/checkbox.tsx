import { forwardRef, type InputHTMLAttributes, useEffect, useRef, type ReactNode } from "react";
import { Check, Minus } from "@phosphor-icons/react";
import { cn } from "@/lib/ui/cn";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  invalid?: boolean;
  indeterminate?: boolean;
  label?: ReactNode;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, invalid, indeterminate, label, children, ...props },
  forwardedRef,
) {
  const internalRef = useRef<HTMLInputElement>(null);
  
  const ref = (node: HTMLInputElement) => {
    internalRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  useEffect(() => {
    if (internalRef.current) {
      internalRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  const content = children || label;

  return (
    <label
      className={cn(
        "group flex items-center gap-2",
        props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
    >
      <div className="relative flex size-3.5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          ref={ref}
          aria-invalid={invalid ? true : props["aria-invalid"]}
          className={cn(
            "peer absolute inset-0 m-0 size-full appearance-none rounded-xs border border-hairline bg-surface transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-1",
            "checked:border-primary checked:bg-primary",
            "indeterminate:border-primary indeterminate:bg-primary",
            invalid && "border-danger focus-visible:ring-danger checked:border-danger checked:bg-danger indeterminate:border-danger indeterminate:bg-danger"
          )}
          {...props}
        />
        <Check 
          weight="regular" 
          className="pointer-events-none absolute size-2.5 text-surface opacity-0 transition-opacity peer-checked:opacity-100 peer-indeterminate:opacity-0" 
        />
        <Minus 
          weight="regular" 
          className="pointer-events-none absolute size-2.5 text-surface opacity-0 transition-opacity peer-indeterminate:opacity-100" 
        />
      </div>
      {content && (
        <span className={cn(
          "text-[10px] font-medium leading-none tracking-normal text-ink",
          invalid && "text-danger"
        )}>
          {content}
        </span>
      )}
    </label>
  );
});
