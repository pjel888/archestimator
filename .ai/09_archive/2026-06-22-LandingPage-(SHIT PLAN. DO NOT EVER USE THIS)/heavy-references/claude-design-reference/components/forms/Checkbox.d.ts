import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * 3px square checkbox.
 * @dsCard group="Components"
 */
export interface CheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}
export declare function Checkbox(props: CheckboxProps): ReactNode;
