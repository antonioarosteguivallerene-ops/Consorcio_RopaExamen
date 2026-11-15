import { z } from "zod";

const texto = (campo: string, min = 2, max = 120) =>
  z
    .string({ required_error: `${campo} es obligatorio` })
    .trim()
    .min(min, `${campo} es obligatorio (mínimo ${min} caracteres)`)
    .max(max, `${campo} no puede superar ${max} caracteres`);

export const loginSchema = z.object({
  email: z.string().trim().min(1, "El correo es obligatorio").email("Correo no válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const productoSchema = z.object({
  codigo_barras: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{4,32}$/, "Código de barras: 4 a 32 caracteres (letras, números o guion)"),
  nombre: texto("El nombre"),
  categoria: texto("La categoría"),
  talla: z.string().trim().max(10, "Talla demasiado larga").optional().or(z.literal("")),
  precio: z.coerce
    .number({ invalid_type_error: "El precio debe ser un número" })
    .positive("El precio debe ser mayor que cero")
    .max(99999, "El precio es demasiado alto")
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Máximo 2 decimales"),
});
export type ProductoInput = z.infer<typeof productoSchema>;

export const metodoPagoSchema = z.enum(["efectivo", "tarjeta", "transferencia"], {
  errorMap: () => ({ message: "Selecciona un método de pago válido" }),
});

export const ventaSchema = z.object({
  sucursal_id: z.string().uuid("Sucursal no válida"),
  metodo_pago: metodoPagoSchema,
  items: z
    .array(
      z.object({
        producto_id: z.string().uuid("Producto no válido"),
        cantidad: z.number().int("La cantidad debe ser un entero").positive("La cantidad debe ser mayor que cero").max(999),
      })
    )
    .min(1, "Agrega al menos un producto a la venta")
    .max(100, "Demasiados artículos en una sola venta"),
});
export type VentaInput = z.infer<typeof ventaSchema>;

export const ajusteSchema = z.object({
  sucursal_id: z.string().uuid("Sucursal no válida"),
  producto_id: z.string().uuid("Selecciona un producto"),
  delta: z.coerce
    .number({ invalid_type_error: "Ingresa un número" })
    .int("Debe ser un número entero")
    .refine((n) => n !== 0, "El ajuste no puede ser cero")
    .refine((n) => Math.abs(n) <= 9999, "Ajuste demasiado grande"),
  motivo: texto("El motivo", 3, 200),
});
export type AjusteInput = z.infer<typeof ajusteSchema>;

export const transferenciaSchema = z
  .object({
    origen: z.string().uuid("Selecciona la sucursal de origen"),
    destino: z.string().uuid("Selecciona la sucursal de destino"),
    producto_id: z.string().uuid("Selecciona un producto"),
    cantidad: z.coerce
      .number({ invalid_type_error: "Ingresa un número" })
      .int("Debe ser un número entero")
      .positive("La cantidad debe ser mayor que cero")
      .max(9999),
  })
  .refine((d) => d.origen !== d.destino, { path: ["destino"], message: "El destino debe ser distinto al origen" });
export type TransferenciaInput = z.infer<typeof transferenciaSchema>;

export const anulacionSchema = z.object({
  venta_id: z.string().uuid(),
  motivo: texto("El motivo", 3, 200),
});
