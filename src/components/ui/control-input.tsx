import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

type ControlInputProps = InputHTMLAttributes<HTMLInputElement> & {
  align?: "left" | "center" | "right";
  invalid?: boolean;
};

export const ControlInput = forwardRef<HTMLInputElement, ControlInputProps>(function ControlInput(
  { className, align = "left", invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      {...props}
      aria-invalid={invalid ? true : props["aria-invalid"]}
      className={cn(
        "min-w-0 w-full rounded-sm border border-transparent bg-white/70 !text-[10px] font-bold normal-case tracking-normal text-ink outline-none transition hover:border-hairline focus:border-accent focus:bg-accentSoft",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
        invalid ? "border-danger text-danger focus:border-danger focus:bg-dangerSoft/30" : "",
      )}
    />
  );
});

type ControlTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const ControlTextarea = forwardRef<HTMLTextAreaElement, ControlTextareaProps>(function ControlTextarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      {...props}
      aria-invalid={invalid ? true : props["aria-invalid"]}
      className={cn(
        "min-w-0 w-full resize-none rounded-sm border border-hairline bg-white px-2 py-1.5 !text-[10px] font-semibold normal-case leading-4 tracking-normal text-ink outline-none transition placeholder:text-tertiary hover:border-tertiary focus:border-accent focus:ring-2 focus:ring-focus",
        className,
        invalid ? "border-danger text-danger focus:border-danger focus:ring-dangerSoft" : "",
      )}
    />
  );
});

type ControlFieldProps = {
  label: ReactNode;
  children: ReactNode;
  as?: "label" | "div";
  className?: string;
  helperText?: ReactNode;
  errorText?: ReactNode;
  reserveHelperSpace?: boolean;
  required?: boolean;
};

export function ControlField({
  label,
  children,
  as = "label",
  className,
  helperText,
  errorText,
  reserveHelperSpace,
  required,
}: ControlFieldProps) {
  const FieldTag = as;

  return (
    <FieldTag className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="block min-h-3 truncate text-[9px] font-bold uppercase leading-3 tracking-[0.06em] text-tertiary">
        {label}
        {required ? <span aria-hidden="true" className="ml-0.5 text-danger">*</span> : null}
      </span>
      {children}
      {errorText ? (
        <span className="min-h-3 text-[9px] normal-case leading-3 tracking-normal text-danger">{errorText}</span>
      ) : helperText ? (
        <span className="min-h-3 text-[9px] normal-case leading-3 tracking-normal text-tertiary">{helperText}</span>
      ) : reserveHelperSpace ? (
        <span aria-hidden="true" className="min-h-3 text-[9px] leading-3 tracking-normal">&nbsp;</span>
      ) : null}
    </FieldTag>
  );
}

export const CONTROL_INPUT_SURFACE_CLASS =
  "h-8 border-hairline bg-white px-2 font-semibold leading-none shadow-[inset_0_1px_0_rgba(17,17,17,0.02)] placeholder:text-tertiary hover:border-tertiary focus:border-accent focus:bg-white focus:ring-2 focus:ring-focus";
