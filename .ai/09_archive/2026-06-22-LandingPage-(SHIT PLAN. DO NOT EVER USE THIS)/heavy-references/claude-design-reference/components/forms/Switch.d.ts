import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Compact square toggle switch.
 * @dsCard group="Components"
 */
export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}
export declare function Switch(props: SwitchProps): ReactNode;
