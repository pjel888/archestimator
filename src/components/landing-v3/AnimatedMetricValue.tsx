"use client";

import { useEffect, useMemo, useState } from "react";

type AnimatedMetricValueProps = {
  start: number;
  intervalMs?: number;
  className?: string;
};

export function AnimatedMetricValue({ start, intervalMs = 2200, className }: AnimatedMetricValueProps) {
  const [ticks, setTicks] = useState(0);
  const formatter = useMemo(() => new Intl.NumberFormat("en-US"), []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (prefersReducedMotion.matches) return;

    const interval = window.setInterval(() => {
      setTicks((current) => current + 1);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs]);

  return <span className={className}>{formatter.format(start + ticks)}</span>;
}
