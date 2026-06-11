import Link from "next/link";
import { X } from "@phosphor-icons/react/dist/ssr";
import { workshopHref } from "./constants";

export function AnnouncementBanner() {
  return (
    <div className="flex min-h-9 items-center justify-center border-b border-[#dedbd6] bg-white px-4 text-center text-[13px] text-[#313130]">
      <span className="font-semibold">Archestimator 2 — estimating workspace, component library, and proposal package.</span>
      <Link href={workshopHref} className="ml-1 underline underline-offset-4">
        Open workspace
      </Link>
      <X className="absolute right-5 size-4 text-[#626260]" weight="bold" />
    </div>
  );
}
