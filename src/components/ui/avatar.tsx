import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/ui/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>;
  src?: string;
  alt?: string;
  initials?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const sizeClasses = {
  xs: "w-[20px] h-[20px] text-[9px]",
  sm: "w-[28px] h-[28px] text-[10px]",
  md: "w-[36px] h-[36px] text-[12px]",
  lg: "w-[48px] h-[48px] text-[12px]",
};

const imageSizes = {
  xs: "20px",
  sm: "28px",
  md: "36px",
  lg: "48px",
};

export function Avatar({ className, src, alt, initials, size = "md", ref, ...props }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-xs bg-surfaceMuted border border-hairline items-center justify-center text-ink font-medium",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !imageError ? (
        <Image
          src={src}
          alt={alt || "Avatar"}
          fill
          sizes={imageSizes[size]}
          unoptimized
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="uppercase tracking-normal">{initials?.slice(0, 2) || "?"}</span>
      )}
    </div>
  );
}
