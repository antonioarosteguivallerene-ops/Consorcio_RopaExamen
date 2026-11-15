import { requirePerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PosClient } from "./pos-client";

export const dynamic = "force-dynamic";

export default async function PosPage({ searchParams }: { searchParams: { sucursal?: string } }) {
  const perfil = await requirePerfil();
  const supabase = createClient();

  const { data: sucursales } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

  const lista = sucursales ?? [];
  // Cajero y gerente: su sucursal. Admin: la elegida (o la primera).
  const sucursalId =
    perfil.rol === "admin"
      ? lista.find((s) => s.id === searchParams.sucursal)?.id ?? lista[0]?.id ?? null
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

  const productos = (catalogo ?? []).map((r) => {
    // @ts-ignore relación 1:1 como objeto
    const p = r.productos;
    return { id: p.id as string, codigo_barras: p.codigo_barras as string, nombre: p.nombre as string, talla: p.talla as string | null, precio: Number(p.precio), stock: r.stock as number };
  });

  return (
    <PosClient
      sucursalId={sucursalId}
      sucursales={perfil.rol === "admin" ? lista : []}
      catalogo={productos}
    />
  );
}
