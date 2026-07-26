import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

const ONBOARDING_ART = "/Pixel_Images/ChatGPT Image Jul 23, 2026, 01_28_39 PM.png";

export function OnboardingBrandVisual({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden={children ? undefined : true}
      className={cn("relative overflow-hidden bg-[#172337]", className)}
    >
      <Image
        alt=""
        className="object-cover object-center"
        fill
        priority={false}
        sizes="(max-width: 640px) 100vw, 28rem"
        src={ONBOARDING_ART}
      />
      <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(17,31,50,0.94),rgba(23,35,55,0.58)_56%,rgba(242,68,5,0.18))]" />
      {children ? <div className="relative z-[1] h-full">{children}</div> : null}
    </div>
  );
}
