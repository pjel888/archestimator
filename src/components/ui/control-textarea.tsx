import type { Ref, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

type ControlTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: Ref<HTMLTextAreaElement>;
  invalid?: boolean;
};

export function ControlTextarea({ className, invalid, ref, ...props }: ControlTextareaProps) {
  return (
    <textarea
      ref={ref}
      {...props}
      aria-invalid={invalid ? true : props["aria-invalid"]}
      className={cn(
        "min-w-0 w-full resize-none rounded-xs border border-hairline bg-white px-2 py-1.5 !text-[12px] font-medium normal-case leading-4 tracking-normal text-ink outline-none transition placeholder:text-tertiary hover:border-tertiary focus:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40",
        className,
        invalid ? "border-danger text-danger focus:border-danger focus-visible:ring-danger/40" : "",
      )}
    />
  );
}
