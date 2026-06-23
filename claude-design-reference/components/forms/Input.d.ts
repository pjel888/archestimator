import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Canonical app text input, plus a Field label wrapper.
 * @dsCard group="Components"
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  align?: "left" | "center" | "right";
  invalid?: boolean;
}
export interface FieldProps {
  label: ReactNode;
  required?: boolean;
  helperText?: ReactNode;
  errorText?: ReactNode;
  children: ReactNode;
  className?: string;
}
export declare function Input(props: InputProps): ReactNode;
export declare function Field(props: FieldProps): ReactNode;
