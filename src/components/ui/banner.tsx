import * as React from "react";
import { Info, CheckCircle, WarningCircle, XCircle, X } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/ui/cn";

export interface BannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: "info" | "success" | "warning" | "danger";
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const toneConfig = {
  info: {
    bg: "bg-surfaceMuted",
    border: "border-hairline",
    iconColor: "text-secondary",
    DefaultIcon: Info,
  },
  success: {
    bg: "bg-successSoft",
    border: "border-successSoft",
    iconColor: "text-success",
    DefaultIcon: CheckCircle,
  },
  warning: {
    bg: "bg-warningSoft",
    border: "border-warningSoft",
    iconColor: "text-warning",
    DefaultIcon: WarningCircle,
  },
  danger: {
    bg: "bg-dangerSoft",
    border: "border-dangerSoft",
    iconColor: "text-danger",
    DefaultIcon: XCircle,
  },
};

export const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  ({ className, tone = "info", title, description, actions, onDismiss, icon, ...props }, ref) => {
    const config = toneConfig[tone];
    const Icon = config.DefaultIcon;

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "flex min-h-10 w-full items-center justify-between gap-3 border px-3 py-2",
          config.bg,
          config.border,
          className
        )}
        {...props}
      >
        <div className="flex min-w-0 items-start gap-2">
          <div className={cn("mt-0.5 shrink-0", config.iconColor)}>
            {icon ? icon : <Icon size={14} weight="regular" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium leading-4 text-ink">{title}</p>
            {description && (
              <p className="truncate text-[10px] leading-4 text-tertiary">{description}</p>
            )}
          </div>
        </div>
        
        {(actions || onDismiss) && (
          <div className="flex shrink-0 items-center gap-2">
            {actions && <div className="flex items-center gap-2">{actions}</div>}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="flex size-6 items-center justify-center rounded-xs text-secondary hover:bg-black/5 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
                aria-label="Dismiss"
              >
                <X size={12} weight="regular" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);
Banner.displayName = "Banner";
