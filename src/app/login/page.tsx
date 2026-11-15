"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Boxes, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { iniciarSesion } from "@/actions/auth";

const beneficios = [
  { icon: BarChart3, titulo: "Ventas en tiempo real", texto: "Cobra con lector de código de barras y ve el total del día." },
  { icon: Boxes, titulo: "Inventario por sucursal", texto: "Stock actualizado en las 4 tiendas, sin sobreventas." },
  { icon: ShieldCheck, titulo: "Acceso por roles", texto: "Cajeros, gerentes y administradores con permisos propios." },
];

export default function LoginPage() {
  const [pending, start] = useTransition();
  const [verClave, setVerClave] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (values: LoginInput) =>
    start(async () => {
      const res = await iniciarSesion(values);
      // Si el login es correcto, la acción redirige; solo llegamos aquí si hubo error
      if (res && !res.ok) toast.error(res.error);
    });

  const inputBase =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15";

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Panel de marca */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-teal-300/10 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-lg ring-1 ring-white/40">
            <Image src="/logo.png" alt="Logo" width={48} height={48} className="h-full w-full object-contain" priority />
          </span>
          <span className="text-lg font-semibold tracking-tight">Consorcio Ropa Usada</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Todas tus tiendas,
              <br />
              <span className="text-emerald-200">un solo control.</span>
            </h1>
            <p className="text-emerald-50/80">Gestiona ventas e inventario de tus 4 sucursales desde cualquier dispositivo.</p>
          </div>

          <ul className="space-y-5">
            {beneficios.map(({ icon: Icon, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-5 w-5 text-emerald-200" />
                </span>
                <div>
                  <p className="font-medium">{titulo}</p>
                  <p className="text-sm text-emerald-50/70">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-emerald-50/60">© {new Date().getFullYear()} Consorcio Ropa Usada</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center bg-white p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow ring-1 ring-slate-200">
              <Image src="/logo.png" alt="Logo" width={44} height={44} className="h-full w-full object-contain" />
            </span>
            <span className="font-semibold">Consorcio Ropa Usada</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Bienvenido de vuelta</h2>
          <p className="mt-2 text-sm text-slate-500">Ingresa tus credenciales para acceder al sistema.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">Correo electrónico</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tucorreo@ejemplo.com"
                  className={inputBase}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
              </div>
              {errors.email && <p role="alert" className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={verClave ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputBase} pr-12`}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-700"
                  aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {verClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p role="alert" className="text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Ingresando…</>
              ) : (
                <>Iniciar sesión <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            ¿Problemas para entrar? Contacta al administrador de tu sucursal.
          </p>
        </div>
      </section>
    </main>
  );
}
