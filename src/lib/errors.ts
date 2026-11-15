import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

const CODIGOS_NEGOCIO = [
  "STOCK_INSUFICIENTE",
  "VALIDACION",
  "PERMISO_DENEGADO",
  "PRODUCTO_NO_DISPONIBLE",
  "NO_ENCONTRADO",
  "VENTA_YA_ANULADA",
];

type PgError = { code?: string; message?: string; details?: string } | null | undefined;

/**
 * Traduce cualquier error (de Postgres, de red o desconocido) a un mensaje
 * amigable. Los errores técnicos se registran en el servidor y nunca se
 * muestran al usuario.
 */
export function mensajeAmigable(err: PgError | unknown): string {
  const e = (err ?? {}) as NonNullable<PgError>;
  const msg = e.message ?? (err instanceof Error ? err.message : "");

  // Errores de negocio lanzados por las funciones PL/pgSQL: "CODIGO: mensaje"
  const m = msg.match(/^([A-Z_]+):\s*(.+)$/s);
  if (m && CODIGOS_NEGOCIO.includes(m[1])) return m[2];

  switch (e.code) {
    case "23505":
      return "Ya existe un registro con esos datos (por ejemplo, un código de barras repetido).";
    case "23514":
      return "Algún valor no cumple las reglas del sistema (precios y cantidades deben ser positivos).";
    case "23503":
      return "El registro está relacionado con otros datos y no se puede completar la operación.";
    case "23502":
      return "Faltan campos obligatorios.";
    case "42501":
      return "No tienes permiso para realizar esta acción.";
    case "40001":
    case "40P01":
      return "Otro usuario modificó los mismos datos al mismo tiempo. Intenta de nuevo.";
    case "PGRST301":
      return "Tu sesión expiró. Inicia sesión nuevamente.";
  }

  console.error("[error técnico]", err); // solo en logs del servidor
  return "Ocurrió un problema inesperado. Intenta nuevamente; si persiste, avisa al administrador.";
}

export function errorZod(e: ZodError): { ok: false; error: string; fieldErrors: Record<string, string[] | undefined> } {
  const flat = e.flatten();
  const primero = e.issues[0]?.message ?? "Datos no válidos";
  return { ok: false, error: primero, fieldErrors: flat.fieldErrors };
}
