import { Children, cloneElement, isValidElement, type ReactNode, type ReactElement, type Ref } from "react";
import { cn } from "@/lib/ui/cn";
import type { ButtonSize } from "./button";

export type ButtonGroupProps = {
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
  size?: ButtonSize;
};

export function ButtonGroup({ children, className, orientation = "horizontal", size, ref }: ButtonGroupProps) {
  const isHorizontal = orientation === "horizontal";

  const items = Children.toArray(children).filter(isValidElement);

  return (
    <div
      ref={ref}
      role="group"
      className={cn(
        "inline-flex",
        isHorizontal ? "flex-row" : "flex-col",
        className
      )}
    >
      {items.map((child, index) => {
        const isFirst = index === 0;
        const isLast = index === items.length - 1;

        const marginClass = isFirst ? "" : isHorizontal ? "-ml-px" : "-mt-px";

        const style: React.CSSProperties = { ...((child as ReactElement<{ style?: React.CSSProperties }>).props.style || {}) };

        if (isHorizontal) {
          if (!isFirst) {
            style.borderTopLeftRadius = 0;
            style.borderBottomLeftRadius = 0;
          }
          if (!isLast) {
            style.borderTopRightRadius = 0;
            style.borderBottomRightRadius = 0;
          }
        } else {
          if (!isFirst) {
            style.borderTopLeftRadius = 0;
            style.borderTopRightRadius = 0;
          }
          if (!isLast) {
            style.borderBottomLeftRadius = 0;
            style.borderBottomRightRadius = 0;
          }
        }

        const childElement = child as ReactElement<{ className?: string; size?: ButtonSize; style?: React.CSSProperties }>;

        return cloneElement(childElement, {
          className: cn(
            childElement.props.className,
            marginClass,
            "focus:z-10" // Ensure focus ring is above siblings
          ),
          style,
          ...(size ? { size } : {}),
        });
      })}
    </div>
  );
}
