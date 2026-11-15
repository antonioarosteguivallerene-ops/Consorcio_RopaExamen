import { requirePerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NuevoProducto } from "./nuevo-producto";
import { EditarPrecio } from "./editar-precio";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  await requirePerfil(["gerente", "admin"]);
  const supabase = await createClient(); // <--- Aquí faltaba el await
  
  const { data, error } = await supabase
    .from("productos")
    .select("id, codigo_barras, nombre, categoria, talla, precio")
    .eq("activo", true)
    .order("nombre");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catálogo de productos</h1>
        <NuevoProducto />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Compartido por las 4 sucursales</CardTitle></CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-sm text-destructive">No se pudo cargar el catálogo.</p>}
          <Table>
            <TableHeader>
              <TableRow><TableHead>Código</TableHead><TableHead>Nombre</TableHead><TableHead>Categoría</TableHead><TableHead>Talla</TableHead><TableHead>Precio</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.codigo_barras}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell>{p.categoria}</TableCell>
                  <TableCell>{p.talla ?? "—"}</TableCell>
                  <TableCell className="flex items-center gap-2">{money(p.precio)} <EditarPrecio id={p.id} precio={Number(p.precio)} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}