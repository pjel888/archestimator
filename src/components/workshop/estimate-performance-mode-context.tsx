"use client";

import { createContext, use, type ReactNode } from "react";

import {
  ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT,
  type EstimatePerformanceModeSnapshot,
} from "@/lib/estimates/estimate-performance-modes";

const EstimatePerformanceModeContext = createContext<EstimatePerformanceModeSnapshot>(
  ALL_OFF_ESTIMATE_PERFORMANCE_MODE_SNAPSHOT,
);

export function EstimatePerformanceModeProvider({
  snapshot,
  children,
}: {
  snapshot: EstimatePerformanceModeSnapshot;
  children: ReactNode;
}) {
  return (
    <EstimatePerformanceModeContext.Provider value={snapshot}>
      {children}
    </EstimatePerformanceModeContext.Provider>
  );
}

export function useEstimatePerformanceModeSnapshot(): EstimatePerformanceModeSnapshot {
  return use(EstimatePerformanceModeContext);
}
