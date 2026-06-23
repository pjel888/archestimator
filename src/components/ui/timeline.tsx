import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export interface TimelineItem {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: string;
  icon?: ReactNode;
  status?: "default" | "active" | "completed";
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

function timelineItemKey(item: TimelineItem) {
  if (item.id) return item.id;
  if (typeof item.title === "string" || typeof item.title === "number") return String(item.title);
  return item.timestamp ?? item.status ?? "timeline-item";
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ul
      className={cn("m-0 flex list-none flex-col p-0", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const status = item.status || "default";
        
        const isActiveOrCompleted = status === "active" || status === "completed";
        
        return (
          <li key={timelineItemKey(item)} className="relative flex gap-3">
            {/* Timeline line & indicator */}
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "z-10 flex h-5 w-5 items-center justify-center bg-surface",
                  item.icon ? "" : "mt-0.5"
                )}
              >
                {item.icon ? (
                  <div className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-xs",
                    isActiveOrCompleted ? "bg-primary text-white" : "bg-surfaceMuted text-muted"
                  )}>
                    {item.icon}
                  </div>
                ) : (
                  <div 
                    className={cn(
                      "h-2 w-2",
                      isActiveOrCompleted ? "bg-primary" : "border border-hairline bg-surfaceMuted"
                    )}
                    style={{ borderRadius: "50%" }}
                  />
                )}
              </div>
              
              {!isLast && (
                <div 
                  className={cn(
                    "my-1 w-px flex-1",
                    isActiveOrCompleted ? "bg-primary" : "bg-hairline"
                  )}
                />
              )}
            </div>
            
            {/* Content */}
            <div className="flex flex-1 flex-col pb-4 pt-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className={cn(
                  "text-[10px] font-medium tracking-normal",
                  status === "default" ? "text-ink" : "text-primary"
                )}>
                  {item.title}
                </div>
                {item.timestamp && (
                  <div className="shrink-0 text-[9px] font-normal tracking-normal text-muted">
                    {item.timestamp}
                  </div>
                )}
              </div>
              
              {item.description && (
                <div className="mt-1 text-[10px] font-normal tracking-normal text-muted">
                  {item.description}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
