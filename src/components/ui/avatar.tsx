import * as React from "react";
import { cn } from "@/lib/ui/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
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

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, initials, size = "md", ...props }, ref) => {
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
          <img
            src={src}
            alt={alt || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="uppercase tracking-normal">{initials?.slice(0, 2) || "?"}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";
