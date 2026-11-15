import Image from "next/image";
import { LogOut } from "lucide-react";
import { requirePerfil } from "@/lib/auth";
import { cerrarSesion } from "@/actions/auth";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requirePerfil();

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white shadow-lg">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <span className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white p-0.5 shadow ring-1 ring-white/40">
              <Image src="/logo.png" alt="Logo" width={40} height={40} className="h-full w-full object-contain" />
            </span>
            Consorcio
          </span>

          <AppNav gestion={perfil.rol !== "cajero"} />

          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <div className="font-medium">{perfil.nombre}</div>
              <div className="text-xs text-emerald-100/80">{perfil.sucursal_nombre ?? "Todas las sucursales"}</div>
            </div>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold capitalize ring-1 ring-white/25">
              {perfil.rol}
            </span>
            <form action={cerrarSesion}>
              <button
                type="submit"
                aria-label="Cerrar sesión"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25 transition hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
