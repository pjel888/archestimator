import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

type ControlInputProps = InputHTMLAttributes<HTMLInputElement> & {
  align?: "left" | "center" | "right";
};

export const ControlInput = forwardRef<HTMLInputElement, ControlInputProps>(function ControlInput(
  { className, align = "left", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      {...props}
      className={cn(
        "w-full rounded-sm border border-transparent bg-white/70 !text-[10px] font-bold text-ink outline-none transition hover:border-hairline focus:border-accent focus:bg-accentSoft",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    />
  );
});
