import { requirePerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fecha, money } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnularVenta } from "./anular-venta";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const perfil = await requirePerfil();
  const supabase = await createClient(); // <--- Aquí faltaba el await

  const { data, error } = await supabase
    .from("ventas")
    .select("id, total, metodo_pago, estado, created_at, motivo_anulacion, sucursales(nombre), perfiles!ventas_cajero_id_fkey(nombre), venta_items(cantidad)")
    .order("created_at", { ascending: false })
    .limit(100);

  const puedeAnular = perfil.rol !== "cajero";

  return (
    <Card>
      <CardHeader><CardTitle>Historial de ventas</CardTitle></CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-sm text-destructive">No se pudo cargar el historial. Intenta recargar.</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead><TableHead>Sucursal</TableHead><TableHead>Cajero</TableHead>
              <TableHead>Artículos</TableHead><TableHead>Pago</TableHead><TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>{puedeAnular && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((v) => (
              <TableRow key={v.id}>
                <TableCell>{fecha(v.created_at)}</TableCell>
                {/* @ts-ignore relación 1:1 como objeto */}
                <TableCell>{v.sucursales?.nombre}</TableCell>
                {/* @ts-ignore relación 1:1 como objeto */}
                <TableCell>{v.perfiles?.nombre}</TableCell>
                <TableCell>{(v.venta_items as { cantidad: number }[]).reduce((s, i) => s + i.cantidad, 0)}</TableCell>
                <TableCell className="capitalize">{v.metodo_pago}</TableCell>
                <TableCell>{money(v.total)}</TableCell>
                <TableCell>
                  {v.estado === "anulada"
                    ? <Badge variant="destructive" title={v.motivo_anulacion ?? ""}>Anulada</Badge>
                    : <Badge variant="secondary">Completada</Badge>}
                </TableCell>
                {puedeAnular && (
                  <TableCell>{v.estado === "completada" && <AnularVenta ventaId={v.id} />}</TableCell>
                )}
              </TableRow>
            ))}
            {(data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Aún no hay ventas</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}