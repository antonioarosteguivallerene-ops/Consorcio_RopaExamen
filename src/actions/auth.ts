"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/schemas";
import { errorZod, type ActionResult } from "@/lib/errors";

export async function iniciarSesion(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return errorZod(parsed.error);

  try {
    // Se añade await porque createClient() ahora es asíncrono
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      // Mensaje genérico: no revelamos si el correo existe
      return { ok: false, error: "Correo o contraseña incorrectos." };
    }
  } catch (e) {
    console.error("[login]", e);
    return { ok: false, error: "No se pudo conectar con el servidor. Revisa tu conexión." };
  }
  redirect("/dashboard");
}

export async function cerrarSesion() {
  // Se añade await porque createClient() ahora es asíncrono
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}