"use client";

import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<ScrollAreaHandle>;
  maxHeight?: number | string;
  orientation?: "vertical" | "horizontal" | "both";
  scrollShadows?: boolean;
}

export type ScrollAreaHandle = {
  viewport: HTMLDivElement | null;
  scrollTo: (options: ScrollToOptions) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
};

export function ScrollArea({
  className,
  children,
  maxHeight,
  orientation = "vertical",
  scrollShadows = false,
  onScroll,
  style,
  ref,
  ...props
}: ScrollAreaProps) {
    const viewportRef = React.useRef<HTMLDivElement>(null);
    const [shadowState, setShadowState] = React.useState({ top: false, bottom: false });

    const updateShadows = React.useCallback(() => {
      if (!scrollShadows) return;

      const viewport = viewportRef.current;
      if (!viewport) return;

      const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
      setShadowState({
        top: viewport.scrollTop > 0,
        bottom: maxScrollTop > 1 && viewport.scrollTop < maxScrollTop - 1,
      });
    }, [scrollShadows]);

    React.useImperativeHandle(
      ref,
      () => ({
        get viewport() {
          return viewportRef.current;
        },
        scrollTo: (options: ScrollToOptions) => {
          viewportRef.current?.scrollTo(options);
        },
        scrollToTop: () => {
          viewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        },
        scrollToBottom: () => {
          const viewport = viewportRef.current;
          viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
        },
      }),
      []
    );

    React.useEffect(() => {
      updateShadows();

      const viewport = viewportRef.current;
      if (!viewport || !scrollShadows || typeof ResizeObserver === "undefined") return;

      const resizeObserver = new ResizeObserver(updateShadows);
      resizeObserver.observe(viewport);

      return () => resizeObserver.disconnect();
    }, [children, scrollShadows, updateShadows]);

    const handleScroll = React.useCallback(
      (event: React.UIEvent<HTMLDivElement>) => {
        updateShadows();
        onScroll?.(event);
      },
      [onScroll, updateShadows]
    );

    return (
      <div className="relative min-h-0" data-slot="scroll-area-root">
        <div
          ref={viewportRef}
          className={cn(
            "scrollbar-thin min-h-0 overscroll-contain [&::-webkit-scrollbar]:h-[5px] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:rounded-xs [&::-webkit-scrollbar-thumb]:bg-hairline hover:[&::-webkit-scrollbar-thumb]:bg-tertiary [&::-webkit-scrollbar-track]:bg-transparent",
            orientation === "vertical" && "overflow-y-auto overflow-x-hidden",
            orientation === "horizontal" && "overflow-x-auto overflow-y-hidden",
            orientation === "both" && "overflow-auto",
            className
          )}
          data-slot="scroll-area-viewport"
          onScroll={handleScroll}
          style={{ maxHeight, scrollbarColor: "var(--divider) transparent", scrollbarWidth: "thin", ...style }}
          {...props}
        >
          {children}
        </div>
        {scrollShadows ? (
          <>
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-4 bg-linear-to-b from-white to-transparent transition-opacity",
                shadowState.top ? "opacity-100" : "opacity-0"
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-linear-to-t from-white to-transparent transition-opacity",
                shadowState.bottom ? "opacity-100" : "opacity-0"
              )}
            />
          </>
        ) : null}
      </div>
    );
}
