import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";

import { cn } from "@/lib/ui/cn";
import { ControlInput } from "./control-input-base";
import { ControlTextarea } from "./control-textarea";

export { ControlInput } from "./control-input-base";
export { ControlTextarea } from "./control-textarea";

type ControlFieldProps = {
  label: ReactNode;
  children: ReactNode | ((field: ControlFieldRenderProps) => ReactNode);
  controlId?: string;
  as?: "label" | "div";
  className?: string;
  helperText?: ReactNode;
  errorText?: ReactNode;
  reserveHelperSpace?: boolean;
  required?: boolean;
};

export type ControlFieldRenderProps = {
  controlId: string;
  labelId: string;
  helperId?: string;
  errorId?: string;
  describedBy?: string;
  invalid: boolean;
};

type BindableControlProps = {
  id?: unknown;
  "aria-labelledby"?: unknown;
  "aria-describedby"?: unknown;
  "aria-invalid"?: unknown;
  invalid?: unknown;
};

function mergeAriaDescribedBy(...ids: Array<unknown>) {
  const uniqueIds = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    for (const part of id.split(/\s+/)) {
      if (part) uniqueIds.add(part);
    }
  }
  return Array.from(uniqueIds).join(" ") || undefined;
}

export function ControlField({
  label,
  children,
  controlId: explicitControlId,
  as = "label",
  className,
  helperText,
  errorText,
  reserveHelperSpace,
  required,
}: ControlFieldProps) {
  const FieldTag = as;
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const helperId = helperText ? `${generatedId}-helper` : undefined;
  const errorId = errorText ? `${generatedId}-error` : undefined;
  const invalid = Boolean(errorText);
  const isRenderProp = typeof children === "function";
  const childArray = isRenderProp ? [] : Children.toArray(children);
  const onlyChild = childArray.length === 1 ? childArray[0] : null;
  const bindableChild =
    isValidElement(onlyChild) && (onlyChild.type === ControlInput || onlyChild.type === ControlTextarea)
      ? (onlyChild as ReactElement<BindableControlProps>)
      : null;
  const existingChildId = bindableChild?.props.id;
  const controlId =
    explicitControlId ??
    (typeof existingChildId === "string" && existingChildId ? existingChildId : `${generatedId}-control`);
  const describedBy = mergeAriaDescribedBy(
    bindableChild?.props["aria-describedby"],
    helperId,
    errorId,
  );
  const binding: ControlFieldRenderProps = {
    controlId,
    labelId,
    helperId,
    errorId,
    describedBy,
    invalid,
  };
  const fieldGroupLabel = typeof label === "string" ? `${label} field` : undefined;
  const fieldProps =
    as === "label"
      ? isRenderProp || bindableChild
        ? { htmlFor: controlId }
        : undefined
      : {
          role: "group",
          "aria-label": fieldGroupLabel,
          "aria-labelledby": fieldGroupLabel ? undefined : labelId,
        };

  const renderedChildren = isRenderProp
    ? children(binding)
    : bindableChild
      ? cloneElement(bindableChild, {
          id: controlId,
          "aria-labelledby":
            typeof bindableChild.props["aria-labelledby"] === "string"
              ? bindableChild.props["aria-labelledby"]
              : labelId,
          "aria-describedby": describedBy,
          "aria-invalid": invalid ? true : bindableChild.props["aria-invalid"],
          invalid: invalid || bindableChild.props.invalid,
        })
      : children;

  return (
    <FieldTag className={cn("flex min-w-0 flex-col gap-1", className)} {...fieldProps}>
      <span id={labelId} className="block min-h-3 truncate text-[10px] font-medium uppercase leading-3 tracking-normal text-secondary">
        {label}
        {required ? <span aria-hidden="true" className="ml-0.5 text-danger">*</span> : null}
      </span>
      {renderedChildren}
      {errorText ? (
        <span id={errorId} role="alert" className="min-h-3 text-[10px] normal-case leading-3 tracking-normal text-danger">{errorText}</span>
      ) : helperText ? (
        <span id={helperId} className="min-h-3 text-[10px] normal-case leading-3 tracking-normal text-secondary">{helperText}</span>
      ) : reserveHelperSpace ? (
        <span aria-hidden="true" className="min-h-3 text-[10px] leading-3 tracking-normal">&nbsp;</span>
      ) : null}
    </FieldTag>
  );
}

export const CONTROL_INPUT_SURFACE_CLASS =
  "h-8 border-hairline bg-white px-2 font-medium leading-none shadow-[inset_0_1px_0_rgba(17,17,17,0.02)] placeholder:text-tertiary hover:border-tertiary focus:border-tertiary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-focus/40";
