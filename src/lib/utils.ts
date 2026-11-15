import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const money = (n: number | string) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "USD" }).format(Number(n));

export const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-NI", { dateStyle: "short", timeStyle: "short" });
