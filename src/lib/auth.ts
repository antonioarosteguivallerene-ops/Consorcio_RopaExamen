import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Rol = "cajero" | "gerente" | "admin";

export type Perfil = {
  id: string;
  nombre: string;
  rol: Rol;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
};

/** Devuelve el perfil del usuario autenticado o redirige a /login. */
export async function requirePerfil(roles?: Rol[]): Promise<Perfil> {
  const supabase = await createClient(); // <--- Aquí faltaba el await
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p, error } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, sucursal_id, sucursales(nombre)")
    .eq("id", user.id)
    .single();

  if (error || !p) redirect("/login?error=perfil");

  const perfil: Perfil = {
    id: p.id,
    nombre: p.nombre,
    rol: p.rol as Rol,
    sucursal_id: p.sucursal_id,
    // @ts-ignore relación 1:1 devuelta como objeto
    sucursal_nombre: p.sucursales?.nombre ?? null,
  };

  if (roles && !roles.includes(perfil.rol)) redirect("/dashboard?error=permiso");
  return perfil;
}