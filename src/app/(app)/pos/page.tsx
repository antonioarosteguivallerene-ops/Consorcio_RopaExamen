import { requirePerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ sucursal?: string }>;
}) {
  // En Next.js 15+, searchParams es una promesa y debe resolverse con await
  const resolvedSearchParams = await searchParams;

  const perfil = await requirePerfil();
  const supabase = await createClient(); // <--- Aquí faltaba el await

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

  const lista = sucursales ?? [];
  
  // Cajero y gerente: su sucursal. Admin: la elegida (o la primera).
  const sucursalId =
    perfil.rol === "admin"
      ? lista.find((s) => s.id === resolvedSearchParams.sucursal)?.id ?? lista[0]?.id ?? null
      : perfil.sucursal_id;

  if (!sucursalId) {
    return (
      <p className="rounded-md border p-4 text-sm text-muted-foreground">
        Tu usuario aún no tiene una sucursal asignada. Pide al administrador que la configure.
      </p>
    );
  }

  const { data: catalogo } = await supabase
    .from("inventario")
    .select("stock, productos!inner(id, codigo_barras, nombre, talla, precio, activo)")
    .eq("sucursal_id", sucursalId)
    .eq("productos.activo", true)
    .gt("stock", 0)
    .order("stock", { ascending: false })
    .limit(200);

  const productos = (catalogo ?? []).map((r: any) => {
    // Forzamos la lectura segura de la relación anidada para evitar errores de TS
    const p = Array.isArray(r.productos) ? r.productos[0] : r.productos;
    return {
      id: p?.id as string,
      codigo_barras: p?.codigo_barras as string,
      nombre: p?.nombre as string,
      talla: p?.talla as string | null,
      precio: Number(p?.precio ?? 0),
      stock: r.stock as number,
    };
  });

  return (
    <PosClient
      sucursalId={sucursalId}
      sucursales={perfil.rol === "admin" ? lista : []}
      catalogo={productos}
    />
  );
}