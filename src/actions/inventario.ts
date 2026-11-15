"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ajusteSchema, productoSchema, transferenciaSchema } from "@/lib/schemas";
import { errorZod, mensajeAmigable, type ActionResult } from "@/lib/errors";

export async function crearProducto(input: unknown): Promise<ActionResult> {
  const parsed = productoSchema.safeParse(input);
  if (!parsed.success) return errorZod(parsed.error);

  try {
    const supabase = createClient();
    const { error } = await supabase.from("productos").insert({
      ...parsed.data,
      talla: parsed.data.talla || null,
    });
    if (error) return { ok: false, error: mensajeAmigable(error) };
    revalidatePath("/productos");
    return { ok: true, message: "Producto creado" };
  } catch (e) {
    return { ok: false, error: mensajeAmigable(e) };
  }
}

export async function actualizarPrecio(productoId: string, precio: unknown): Promise<ActionResult> {
  const parsed = productoSchema.shape.precio.safeParse(precio);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    const supabase = createClient();
    const { error, data } = await supabase
      .from("productos")
      .update({ precio: parsed.data })
      .eq("id", productoId)
      .select("id");
    if (error) return { ok: false, error: mensajeAmigable(error) };
    if (!data?.length) return { ok: false, error: "No tienes permiso para modificar este producto." };
    revalidatePath("/productos");
    return { ok: true, message: "Precio actualizado" };
  } catch (e) {
    return { ok: false, error: mensajeAmigable(e) };
  }
}

export async function ajustarStock(input: unknown): Promise<ActionResult> {
  const parsed = ajusteSchema.safeParse(input);
  if (!parsed.success) return errorZod(parsed.error);

  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("ajustar_stock", {
      p_sucursal: parsed.data.sucursal_id,
      p_producto: parsed.data.producto_id,
      p_delta: parsed.data.delta,
      p_motivo: parsed.data.motivo,
    });
    if (error) return { ok: false, error: mensajeAmigable(error) };
    revalidatePath("/inventario");
    return { ok: true, message: "Inventario actualizado" };
  } catch (e) {
    return { ok: false, error: mensajeAmigable(e) };
  }
}

export async function transferirStock(input: unknown): Promise<ActionResult> {
  const parsed = transferenciaSchema.safeParse(input);
  if (!parsed.success) return errorZod(parsed.error);

  try {
    const supabase = createClient();
    const { error } = await supabase.rpc("transferir_stock", {
      p_origen: parsed.data.origen,
      p_destino: parsed.data.destino,
      p_producto: parsed.data.producto_id,
      p_cantidad: parsed.data.cantidad,
    });
    if (error) return { ok: false, error: mensajeAmigable(error) };
    revalidatePath("/inventario");
    return { ok: true, message: "Transferencia realizada" };
  } catch (e) {
    return { ok: false, error: mensajeAmigable(e) };
  }
}
