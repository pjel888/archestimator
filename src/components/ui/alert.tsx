import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/cn";

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  ref?: React.Ref<HTMLDivElement>;
  tone?: "info" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
}

const toneClasses = {
  info: "bg-surfaceMuted text-ink border-hairline",
  success: "bg-successSoft text-ink border-success/20",
  warning: "bg-warningSoft text-ink border-warning/20",
  danger: "bg-dangerSoft text-danger border-danger/20",
};

export function Alert({ className, tone = "info", title, description, icon, action, onClose, ref, ...props }: AlertProps) {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative flex items-start gap-3 rounded-xs border p-3",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {icon && <div className="shrink-0 mt-[1px]">{icon}</div>}

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {title && (
          <div className="text-[10px] font-medium tracking-normal">
            {title}
          </div>
        )}
        {description && (
          <div className={cn("text-[10px] tracking-normal", title ? "opacity-90" : "")}>
            {description}
          </div>
        )}
      </div>

      {(action || onClose) && (
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {action}
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="size-6 min-h-6 min-w-6 shrink-0 opacity-70 transition-opacity hover:opacity-100 focus:ring-1"
              aria-label="Close alert"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
