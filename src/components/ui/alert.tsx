import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: "info" | "success" | "warning" | "danger";
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
}

const toneClasses = {
  info: "bg-surfaceMuted text-ink border-hairline",
  success: "bg-successSoft text-success border-success/20",
  warning: "bg-warningSoft text-warning border-warning/20",
  danger: "bg-dangerSoft text-danger border-danger/20",
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone = "info", title, description, icon, action, onClose, ...props }, ref) => {
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
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xs opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-focus transition-opacity"
                aria-label="Close alert"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";
