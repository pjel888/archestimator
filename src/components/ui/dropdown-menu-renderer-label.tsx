import type { ReactNode } from "react";

export function DropdownMenuRendererLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 py-1 text-[9px] font-medium leading-3 text-tertiary" role="presentation">
      {children}
    </div>
  );
}
