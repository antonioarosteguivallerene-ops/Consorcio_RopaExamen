"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, Receipt, ShoppingCart, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppNav({ gestion }: { gestion: boolean }) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, show: true },
    { href: "/pos", label: "Punto de venta", icon: ShoppingCart, show: true },
    { href: "/ventas", label: "Ventas", icon: Receipt, show: true },
    { href: "/inventario", label: "Inventario", icon: Boxes, show: true },
    { href: "/productos", label: "Productos", icon: Tag, show: gestion },
  ].filter((l) => l.show);

  return (
    <nav className="flex flex-1 flex-wrap gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const activo = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition",
              activo ? "bg-white text-emerald-800 shadow-md" : "text-emerald-50/85 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
