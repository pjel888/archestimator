import type { InputHTMLAttributes, Ref } from "react";

import { cn } from "@/lib/ui/cn";

type ControlInputProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>;
  align?: "left" | "center" | "right";
  invalid?: boolean;
};

export function ControlInput({ className, align = "left", invalid, ref, ...props }: ControlInputProps) {
  return (
    <input
      ref={ref}
      {...props}
      aria-invalid={invalid ? true : props["aria-invalid"]}
      className={cn(
        "min-w-0 w-full rounded-xs border border-transparent bg-white/70 !text-[12px] font-medium normal-case tracking-normal text-ink outline-none transition hover:border-hairline focus:border-accent focus:bg-accentSoft",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
        invalid ? "border-danger text-danger focus:border-danger focus:bg-dangerSoft/30" : "",
      )}
    />
  );
}
