"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, CameraOff, Loader2, Minus, Plus, ScanBarcode, Trash2, CheckCircle2 } from "lucide-react";
import dynamic from "next/dynamic";
import { buscarProductoPorCodigo, registrarVenta, type ProductoPOS } from "@/actions/ventas";
import { ventaSchema } from "@/lib/schemas";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { selectClass } from "@/components/ui/field";

// html5-qrcode usa APIs del navegador: se carga solo en el cliente
const BarcodeScanner = dynamic(() => import("@/components/barcode-scanner").then((m) => m.BarcodeScanner), {
  ssr: false,
});

type Linea = ProductoPOS & { cantidad: number };

export function PosClient({
  sucursalId,
  sucursales,
  catalogo,
}: {
  sucursalId: string;
  sucursales: { id: string; nombre: string }[];
  catalogo: ProductoPOS[];
}) {
  const router = useRouter();
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [codigo, setCodigo] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [camara, setCamara] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [pending, start] = useTransition();

  const total = useMemo(() => carrito.reduce((s, l) => s + l.precio * l.cantidad, 0), [carrito]);

  async function agregarPorCodigo(cod: string) {
    const limpio = cod.trim();
    if (!limpio) {
      toast.error("Ingresa o escanea un código de barras.");
      return;
    }
    setBuscando(true);
    const res = await buscarProductoPorCodigo(sucursalId, limpio); // stock fresco desde la BD
    setBuscando(false);

    if (!res.ok || !res.data) {
      toast.error(res.ok ? "Producto no encontrado." : res.error);
      return;
    }
    const prod = res.data;
    if (prod.stock <= 0) {
      toast.error(`"${prod.nombre}" está agotado en esta sucursal.`);
      return;
    }
    setCarrito((prev) => {
      const existente = prev.find((l) => l.id === prod.id);
      if (existente) {
        if (existente.cantidad + 1 > prod.stock) {
          toast.warning(`Solo hay ${prod.stock} unidad(es) de "${prod.nombre}".`);
          return prev.map((l) => (l.id === prod.id ? { ...l, stock: prod.stock } : l));
        }
        return prev.map((l) => (l.id === prod.id ? { ...l, stock: prod.stock, precio: prod.precio, cantidad: l.cantidad + 1 } : l));
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
    setCodigo("");
  }

  function cambiarCantidad(id: string, delta: number) {
    setCarrito((prev) =>
      prev.flatMap((l) => {
        if (l.id !== id) return [l];
        const nueva = l.cantidad + delta;
        if (nueva <= 0) return [];
        if (nueva > l.stock) {
          toast.warning(`Solo hay ${l.stock} unidad(es) disponible(s).`);
          return [l];
        }
        return [{ ...l, cantidad: nueva }];
      })
    );
  }

  function cobrar() {
    const payload = {
      sucursal_id: sucursalId,
      metodo_pago: metodo,
      items: carrito.map((l) => ({ producto_id: l.id, cantidad: l.cantidad })),
    };
    const check = ventaSchema.safeParse(payload);
    if (!check.success) {
      toast.error(check.error.issues[0].message);
      return;
    }
    start(async () => {
      const res = await registrarVenta(check.data);
      if (res.ok) {
        toast.success(res.message ?? "Venta registrada", { icon: <CheckCircle2 className="h-4 w-4" /> });
        setCarrito([]);
        router.refresh(); // refresca el catálogo con el stock actualizado
      } else {
        toast.error(res.error);
        router.refresh(); // el stock pudo cambiar por otra venta simultánea
      }
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        {sucursales.length > 0 && (
          <select
            className={selectClass}
            value={sucursalId}
            onChange={(e) => {
              if (carrito.length && !confirm("Cambiar de sucursal vaciará el carrito. ¿Continuar?")) return;
              setCarrito([]);
              router.push(`/pos?sucursal=${e.target.value}`);
            }}
            aria-label="Sucursal"
          >
            {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><ScanBarcode className="h-4 w-4" />Agregar producto</span>
              <Button variant="outline" size="sm" onClick={() => setCamara((v) => !v)}>
                {camara ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                {camara ? "Cerrar cámara" : "Escanear"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {camara && <BarcodeScanner onScan={agregarPorCodigo} />}
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                agregarPorCodigo(codigo);
              }}
            >
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Código de barras (o usa un lector USB)"
                inputMode="numeric"
                maxLength={32}
                autoFocus
              />
              <Button type="submit" disabled={buscando}>
                {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Catálogo disponible en esta sucursal</CardTitle></CardHeader>
          <CardContent className="grid max-h-80 gap-2 overflow-auto sm:grid-cols-2">
            {catalogo.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => agregarPorCodigo(p.codigo_barras)}
                className="flex items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-accent"
              >
                <span>
                  <span className="block font-medium">{p.nombre}</span>
                  <span className="text-xs text-muted-foreground">{p.talla ? `Talla ${p.talla} · ` : ""}Stock {p.stock}</span>
                </span>
                <span className="font-semibold">{money(p.precio)}</span>
              </button>
            ))}
            {catalogo.length === 0 && <p className="text-sm text-muted-foreground">No hay productos con stock en esta sucursal.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit lg:col-span-2">
        <CardHeader><CardTitle>Venta actual</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {carrito.length === 0 && <p className="text-sm text-muted-foreground">El carrito está vacío.</p>}
          {carrito.map((l) => (
            <div key={l.id} className="flex items-center gap-2 border-b pb-2 text-sm">
              <div className="flex-1">
                <div className="font-medium">{l.nombre}</div>
                <div className="text-xs text-muted-foreground">{money(l.precio)} c/u · disp. {l.stock}</div>
              </div>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => cambiarCantidad(l.id, -1)} aria-label="Menos"><Minus className="h-3 w-3" /></Button>
              <span className="w-6 text-center">{l.cantidad}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => cambiarCantidad(l.id, 1)} aria-label="Más"><Plus className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCarrito((p) => p.filter((x) => x.id !== l.id))} aria-label="Quitar"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}

          <select className={selectClass} value={metodo} onChange={(e) => setMetodo(e.target.value)} aria-label="Método de pago">
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
          </select>

          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span><span>{money(total)}</span>
          </div>
          <Button className="w-full" size="lg" disabled={pending || carrito.length === 0} onClick={cobrar}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Cobrar
          </Button>
          {carrito.length > 0 && (
            <Badge variant="outline" className="w-full justify-center">
              {carrito.reduce((s, l) => s + l.cantidad, 0)} artículo(s)
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
