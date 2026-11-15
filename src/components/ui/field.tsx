import * as React from "react";
import { cn } from "@/lib/utils";

/** Campo de formulario con etiqueta y mensaje de error visible. */
export function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  );
}

export const selectClass =
  "flex h-11 w-full rounded-xl border border-input bg-slate-50 px-3.5 py-2 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-ring/15 disabled:opacity-50";
