import { AlertTriangle, DollarSign, PackageX, Receipt, Store } from "lucide-react";
import { requirePerfil } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const UMBRAL_STOCK_BAJO = 2;

export default async function DashboardPage({ searchParams }: { searchParams: { error?: string } }) {
  const perfil = await requirePerfil();
  const supabase = createClient();

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const [ventasRes, bajoRes] = await Promise.all([
    supabase
      .from("ventas")
      .select("id, total, sucursal_id, sucursales(nombre)")
      .eq("estado", "completada")
      .gte("created_at", inicioDia.toISOString()),
    supabase
      .from("inventario")
      .select("stock, sucursales(nombre), productos(nombre, talla)")
      .lte("stock", UMBRAL_STOCK_BAJO)
      .order("stock", { ascending: true })
      .limit(15),
  ]);

  const hayError = ventasRes.error || bajoRes.error;
  const ventas = ventasRes.data ?? [];
  const bajo = bajoRes.data ?? [];

  const porSucursal = new Map<string, { n: number; total: number }>();
  for (const v of ventas) {
    // @ts-ignore relación 1:1 como objeto
    const nombre: string = v.sucursales?.nombre ?? "—";
    const acc = porSucursal.get(nombre) ?? { n: 0, total: 0 };
    acc.n += 1;
    acc.total += Number(v.total);
    porSucursal.set(nombre, acc);
  }
  const totalDia = ventas.reduce((s, v) => s + Number(v.total), 0);

  const hoy = new Date().toLocaleDateString("es-NI", { weekday: "long", day: "numeric", month: "long" });

  const stats = [
    { label: "Ventas del día", value: money(totalDia), icon: DollarSign, chip: "bg-emerald-100 text-emerald-700", barra: "from-emerald-500 to-teal-500" },
    { label: "Transacciones", value: String(ventas.length), icon: Receipt, chip: "bg-sky-100 text-sky-700", barra: "from-sky-500 to-cyan-500" },
    { label: `Stock bajo (≤ ${UMBRAL_STOCK_BAJO})`, value: String(bajo.length), icon: PackageX, chip: "bg-amber-100 text-amber-700", barra: "from-amber-500 to-orange-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Banner de bienvenida */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
        <p className="relative text-sm capitalize text-emerald-100/80">{hoy}</p>
        <h1 className="relative mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Hola, {perfil.nombre}</h1>
        <p className="relative mt-2 flex items-center gap-2 text-sm text-emerald-50/80">
          <Store className="h-4 w-4" /> {perfil.sucursal_nombre ?? "Todas las sucursales"} · Resumen de hoy
        </p>
      </section>

      {searchParams.error === "permiso" && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          No tienes permiso para acceder a esa sección.
        </p>
      )}
      {hayError && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          No se pudieron cargar algunos datos. Recarga la página en unos segundos.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, chip, barra }) => (
          <Card key={label} className="relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${barra}`} />
            <CardContent className="flex items-center gap-4 p-6">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${chip}`}>
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold tracking-tight">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {perfil.rol === "admin" && (
        <Card>
          <CardHeader><CardTitle>Ventas por sucursal (hoy)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Sucursal</TableHead><TableHead>Ventas</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {[...porSucursal.entries()].map(([n, v]) => (
                  <TableRow key={n}><TableCell className="font-medium">{n}</TableCell><TableCell>{v.n}</TableCell><TableCell>{money(v.total)}</TableCell></TableRow>
                ))}
                {porSucursal.size === 0 && (
                  <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Sin ventas hoy</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><AlertTriangle className="h-4 w-4" /></span>
            Alertas de stock bajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Sucursal</TableHead><TableHead>Stock</TableHead></TableRow></TableHeader>
            <TableBody>
              {bajo.map((r, i) => (
                <TableRow key={i}>
                  {/* @ts-ignore relaciones 1:1 como objeto */}
                  <TableCell className="font-medium">{r.productos?.nombre} {r.productos?.talla ? `(${r.productos.talla})` : ""}</TableCell>
                  {/* @ts-ignore relaciones 1:1 como objeto */}
                  <TableCell>{r.sucursales?.nombre}</TableCell>
                  <TableCell>
                    <span className={r.stock === 0 ? "rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700" : "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700"}>
                      {r.stock === 0 ? "Agotado" : r.stock}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {bajo.length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Todo el inventario está en niveles normales</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
