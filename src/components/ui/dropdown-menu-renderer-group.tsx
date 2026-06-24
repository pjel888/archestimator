import type { ReactNode } from "react";

export function DropdownMenuRendererGroup({ children }: { children: ReactNode }) {
  return (
    // react-doctor-disable-next-line react-doctor/prefer-tag-over-role -- Menu grouping has no suitable native replacement here; <address> would be incorrect.
    <div role="group">{children}</div>
  );
}
