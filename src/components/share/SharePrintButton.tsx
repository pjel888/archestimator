"use client";

import { Printer } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

export function SharePrintButton() {
  return (
    <Button type="button" variant="secondary" size="sm" className="share-print-hidden" onClick={() => window.print()}>
      <Printer size={14} aria-hidden="true" /> Print / Save as PDF
    </Button>
  );
}
