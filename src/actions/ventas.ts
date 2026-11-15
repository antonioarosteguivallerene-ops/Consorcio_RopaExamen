"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ventaSchema, anulacionSchema } from "@/lib/schemas";
import { errorZod, mensajeAmigable, type ActionResult } from "@/lib/errors";

export type ProductoPOS = {
  id: string;
  codigo_barras: string;
  nombre: string;
  talla: string | null;
  precio: number;
  stock: number;
};

/** Busca un producto por código de barras con su stock en la sucursal (stock en tiempo real). */
export async function buscarProductoPorCodigo(
  sucursalId: string,
  codigo: string
): Promise<ActionResult<ProductoPOS>> {
  const limpio = (codigo ?? "").trim();
  if (!/^[A-Za-z0-9-]{4,32}$/.test(limpio)) {
    return { ok: false, error: "Código de barras no válido." };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("productos")
      .select("id, codigo_barras, nombre, talla, precio, activo, inventario!inner(stock, sucursal_id)")
      .eq("codigo_barras", limpio)
      .eq("inventario.sucursal_id", sucursalId)
      .maybeSingle();

    if (error) return { ok: false, error: mensajeAmigable(error) };
    if (!data || !data.activo) {
      return { ok: false, error: "Producto no encontrado en esta sucursal." };
    }
    // @ts-ignore inventario viene como arreglo por la relación 1:N
    const stock: number = data.inventario?.[0]?.stock ?? 0;
    return {
      ok: true,
      data: {
        id: data.id,
        codigo_barras: data.codigo_barras,
        nombre: data.nombre,
        talla: data.talla,
        precio: Number(data.precio),
        stock,
      },
    };
  } catch (e) {
    return { ok: false, error: mensajeAmigable(e) };
  }
}

/** Registra una venta de forma atómica mediante la función RPC (FOR UPDATE). */
export async function registrarVenta(input: unknown): Promise<ActionResult<{ ventaId: string }>> {
  const parsed = ventaSchema.safeParse(input);
  if (!parsed.success) return errorZod(parsed.error);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("registrar_venta", {
      p_sucursal: parsed.data.sucursal_id,
      p_metodo: parsed.data.metodo_pago,
      p_items: parsed.data.items,
    });
    if (error) return { ok: false, error: mensajeAmigable(error) };

    revalidatePath("/ventas");
    revalidatePath("/inventario");
    revalidatePath("/dashboard");
    return { ok: true, data: { ventaId: data as string }, message: "Venta registrada correctamente" };
  } catch (e) {
    return { ok: false, error: mensajeAmigable(e) };
  }
}

export async function anularVenta(input: unknown): Promise<ActionResult> {
  const parsed = anulacionSchema.safeParse(input);
  if (!parsed.success) return errorZod(parsed.error);

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("anular_venta", {
      p_venta: parsed.data.venta_id,
      p_motivo: parsed.data.motivo,
    });
    if (error) return { ok: false, error: mensajeAmigable(error) };

    revalidatePath("/ventas");
    revalidatePath("/inventario");
    revalidatePath("/dashboard");
    return { ok: true, message: "Venta anulada y stock devuelto al inventario" };
  } catch (e) {
    return { ok: false, error: mensajeAmigable(e) };
  }
}