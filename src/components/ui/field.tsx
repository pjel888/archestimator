import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm"><span className="font-medium text-ink">{label}</span>{children}{hint ? <span className="text-xs leading-5 text-muted">{hint}</span> : null}</label>;
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("min-h-10 rounded-md border border-divider bg-white px-3 py-2 text-sm text-ink focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/15", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("min-h-24 rounded-md border border-divider bg-white px-3 py-2 text-sm leading-6 text-ink focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/15", className)} {...props} />;
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-ink", className)} {...props} />;
}
