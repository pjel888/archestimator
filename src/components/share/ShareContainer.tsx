import React from "react";

/**
 * Shared proposal canvas. The shared estimate is a client presentation workspace,
 * so the page owns the full viewport and individual prose surfaces constrain their
 * own readable measure when needed.
 */
export const SHARE_CONTAINER_WIDTH =
  "w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12";

type ShareContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function ShareContainer({ children, className }: ShareContainerProps) {
  return <div className={`${SHARE_CONTAINER_WIDTH}${className ? ` ${className}` : ""}`}>{children}</div>;
}
