import { requirePerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AcionesInventario } from "./acciones-inventario";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const perfil = await requirePerfil();
  const supabase = createClient();

  const [inv, suc, prods] = await Promise.all([
    supabase
      .from("inventario")
      .select("stock, sucursal_id, producto_id, sucursales(nombre), productos(nombre, talla, categoria, codigo_barras)")
      .order("sucursal_id")
      .limit(500),
    supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("productos").select("id, nombre, talla").eq("activo", true).order("nombre"),
  ]);

  const gestion = perfil.rol !== "cajero";
  const filas = inv.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Inventario</h1>
        {gestion && (
          <AcionesInventario
            sucursales={suc.data ?? []}
            productos={prods.data ?? []}
            sucursalPropia={perfil.rol === "gerente" ? perfil.sucursal_id : null}
          />
        )}
      </div>

      {inv.error && <p className="text-sm text-destructive">No se pudo cargar el inventario. Intenta recargar.</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">Existencias {perfil.rol === "admin" ? "de todas las sucursales" : "de tu sucursal"}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Sucursal</TableHead><TableHead>Código</TableHead><TableHead>Producto</TableHead><TableHead>Categoría</TableHead><TableHead>Talla</TableHead><TableHead>Stock</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((r) => (
                <TableRow key={`${r.sucursal_id}-${r.producto_id}`}>
                  {/* @ts-ignore relaciones 1:1 como objeto */}
                  <TableCell>{r.sucursales?.nombre}</TableCell>
                  {/* @ts-ignore relaciones 1:1 como objeto */}
                  <TableCell className="font-mono text-xs">{r.productos?.codigo_barras}</TableCell>
                  {/* @ts-ignore relaciones 1:1 como objeto */}
                  <TableCell>{r.productos?.nombre}</TableCell>
                  {/* @ts-ignore relaciones 1:1 como objeto */}
                  <TableCell>{r.productos?.categoria}</TableCell>
                  {/* @ts-ignore relaciones 1:1 como objeto */}
                  <TableCell>{r.productos?.talla ?? "—"}</TableCell>
                  <TableCell>
                    {r.stock === 0 ? <Badge variant="destructive">Agotado</Badge>
                      : r.stock <= 2 ? <Badge variant="outline" className="border-amber-500 text-amber-600">{r.stock}</Badge>
                      : r.stock}
                  </TableCell>
                </TableRow>
              ))}
              {filas.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin existencias registradas</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
