"use client";

import { Button } from "@/components/ui/button";

/**
 * MagicLinkButton — the orange CTA for the email magic-link submit (keystone
 * decision C-3). It is `variant="brand"` (NOT `variant="primary"`): `brand`
 * yields the signal-orange #F24405 fill with AA-pass white text; `primary`
 * yields the #3D3D3D ink, which is NOT the brand CTA. It must live INSIDE the
 * magic-link `<form action>` in the form leaf.
 *
 * `"use client"` because it is a submit button that may receive focus / form
 * events.
 */
export interface MagicLinkButtonProps {
  label: string;
  className?: string;
}

export function MagicLinkButton({ label, className }: MagicLinkButtonProps) {
  return (
    <Button type="submit" variant="brand" className={className}>
      {label}
    </Button>
  );
}
