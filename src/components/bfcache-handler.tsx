"use client";

import { useEffect } from "react";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

export function BfcacheHandler() {
  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        useNavigationUiStore.getState().bfcacheRestore();
      }
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
